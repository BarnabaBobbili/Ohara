import express from 'express';
import prisma from '../db/prisma.js';
import { logActivity } from '../db/activityLogger.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';
import { invalidateCacheByPrefix } from '../utils/cache.js';
import { syncCheckoutToNeo4j, syncReturnToNeo4j } from '../db/neo4j.js';
import { getMySQLPool } from '../db/mysql.js';
import { insertFinancialRecord } from '../db/financialRecords.js';
import { authenticateToken, requireStaff } from '../middleware/auth.js';

const router = express.Router();

const invalidateAnalyticsCache = () => {
    invalidateCacheByPrefix('dashboard:', 'reports:', 'activity:');
};

router.post('/checkout', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { book_id, member_id, due_date, checkout_condition, notes } = req.body;

        const book = await prisma.books.findUnique({ where: { id: book_id } });
        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }
        if (book.is_reference_only) {
            return res.status(400).json({ detail: 'Reference-only books cannot be checked out' });
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

        const outstandingDues = Number(member.fines || 0);
        if (outstandingDues > 0) {
            return res.status(400).json({
                detail: `Member has outstanding dues ($${outstandingDues.toFixed(2)}). Clear dues before checkout.`,
            });
        }

        const overdueBooks = await prisma.transactions.findFirst({
            where: { member_id, status: 'overdue' },
            select: { id: true },
        });
        if (overdueBooks) {
            return res.status(400).json({ detail: 'Member has overdue books' });
        }

        const existingActiveLoanForSameBook = await prisma.transactions.findFirst({
            where: {
                member_id,
                book_id,
                status: { in: ['checked_out', 'overdue'] },
            },
            select: { id: true, due_date: true, status: true },
        });
        if (existingActiveLoanForSameBook) {
            return res.status(409).json({
                detail: 'Member already has this book checked out',
                transaction_id: existingActiveLoanForSameBook.id,
                due_date: existingActiveLoanForSameBook.due_date,
                status: existingActiveLoanForSameBook.status,
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const transaction = await tx.transactions.create({
                data: {
                    book_id,
                    member_id,
                    due_date: new Date(due_date),
                    status: 'checked_out',
                    checkout_condition: checkout_condition || 'good',
                    notes: notes || null,
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

const processCheckin = async (transactionId, returnCondition, notes, req, res) => {
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
    
    // Calculate expected fine for fallback when DB trigger is missing
    let expectedFine = 0;
    const dueDate = new Date(transaction.due_date);
    if (now > dueDate) {
        // Get fine settings from database
        const dailyRateSetting = await prisma.site_settings.findUnique({ where: { key: 'daily_fine_rate' } });
        const maxCapSetting = await prisma.site_settings.findUnique({ where: { key: 'max_fine_cap' } });
        const dailyRate = dailyRateSetting?.value ? parseFloat(dailyRateSetting.value) : 1.00;
        const maxCap = maxCapSetting?.value ? parseFloat(maxCapSetting.value) : 25.00;
        
        const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
        expectedFine = Math.min(daysOverdue * dailyRate, maxCap);
    }
    
    // Build update data, appending notes if provided
    const existingNotes = transaction.notes || '';
    const returnNoteText = notes ? `\n[Return ${now.toISOString().split('T')[0]}]: ${notes}` : '';
    const updatedNotes = existingNotes + returnNoteText;
    
    let result = await prisma.transactions.update({
        where: { id: transactionId },
        data: {
            return_date: now,
            status: 'returned',
            return_condition: returnCondition || 'good',
            notes: updatedNotes.trim() || null,
        },
    });

    // Fallback: if trigger did not set fine_amount, apply fine in app layer
    if (expectedFine > 0 && Number(result.fine_amount || 0) <= 0) {
        result = await prisma.transactions.update({
            where: { id: transactionId },
            data: { fine_amount: expectedFine },
        });

        await prisma.members.update({
            where: { id: transaction.member_id },
            data: { fines: { increment: expectedFine } },
        });
    }

    logActivity({
        action: 'checkin',
        book_id: transaction.book_id,
        book_title: transaction.books.title,
        member_id: transaction.member_id,
        member_name: transaction.members.name,
        transaction_id: result.id,
        fine_amount: result.fine_amount,
        return_condition: returnCondition,
        checkout_condition: transaction.checkout_condition,
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
                 JSON.stringify({ transaction_id: transactionId, fine_amount: result.fine_amount, return_condition: returnCondition })]
            );
            if (result.fine_amount > 0) {
                await insertFinancialRecord(pool, {
                    member_id: transaction.member_id,
                    type: 'fine',
                    amount: result.fine_amount,
                    description: `Overdue fine for book #${transaction.book_id}`,
                    pg_transaction_id: transactionId,
                    related_book_id: transaction.book_id,
                    related_book_title: transaction.books?.title,
                    member_name: transaction.members?.name,
                    member_card_id: transaction.members?.card_id,
                    processed_by: req.actor?.email || transaction.members?.name || 'system',
                    processed_by_id: req.actor?.id,
                });
            }
        }
    } catch { /* MySQL audit is non-critical */ }

    invalidateAnalyticsCache();
    return res.json(result);
};

router.post('/checkin', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { transaction_id, return_condition, notes } = req.body;
        return await processCheckin(Number.parseInt(transaction_id, 10), return_condition, notes, req, res);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// Backward-compatible route used by existing frontend service.
router.post('/checkin/:transactionId', authenticateToken, requireStaff, async (req, res) => {
    try {
        const transactionId = Number.parseInt(req.params.transactionId, 10);
        const returnCondition = req.body?.return_condition;
        const notes = req.body?.notes;
        return await processCheckin(transactionId, returnCondition, notes, req, res);
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

router.get('/recent-returns', authenticateToken, requireStaff, async (req, res) => {
    try {
        const requestedLimit = Number.parseInt(req.query?.limit, 10);
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 12;

        const transactions = await prisma.transactions.findMany({
            where: {
                status: 'returned',
                return_date: { not: null },
            },
            include: {
                books: { select: { title: true, isbn: true, author: true } },
                members: { select: { name: true, card_id: true, email: true } },
            },
            orderBy: { return_date: 'desc' },
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

// GET /circulation/book/:bookId — full circulation history for a specific book (staff only)
router.get('/book/:bookId', authenticateToken, requireStaff, async (req, res) => {
    try {
        const bookId = Number.parseInt(req.params.bookId, 10);
        if (!Number.isFinite(bookId)) {
            return res.status(400).json({ detail: 'Invalid book ID' });
        }

        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 50,
            maxLimit: 200,
            maxSkip: 5000,
        });

        const [transactions, total] = await Promise.all([
            prisma.transactions.findMany({
                where: { book_id: bookId },
                include: {
                    members: { select: { name: true, card_id: true, email: true } },
                },
                orderBy: { checkout_date: 'desc' },
                skip,
                take: limit,
            }),
            prisma.transactions.count({ where: { book_id: bookId } }),
        ]);

        res.json({ transactions, total });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
