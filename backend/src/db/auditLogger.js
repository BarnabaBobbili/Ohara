import { AuditTrailStore } from './dataStoreAdapter.js';
import { enqueueLogJob } from './logQueue.js';
import { parseOffsetLimitPagination } from '../utils/pagination.js';

const MAX_LIMIT = Number.parseInt(process.env.AUDIT_MAX_LIMIT || '200', 10);

/**
 * Log book update to audit trail (MySQL by default)
 * Records field-level changes: old_value → new_value
 * @param {number} bookId - Book ID
 * @param {Object} oldData - Old book data
 * @param {Object} newData - New book data
 * @param {string} changedBy - Who made the change (email or 'system')
 * @param {Object} context - Additional context (IP, user agent, etc.)
 */
export const logBookUpdate = (bookId, oldData, newData, changedBy = 'system', context = {}) => {
    enqueueLogJob('audit:update', async () => {
        if (!AuditTrailStore.enabled) {
            return;
        }

        const skipFields = ['updated_at', 'created_at', 'id', 'transactions', 'reservations', 'collection_books', 'ebooks'];
        const auditEntries = [];

        for (const field of Object.keys(newData)) {
            if (skipFields.includes(field)) continue;

            const oldVal = oldData[field] instanceof Date
                ? oldData[field].toISOString()
                : String(oldData[field] ?? '');
            const newVal = newData[field] instanceof Date
                ? newData[field].toISOString()
                : String(newData[field] ?? '');

            if (oldVal !== newVal) {
                auditEntries.push({
                    book_id: bookId,
                    book_title: newData.title || oldData.title,
                    book_isbn: newData.isbn || oldData.isbn,
                    action: 'UPDATE',
                    field_name: field,
                    old_value: oldVal,
                    new_value: newVal,
                    changed_by: changedBy,
                    changed_by_id: context.staffId || null,
                    changed_at: new Date(),
                    ip_address: context.ip || null,
                    user_agent: context.userAgent || null,
                    metadata: JSON.stringify({ timestamp: new Date() }),
                });
            }
        }

        // Batch insert
        for (const entry of auditEntries) {
            await AuditTrailStore.insertOne(entry);
        }
    });
};

/**
 * Log book creation to audit trail
 */
export const logBookCreation = (bookId, bookData, createdBy = 'system', context = {}) => {
    enqueueLogJob('audit:insert', async () => {
        if (!AuditTrailStore.enabled) {
            return;
        }

        await AuditTrailStore.insertOne({
            book_id: bookId,
            book_title: bookData.title,
            book_isbn: bookData.isbn,
            action: 'INSERT',
            field_name: 'complete_record',
            old_value: null,
            new_value: JSON.stringify(bookData),
            changed_by: createdBy,
            changed_by_id: context.staffId || null,
            changed_at: new Date(),
            ip_address: context.ip || null,
            user_agent: context.userAgent || null,
            metadata: JSON.stringify({ 
                timestamp: new Date(),
                created_book_data: {
                    title: bookData.title,
                    author: bookData.author,
                    isbn: bookData.isbn,
                }
            }),
        });
    });
};

/**
 * Log book deletion to audit trail
 */
export const logBookDeletion = (bookId, bookData, deletedBy = 'system', context = {}) => {
    enqueueLogJob('audit:delete', async () => {
        if (!AuditTrailStore.enabled) {
            return;
        }

        const metadata = {
            timestamp: new Date(),
            deleted_book_data: {
                title: bookData.title,
                author: bookData.author,
                isbn: bookData.isbn,
            },
        };

        await AuditTrailStore.insertOne({
            book_id: bookId,
            book_title: bookData.title,
            book_isbn: bookData.isbn,
            action: 'DELETE',
            field_name: 'complete_record',
            old_value: JSON.stringify(bookData),
            new_value: null,
            changed_by: deletedBy,
            changed_by_id: context.staffId || null,
            changed_at: new Date(),
            ip_address: context.ip || null,
            user_agent: context.userAgent || null,
            metadata: JSON.stringify(metadata),
        });
    });
};

export const getBookAuditHistory = async (bookId, limit = 100) => {
    try {
        if (!AuditTrailStore.enabled) {
            return [];
        }

        const { limit: safeLimit } = parseOffsetLimitPagination(
            { limit, offset: 0 },
            { defaultLimit: 100, maxLimit: MAX_LIMIT, maxOffset: 0 }
        );

        const rows = await AuditTrailStore.find(
            { book_id: bookId },
            { sort: { changed_at: -1 }, limit: safeLimit }
        );

        return rows;
    } catch (error) {
        console.error('Failed to retrieve audit history:', error.message);
        return [];
    }
};

export const getAllAuditLogs = async (limit = 100, offset = 0) => {
    try {
        if (!AuditTrailStore.enabled) {
            return [];
        }

        const { limit: safeLimit, offset: safeOffset } = parseOffsetLimitPagination(
            { limit, offset },
            { defaultLimit: 100, maxLimit: MAX_LIMIT, maxOffset: 5000 }
        );

        const rows = await AuditTrailStore.find(
            {},
            { sort: { changed_at: -1 }, limit: safeLimit, skip: safeOffset }
        );

        return rows;
    } catch (error) {
        console.error('Failed to retrieve audit logs:', error.message);
        return [];
    }
};

export const getAuditLogsByAction = async (action, limit = 100) => {
    try {
        if (!AuditTrailStore.enabled) {
            return [];
        }

        const { limit: safeLimit } = parseOffsetLimitPagination(
            { limit, offset: 0 },
            { defaultLimit: 100, maxLimit: MAX_LIMIT, maxOffset: 0 }
        );

        const rows = await AuditTrailStore.find(
            { action },
            { sort: { changed_at: -1 }, limit: safeLimit }
        );

        return rows;
    } catch (error) {
        console.error('Failed to retrieve audit logs:', error.message);
        return [];
    }
};

export default {
    logBookUpdate,
    logBookCreation,
    logBookDeletion,
    getBookAuditHistory,
    getAllAuditLogs,
    getAuditLogsByAction,
};
