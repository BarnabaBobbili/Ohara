import express from 'express';
import prisma from '../db/prisma.js';
import { logActivity } from '../db/activityLogger.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';
import { invalidateCacheByPrefix } from '../utils/cache.js';

const router = express.Router();

const invalidateAnalyticsCache = () => {
    invalidateCacheByPrefix('dashboard:', 'reports:', 'activity:');
};

router.post('/checkout', async (req, res) => {
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
                    due_date: new Date(due_date),
                    status: 'checked_out',
                },
            });

            await tx.books.update({
                where: { id: book_id },
                data: { available_copies: { decrement: 1 } },
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

        invalidateAnalyticsCache();
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

const processCheckin = async (transactionId, returnCondition, res) => {
    if (!Number.isInteger(transactionId)) {
        return res.status(400).json({ detail: 'Valid transaction_id is required' });
    }

    const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
        include: { book: true, member: true },
    });

    if (!transaction) {
        return res.status(404).json({ detail: 'Transaction not found' });
    }
    if (transaction.status === 'returned') {
        return res.status(400).json({ detail: 'Book already returned' });
    }

    const now = new Date();
    let fine_amount = 0;
    if (now > new Date(transaction.due_date)) {
        const daysOverdue = Math.ceil(
            (now - new Date(transaction.due_date)) / (1000 * 60 * 60 * 24)
        );
        fine_amount = daysOverdue * 1.0;
    }

    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.transactions.update({
            where: { id: transactionId },
            data: {
                return_date: now,
                status: 'returned',
                return_condition: returnCondition || 'good',
                fine_amount,
            },
        });

        await tx.books.update({
            where: { id: transaction.book_id },
            data: { available_copies: { increment: 1 } },
        });

        if (fine_amount > 0) {
            await tx.members.update({
                where: { id: transaction.member_id },
                data: { fines: { increment: fine_amount } },
            });
        }

        return updated;
    });

    logActivity({
        action: 'checkin',
        book_id: transaction.book_id,
        book_title: transaction.book.title,
        member_id: transaction.member_id,
        member_name: transaction.member.name,
        transaction_id: result.id,
        fine_amount,
    });

    invalidateAnalyticsCache();
    return res.json({ ...result, fine_amount });
};

router.post('/checkin', async (req, res) => {
    try {
        const { transaction_id, return_condition } = req.body;
        return await processCheckin(Number.parseInt(transaction_id, 10), return_condition, res);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// Backward-compatible route used by existing frontend service.
router.post('/checkin/:transactionId', async (req, res) => {
    try {
        const transactionId = Number.parseInt(req.params.transactionId, 10);
        const returnCondition = req.body?.return_condition;
        return await processCheckin(transactionId, returnCondition, res);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

router.get('/active', async (req, res) => {
    try {
        const { skip, limit } = parseSkipLimitPagination(req.query, {
            defaultLimit: 50,
            maxLimit: 200,
            maxSkip: 5000,
        });

        const transactions = await prisma.transactions.findMany({
            where: { status: { in: ['checked_out', 'overdue'] } },
            include: {
                book: { select: { title: true, isbn: true, author: true } },
                member: { select: { name: true, card_id: true, email: true } },
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

router.get('/overdue', async (req, res) => {
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
                book: { select: { title: true, isbn: true, author: true } },
                member: { select: { name: true, card_id: true, email: true } },
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
            book: { select: { title: true, isbn: true, author: true } },
        },
        orderBy: { checkout_date: 'desc' },
        skip,
        take: limit,
    });
};

router.get('/history/:member_id', async (req, res) => {
    try {
        const memberId = Number.parseInt(req.params.member_id, 10);
        const transactions = await fetchMemberHistory(memberId, req.query);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Backward-compatible route used by existing frontend service.
router.get('/member/:memberId', async (req, res) => {
    try {
        const memberId = Number.parseInt(req.params.memberId, 10);
        const transactions = await fetchMemberHistory(memberId, req.query);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
