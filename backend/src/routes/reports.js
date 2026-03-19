import express from 'express';
import prisma from '../db/prisma.js';
import { getActivityLogsWithTotal } from '../db/activityLogger.js';
import { withCache } from '../utils/cache.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';

const router = express.Router();
const REPORTS_CACHE_MS = Number.parseInt(process.env.REPORTS_CACHE_MS || '30000', 10);

router.get('/activity-logs', async (req, res) => {
    try {
        const { limit, skip } = parseSkipLimitPagination(req.query, {
            defaultLimit: 50,
            maxLimit: 200,
            maxSkip: 5000,
        });

        const { logs, total } = await getActivityLogsWithTotal(limit, skip);
        const serializedLogs = logs.map((log) => ({
            ...log,
            timestamp: log.timestamp instanceof Date
                ? log.timestamp.toISOString()
                : log.timestamp,
        }));

        res.json({
            logs: serializedLogs,
            total,
            limit,
            skip,
        });
    } catch (error) {
        res.status(500).json({ error: error.message, logs: [] });
    }
});

router.get('/circulation-stats', async (req, res) => {
    try {
        const payload = await withCache('reports:circulation-stats', REPORTS_CACHE_MS, async () => {
            const [totalCheckouts, totalReturns, avgDuration] = await Promise.all([
                prisma.transactions.count(),
                prisma.transactions.count({ where: { status: 'returned' } }),
                prisma.$queryRaw`
                    SELECT AVG(EXTRACT(EPOCH FROM (return_date - checkout_date)) / 86400) as avg_days
                    FROM transactions WHERE return_date IS NOT NULL
                `,
            ]);

            return {
                total_checkouts: totalCheckouts,
                total_returns: totalReturns,
                average_checkout_duration_days: avgDuration[0]?.avg_days
                    ? parseFloat(avgDuration[0].avg_days).toFixed(1)
                    : 0,
            };
        });

        res.json(payload);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/popular-books', async (req, res) => {
    try {
        const { limit } = parseSkipLimitPagination(
            { limit: req.query.limit, skip: 0 },
            { defaultLimit: 10, maxLimit: 50, maxSkip: 0 }
        );

        const payload = await withCache(`reports:popular-books:${limit}`, REPORTS_CACHE_MS, async () => (
            prisma.$queryRaw`
                SELECT b.id, b.title, b.author, b.isbn, COUNT(t.id)::int as checkout_count
                FROM books b
                JOIN transactions t ON b.id = t.book_id
                GROUP BY b.id, b.title, b.author, b.isbn
                ORDER BY checkout_count DESC
                LIMIT ${limit}
            `
        ));

        res.json(payload);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/category-distribution', async (req, res) => {
    try {
        const payload = await withCache('reports:category-distribution', REPORTS_CACHE_MS, async () => {
            const categories = await prisma.books.groupBy({
                by: ['category'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
            });

            return categories.map((category) => ({
                category: category.category || 'Uncategorized',
                count: category._count.id.toString(),
            }));
        });

        res.json(payload);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/member-stats', async (req, res) => {
    try {
        const payload = await withCache('reports:member-stats', REPORTS_CACHE_MS, async () => {
            const stats = await prisma.members.groupBy({
                by: ['member_type'],
                _count: { id: true },
            });

            const statusStats = await prisma.members.groupBy({
                by: ['status'],
                _count: { id: true },
            });

            return {
                by_type: stats.map((entry) => ({
                    member_type: entry.member_type,
                    count: entry._count.id.toString(),
                })),
                by_status: statusStats.map((entry) => ({
                    status: entry.status,
                    count: entry._count.id.toString(),
                })),
            };
        });

        res.json(payload);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

const getFineReportPayload = async () => withCache('reports:fines', REPORTS_CACHE_MS, async () => {
    const [totalFines, unpaidFines, membersWithFines] = await Promise.all([
        prisma.members.aggregate({ _sum: { fines: true } }),
        prisma.transactions.aggregate({
            _sum: { fine_amount: true },
            where: { fine_paid: false, fine_amount: { gt: 0 } },
        }),
        prisma.members.findMany({
            where: { fines: { gt: 0 } },
            select: { id: true, name: true, email: true, fines: true },
            orderBy: { fines: 'desc' },
            take: 20,
        }),
    ]);

    return {
        total_fines: totalFines._sum.fines || 0,
        unpaid_fines: unpaidFines._sum.fine_amount || 0,
        members_with_fines: membersWithFines,
    };
});

router.get('/fines', async (req, res) => {
    try {
        const payload = await getFineReportPayload();
        res.json(payload);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// Backward-compatible endpoint used by existing frontend service.
router.get('/fine-report', async (req, res) => {
    try {
        const payload = await getFineReportPayload();
        res.json(payload);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/monthly-trend', async (req, res) => {
    try {
        const payload = await withCache('reports:monthly-trend', REPORTS_CACHE_MS, async () => (
            prisma.$queryRaw`
                SELECT
                    EXTRACT(YEAR FROM checkout_date)::int as year,
                    EXTRACT(MONTH FROM checkout_date)::int as month,
                    COUNT(*)::int as checkouts
                FROM transactions
                GROUP BY year, month
                ORDER BY year DESC, month DESC
                LIMIT 12
            `
        ));

        res.json(payload);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
