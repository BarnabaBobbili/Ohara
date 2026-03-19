import express from 'express';
import {
    getBookAuditHistory,
    getAllAuditLogs,
    getAuditLogsByAction,
} from '../db/auditLogger.js';
import { parseOffsetLimitPagination } from '../utils/pagination.js';

const router = express.Router();

router.get('/books/:id', async (req, res) => {
    try {
        const bookId = Number.parseInt(req.params.id, 10);
        const { limit } = parseOffsetLimitPagination(
            { limit: req.query.limit, offset: 0 },
            { defaultLimit: 100, maxLimit: 200, maxOffset: 0 }
        );

        const auditLogs = await getBookAuditHistory(bookId, limit);
        res.json({
            book_id: bookId,
            total_logs: auditLogs.length,
            logs: auditLogs,
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/all', async (req, res) => {
    try {
        const { limit, offset } = parseOffsetLimitPagination(req.query, {
            defaultLimit: 100,
            maxLimit: 200,
            maxOffset: 5000,
        });

        const auditLogs = await getAllAuditLogs(limit, offset);
        res.json({
            total_logs: auditLogs.length,
            limit,
            offset,
            logs: auditLogs,
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/action/:action', async (req, res) => {
    try {
        const action = req.params.action.toUpperCase();
        const { limit } = parseOffsetLimitPagination(
            { limit: req.query.limit, offset: 0 },
            { defaultLimit: 100, maxLimit: 200, maxOffset: 0 }
        );

        if (!['UPDATE', 'DELETE'].includes(action)) {
            return res.status(400).json({
                detail: 'Invalid action. Must be UPDATE or DELETE',
            });
        }

        const auditLogs = await getAuditLogsByAction(action, limit);
        res.json({
            action,
            total_logs: auditLogs.length,
            logs: auditLogs,
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
