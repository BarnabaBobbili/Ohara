import express from 'express';
import prisma from '../db/prisma.js';
import { getMySQLPool } from '../db/mysql.js';
import { insertFinancialRecord } from '../db/financialRecords.js';
import { authenticateToken, requireStaff, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const resolveMemberFromReq = async (req) => {
    const select = { id: true, email: true, name: true, role: true, status: true };

    if (req.supabase_uid) {
        const member = await prisma.members.findFirst({
            where: { supabase_uid: req.supabase_uid },
            select,
        });
        if (member) return member;
    }

    if (req.user_email) {
        const member = await prisma.members.findUnique({
            where: { email: req.user_email },
            select,
        });
        if (member) return member;
    }

    if (req.user?.user_id) {
        const member = await prisma.members.findUnique({
            where: { id: req.user.user_id },
            select,
        });
        if (member) return member;
    }

    return null;
};

// ─── POST /api/financial/process-payment — Staff only ────────
// Calls PostgreSQL fn_process_payment() and logs to MySQL
router.post('/process-payment', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { member_id, amount } = req.body;
        if (!member_id || !amount) {
            return res.status(400).json({ detail: 'member_id and amount are required' });
        }

        const numAmount = parseFloat(amount);
        if (numAmount <= 0) {
            return res.status(400).json({ detail: 'Amount must be positive' });
        }

        // Call PL/pgSQL fn_process_payment
        const result = await prisma.$queryRaw`
            SELECT * FROM public.fn_process_payment(${member_id}::int, ${numAmount}::numeric, ${req.actor.email}::text)
        `;

        // Log to MySQL (non-blocking for user flow)
        try {
            const pool = getMySQLPool();
            if (pool) {
                await insertFinancialRecord(pool, {
                    member_id,
                    type: 'payment',
                    amount: numAmount,
                    description: `Fine payment processed by ${req.actor.email}`,
                    processed_by: req.actor.email,
                    processed_by_id: req.actor.id,
                });
            }
        } catch (mysqlError) {
            console.warn('MySQL financial_records logging failed for payment:', mysqlError.message);
        }

        res.json({
            success: true,
            remaining_balance: result[0]?.remaining_balance ?? 0,
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/financial/dashboard-stats — Staff only ─────────
// Calls PostgreSQL fn_dashboard_stats()
router.get('/dashboard-stats', authenticateToken, requireStaff, async (req, res) => {
    try {
        const result = await prisma.$queryRaw`SELECT public.fn_dashboard_stats() AS stats`;
        res.json(result[0]?.stats ?? {});
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/financial/overdue-summary — Staff only ─────────
// From MySQL financial ledger
router.get('/overdue-summary', authenticateToken, requireStaff, async (req, res) => {
    try {
        const pool = getMySQLPool();
        if (!pool) return res.status(503).json({ detail: 'MySQL unavailable' });

        const [rows] = await pool.execute(
            `SELECT
               member_id,
               SUM(CASE WHEN transaction_type = 'fine'    THEN amount ELSE 0 END) AS total_fined,
               SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) AS total_paid,
               SUM(CASE WHEN transaction_type = 'fine'    THEN amount ELSE 0 END)
               - SUM(CASE WHEN transaction_type IN ('payment','waiver') THEN amount ELSE 0 END) AS outstanding
             FROM financial_records
             GROUP BY member_id
             HAVING outstanding > 0
             ORDER BY outstanding DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/financial/recent-transactions — Staff only ─────────
router.get('/recent-transactions', authenticateToken, requireStaff, async (req, res) => {
    try {
        const requestedLimit = Number.parseInt(req.query?.limit, 10);
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 15;

        let pool;
        try {
            pool = getMySQLPool();
        } catch {
            return res.json([]);
        }
        if (!pool) return res.json([]);

        const [rows] = await pool.execute(
            `SELECT id, member_id, transaction_type, amount, description, processed_by, created_at
             FROM financial_records
             ORDER BY created_at DESC
             LIMIT ?`,
            [limit]
        );

        const records = Array.isArray(rows) ? rows : [];
        const memberIds = [...new Set(records.map((record) => Number(record.member_id)).filter(Number.isFinite))];
        const members = memberIds.length > 0
            ? await prisma.members.findMany({
                where: { id: { in: memberIds } },
                select: { id: true, name: true, email: true, card_id: true },
            })
            : [];
        const membersById = new Map(members.map((member) => [member.id, member]));

        const enriched = records.map((record) => {
            const member = membersById.get(Number(record.member_id));
            return {
                ...record,
                member_name: member?.name || null,
                member_email: member?.email || null,
                member_card_id: member?.card_id || null,
            };
        });

        return res.json(enriched);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/financial/monthly-summary — Admin only ─────────
router.get('/monthly-summary', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pool = getMySQLPool();
        if (!pool) return res.status(503).json({ detail: 'MySQL unavailable' });

        const year  = req.query.year  || new Date().getFullYear();
        const month = req.query.month || new Date().getMonth() + 1;

        const [rows] = await pool.execute(
            `SELECT transaction_type, COUNT(*) AS count, SUM(amount) AS total, AVG(amount) AS avg_amount
             FROM financial_records
             WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
             GROUP BY transaction_type`,
            [parseInt(year), parseInt(month)]
        );
        res.json({ year, month, summary: rows });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// ─── GET /api/financial/my-transactions — Member self ledger ─────────
router.get('/my-transactions', authenticateToken, async (req, res) => {
    try {
        const member = await resolveMemberFromReq(req);
        if (!member) {
            return res.status(404).json({ detail: 'Member account not found' });
        }

        const requestedLimit = Number.parseInt(req.query?.limit, 10);
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;

        let pool;
        try {
            pool = getMySQLPool();
        } catch {
            return res.json([]);
        }
        if (!pool) return res.json([]);

        const [rows] = await pool.execute(
            `SELECT id, member_id, transaction_type, amount, description, processed_by, created_at
             FROM financial_records
             WHERE member_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [member.id, limit]
        );

        return res.json(Array.isArray(rows) ? rows : []);
    } catch (error) {
        return res.status(500).json({ detail: error.message });
    }
});

export default router;
