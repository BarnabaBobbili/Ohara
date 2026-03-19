import express from 'express';
import prisma from '../db/prisma.js';
import { withCache } from '../utils/cache.js';

const router = express.Router();
const DASHBOARD_CACHE_MS = Number.parseInt(process.env.DASHBOARD_CACHE_MS || '15000', 10);

router.get('/stats', async (req, res) => {
    try {
        const stats = await withCache('dashboard:stats', DASHBOARD_CACHE_MS, async () => {
            const now = new Date();
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

            const [
                total_books,
                availableResult,
                books_checked_out,
                books_overdue,
                total_members,
                active_reservations,
                finesResult,
                new_members_this_month,
            ] = await Promise.all([
                prisma.books.count(),
                prisma.books.aggregate({ _sum: { available_copies: true } }),
                prisma.transactions.count({ where: { status: { in: ['checked_out', 'overdue'] } } }),
                prisma.transactions.count({ where: { status: 'overdue' } }),
                prisma.members.count(),
                prisma.reservations.count({ where: { status: 'pending' } }),
                prisma.members.aggregate({ _sum: { fines: true } }),
                prisma.members.count({ where: { joined_date: { gte: monthAgo } } }),
            ]);

            return {
                total_books,
                books_available: availableResult._sum.available_copies || 0,
                books_checked_out,
                books_overdue,
                total_members,
                active_reservations,
                total_fines: finesResult._sum.fines || 0,
                new_members_this_month,
            };
        });

        res.json(stats);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
