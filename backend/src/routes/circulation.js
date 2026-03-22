import express from 'express';
import prisma from '../db/prisma.js';
import { logActivity } from '../db/activityLogger.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';
import { invalidateCacheByPrefix } from '../utils/cache.js';
import { syncCheckoutToNeo4j, syncReturnToNeo4j } from '../db/neo4j.js';
import { getMySQLPool } from '../db/mysql.js';
import { authenticateToken, requireStaff } from '../middleware/auth.js';

const router = express.Router();

const invalidateAnalyticsCache = () => {
    invalidateCacheByPrefix('dashboard:', 'reports:', 'activity:');
};

router.post('/checkout', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { book_id, member_id, due_date } = req.body;

        const book = await prisma.books.findUnique({ where: { id: book_id } });
        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }
        if (book.available_copies <= 0) {
            return res.status(400).json({ detail: 'No copies available' });
        }

        const member = await prisma.members.findUnique({ where: { id: member_id } });
        if (!member) {
            return res.status(404).json({ detail: 'Member not found' });
        }
        if (member.status !== 'active') {
            return res.status(400).json({ detail: 'Member account is not active' });
        }

        const overdueBooks = await prisma.transactions.findFirst({
            where: { member_id, status: 'overdue' },
            select: { id: true },
        });
        if (overdueBooks) {
            return res.status(400).json({ detail: 'Member has overdue books' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const transaction = await tx.transactions.create({
                data: {
                    book_id,
                    member_id,
                    issued_by_member: req.actor?.id || null, // admin/staff member who issued
                    due_date: new Date(due_date),
                    status: 'checked_out',
                },
            });

            await tx.members.update({
                where: { id: member_id },
                data: { last_visit: new Date() },
            });

            return transaction;
        });

        logActivity({
            action: 'checkout',
            book_id,
            book_title: book.title,
            member_id,
            member_name: member.name,
            transaction_id: result.id,
        });

        // Sync to Neo4j (non-blocking — recommendations only)
        syncCheckoutToNeo4j({ id: result.id, book_id, member_id, checkout_date: result.checkout_date }).catch(() => {});

        // Log to MySQL financial audit
        try {
            const pool = getMySQLPool();
            if (pool) {
                await pool.execute(
                    `INSERT INTO audit_trail (book_id, action, changed_by, metadata)
                     VALUES (?, 'CHECKOUT', ?, ?)`,
                    [book_id, req.actor?.email || member?.name || 'unknown',
                     JSON.stringify({ transaction_id: result.id, member_id, due_date })]
                );
            }
        } catch { /* MySQL audit is non-critical */ }

        invalidateAnalyticsCache();
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

const processCheckin = async (transactionId, returnCondition, req, res) => {
    if (!Number.isInteger(transactionId)) {
        return res.status(400).json({ detail: 'Valid transaction_id is required' });
    }

    const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
        include: { books: true, members: true },
    });

    if (!transaction) {
        return res.status(404).json({ detail: 'Transaction not found' });
    }
    if (transaction.status === 'returned') {
        return res.status(400).json({ detail: 'Book already returned' });
    }

    const now = new Date();
    const result = await prisma.transactions.update({
        where: { id: transactionId },
        data: {
            return_date: now,
            status: 'returned',
            return_condition: returnCondition || 'good',
        },
    });

    logActivity({
        action: 'checkin',
        book_id: transaction.book_id,
        book_title: transaction.books.title,
        member_id: transaction.member_id,
        member_name: transaction.members.name,
        transaction_id: result.id,
        fine_amount: result.fine_amount,
    });

    // Sync return to Neo4j (non-blocking)
    syncReturnToNeo4j({ id: transactionId, book_id: transaction.book_id, member_id: transaction.member_id, return_date: now }).catch(() => {});

    // Log to MySQL financial records if fine was charged
    try {
        const pool = getMySQLPool();
        if (pool) {
            await pool.execute(
                `INSERT INTO audit_trail (book_id, action, changed_by, metadata)
                 VALUES (?, 'RETURN', ?, ?)`,
                [transaction.book_id, req.actor?.email || transaction.members?.name || 'unknown',
                 JSON.stringify({ transaction_id: transactionId, fine_amount: result.fine_amount })]
            );
            if (result.fine_amount > 0) {
                await pool.execute(
                    `INSERT INTO financial_records (member_id, transaction_type, amount, description, pg_transaction_id)
                     VALUES (?, 'fine', ?, ?, ?)`,
                    [transaction.member_id, result.fine_amount,
                     `Overdue fine for book #${transaction.book_id}`, transactionId]
                );
            }
        }
    } catch { /* MySQL audit is non-critical */ }

    invalidateAnalyticsCache();
    return res.json(result);
};

