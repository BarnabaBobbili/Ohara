import express from 'express';
import prisma from '../db/prisma.js';
import { getMySQLPool } from '../db/mysql.js';
import { authenticateToken, requireStaff, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ─── Helper: Log to MySQL financial_records ───────────────────
const logFinancialRecord = async (pool, { member_id, type, amount, description, pg_transaction_id, processed_by }) => {
    await pool.execute(
        `INSERT INTO financial_records
         (member_id, transaction_type, amount, description, pg_transaction_id, processed_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [member_id, type, amount, description || null, pg_transaction_id || null, processed_by || 'system']
    );
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

        // Log to MySQL
        const pool = getMySQLPool();
        if (pool) {
            await logFinancialRecord(pool, {
                member_id,
                type: 'payment',
                amount: numAmount,
                description: `Fine payment processed by ${req.actor.email}`,
                processed_by: req.actor.email,
            });
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

export { logFinancialRecord };
export default router;
