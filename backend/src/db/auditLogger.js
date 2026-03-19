import { getMySQLPool } from './mysql.js';
import { enqueueLogJob } from './logQueue.js';
import { parseOffsetLimitPagination } from '../utils/pagination.js';

const MAX_LIMIT = Number.parseInt(process.env.AUDIT_MAX_LIMIT || '200', 10);

const AUDIT_SELECT_COLUMNS = `
    id,
    book_id,
    action,
    field_name,
    old_value,
    new_value,
    changed_by,
    changed_at
`;

export const logBookUpdate = (bookId, oldData, newData, changedBy = 'system') => {
    enqueueLogJob('mysql:audit:update', async () => {
        const pool = getMySQLPool();
        const auditEntries = [];

        const skipFields = ['updated_at', 'created_at', 'id', 'transactions', 'reservations'];
        for (const field of Object.keys(newData)) {
            if (skipFields.includes(field)) continue;

            const oldVal = oldData[field] instanceof Date
                ? oldData[field].toISOString()
                : String(oldData[field] ?? '');
            const newVal = newData[field] instanceof Date
                ? newData[field].toISOString()
                : String(newData[field] ?? '');

            if (oldVal !== newVal) {
                auditEntries.push([
                    bookId,
                    'UPDATE',
                    field,
                    oldVal,
                    newVal,
                    changedBy,
                    JSON.stringify({ timestamp: new Date() }),
                ]);
            }
        }

        if (auditEntries.length > 0) {
            await pool.query(
                `INSERT INTO audit_trail (book_id, action, field_name, old_value, new_value, changed_by, metadata)
                 VALUES ?`,
                [auditEntries]
            );
        }
    });
};

export const logBookDeletion = (bookId, bookData, deletedBy = 'system') => {
    enqueueLogJob('mysql:audit:delete', async () => {
        const pool = getMySQLPool();
        const metadata = {
            timestamp: new Date(),
            deleted_book_data: {
                title: bookData.title,
                author: bookData.author,
                isbn: bookData.isbn,
            },
        };

        await pool.query(
            `INSERT INTO audit_trail (book_id, action, field_name, old_value, new_value, changed_by, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                bookId,
                'DELETE',
                'complete_record',
                JSON.stringify(bookData),
                null,
                deletedBy,
                JSON.stringify(metadata),
            ]
        );
    });
};

export const getBookAuditHistory = async (bookId, limit = 100) => {
    try {
        const pool = getMySQLPool();
        const { limit: safeLimit } = parseOffsetLimitPagination(
            { limit, offset: 0 },
            { defaultLimit: 100, maxLimit: MAX_LIMIT, maxOffset: 0 }
        );

        const [rows] = await pool.query(
            `SELECT ${AUDIT_SELECT_COLUMNS}
             FROM audit_trail
             WHERE book_id = ?
             ORDER BY changed_at DESC
             LIMIT ?`,
            [bookId, safeLimit]
        );
        return rows;
    } catch (error) {
        console.error('Failed to retrieve audit history from MySQL:', error.message);
        return [];
    }
};

export const getAllAuditLogs = async (limit = 100, offset = 0) => {
    try {
        const pool = getMySQLPool();
        const { limit: safeLimit, offset: safeOffset } = parseOffsetLimitPagination(
            { limit, offset },
            { defaultLimit: 100, maxLimit: MAX_LIMIT, maxOffset: 5000 }
        );

        const [rows] = await pool.query(
            `SELECT ${AUDIT_SELECT_COLUMNS}
             FROM audit_trail
             ORDER BY changed_at DESC
             LIMIT ? OFFSET ?`,
            [safeLimit, safeOffset]
        );
        return rows;
    } catch (error) {
        console.error('Failed to retrieve audit logs from MySQL:', error.message);
        return [];
    }
};

export const getAuditLogsByAction = async (action, limit = 100) => {
    try {
        const pool = getMySQLPool();
        const { limit: safeLimit } = parseOffsetLimitPagination(
            { limit, offset: 0 },
            { defaultLimit: 100, maxLimit: MAX_LIMIT, maxOffset: 0 }
        );

        const [rows] = await pool.query(
            `SELECT ${AUDIT_SELECT_COLUMNS}
             FROM audit_trail
             WHERE action = ?
             ORDER BY changed_at DESC
             LIMIT ?`,
            [action, safeLimit]
        );
        return rows;
    } catch (error) {
        console.error('Failed to retrieve audit logs from MySQL:', error.message);
        return [];
    }
};

export default {
    logBookUpdate,
    logBookDeletion,
    getBookAuditHistory,
    getAllAuditLogs,
    getAuditLogsByAction,
};