router.post('/checkin', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { transaction_id, return_condition } = req.body;
        return await processCheckin(Number.parseInt(transaction_id, 10), return_condition, req, res);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// Backward-compatible route used by existing frontend service.
router.post('/checkin/:transactionId', authenticateToken, requireStaff, async (req, res) => {
    try {
        const transactionId = Number.parseInt(req.params.transactionId, 10);
        const returnCondition = req.body?.return_condition;
        return await processCheckin(transactionId, returnCondition, req, res);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

router.get('/active', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 50,
            maxLimit: 200,
            maxSkip: 5000,
        });

        // Optional: filter by ISBN so return desk can find active checkout by book scan
        const where = { status: { in: ['checked_out', 'overdue'] } };
        if (req.query.isbn) {
            where.books = { isbn: req.query.isbn };
        }
        if (req.query.member_id) {
            where.member_id = Number.parseInt(req.query.member_id, 10);
        }

        const transactions = await prisma.transactions.findMany({
            where,
            include: {
                books: { select: { title: true, isbn: true, author: true, cover_image_url: true } },
                members: { select: { name: true, card_id: true, email: true } },
            },
            orderBy: { checkout_date: 'desc' },
            skip,
            take: limit,
        });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Helper: resolve the logged-in member from the request (3 fallbacks)
const resolveMemberFromReq = async (req) => {
    if (req.supabase_uid) {
        const m = await prisma.members.findFirst({ where: { supabase_uid: req.supabase_uid }, select: { id: true } });
        if (m) return m;
    }
    if (req.user_email) {
        const m = await prisma.members.findFirst({ where: { email: req.user_email }, select: { id: true } });
        if (m) return m;
    }
    if (req.user?.user_id) {
        return prisma.members.findUnique({ where: { id: req.user.user_id }, select: { id: true } });
    }
    return null;
};

// GET /circulation/my — logged-in member's own active loans (no staff required)
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) return res.status(404).json({ detail: 'Member account not found. Please link your account.' });

        const transactions = await prisma.transactions.findMany({
            where: { member_id: member.id, status: { in: ['checked_out', 'overdue'] } },
            include: {
                books: { select: { id: true, title: true, author: true, isbn: true, cover_image_url: true, category: true } },
            },
            orderBy: { due_date: 'asc' },
            take: 20,
        });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /circulation/my-history — logged-in member's full loan history
router.get('/my-history', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) return res.status(404).json({ detail: 'Member account not found. Please link your account.' });

        const { skip, limit } = parseSkipLimitPagination(req.query, { defaultLimit: 20, maxLimit: 100 });

        const transactions = await prisma.transactions.findMany({
            where: { member_id: member.id },
            include: {
                books: { select: { id: true, title: true, author: true, isbn: true, cover_image_url: true, category: true } },
            },
            orderBy: { checkout_date: 'desc' },
            skip,
            take: limit,
        });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});


router.get('/overdue', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 50,
            maxLimit: 200,
            maxSkip: 5000,
        });

        const transactions = await prisma.transactions.findMany({
            where: {
                status: 'checked_out',
                due_date: { lt: new Date() },
            },
            include: {
                books: { select: { title: true, isbn: true, author: true } },
                members: { select: { name: true, card_id: true, email: true } },
            },
            orderBy: { due_date: 'asc' },
            skip,
            take: limit,
        });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

const fetchMemberHistory = async (memberId, query) => {
    const { skip, limit } = parseSkipLimitPagination(query, {
        defaultLimit: 50,
        maxLimit: 200,
        maxSkip: 5000,
    });

    return prisma.transactions.findMany({
        where: { member_id: memberId },
        include: {
            books: { select: { title: true, isbn: true, author: true } },
        },
        orderBy: { checkout_date: 'desc' },
        skip,
        take: limit,
    });
};

router.get('/history/:member_id', authenticateToken, requireStaff, async (req, res) => {
    try {
        const memberId = Number.parseInt(req.params.member_id, 10);
        const transactions = await fetchMemberHistory(memberId, req.query);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Backward-compatible route used by existing frontend service.
router.get('/member/:memberId', authenticateToken, requireStaff, async (req, res) => {
    try {
        const memberId = Number.parseInt(req.params.memberId, 10);
        const transactions = await fetchMemberHistory(memberId, req.query);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
