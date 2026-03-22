import { ActivityLogsStore } from './dataStoreAdapter.js';
import { enqueueLogJob } from './logQueue.js';
import { invalidateCacheKey, withCache } from '../utils/cache.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';
import { Int32 } from 'mongodb';

const MAX_LIMIT = Number.parseInt(process.env.ACTIVITY_LOG_MAX_LIMIT || '200', 10);
const MAX_SKIP = Number.parseInt(process.env.ACTIVITY_LOG_MAX_SKIP || '5000', 10);
const COUNT_CACHE_KEY = 'reports:activity:count';
const COUNT_CACHE_TTL_MS = Number.parseInt(process.env.ACTIVITY_COUNT_CACHE_MS || '15000', 10);

/**
 * Log an activity to the activity_logs store (MongoDB by default)
 * @param {Object} activityData - Activity data
 * @param {string} activityData.action - Action type (book_added, book_updated, checkout, etc.)
 * @param {string} activityData.entity_type - Entity type (book, member, transaction, etc.)
 * @param {number|string} activityData.entity_id - Entity ID
 * @param {Object} activityData.entity_details - Denormalized entity info for display
 * @param {string[]} activityData.fields_changed - List of changed field names (for updates)
 * @param {Object|string} activityData.performed_by - Who performed the action
 * @param {Object} activityData.metadata - Additional context
 */
export const logActivity = (activityData) => {
    enqueueLogJob('activity:log', async () => {
        if (!ActivityLogsStore.enabled) {
            console.warn('Activity logs are disabled, skipping log');
            return;
        }

        // Get entity_id as integer
        const entityId = activityData.entity_id || activityData.book_id;
        
        // Convert performed_by to string if it's an object
        let performedByStr = 'system';
        if (activityData.performed_by) {
            if (typeof activityData.performed_by === 'string') {
                performedByStr = activityData.performed_by;
            } else if (activityData.performed_by.email) {
                performedByStr = activityData.performed_by.email;
            } else if (activityData.performed_by.name) {
                performedByStr = activityData.performed_by.name;
            }
        }

        // Build entity_details matching the schema (title, name, isbn, card_id only)
        const entityDetails = {};
        if (activityData.entity_details?.title || activityData.book_title) {
            entityDetails.title = activityData.entity_details?.title || activityData.book_title;
        }
        if (activityData.entity_details?.name || activityData.member_name) {
            entityDetails.name = activityData.entity_details?.name || activityData.member_name;
        }
        if (activityData.entity_details?.isbn || activityData.isbn) {
            entityDetails.isbn = activityData.entity_details?.isbn || activityData.isbn;
        }
        if (activityData.entity_details?.card_id || activityData.member_card_id) {
            entityDetails.card_id = activityData.entity_details?.card_id || activityData.member_card_id;
        }

        // Build the activity log document matching MongoDB schema
        const logDoc = {
            action: activityData.action,
            entity_type: activityData.entity_type || 'book',
            entity_id: new Int32(Number(entityId) || 0),
            timestamp: new Date(),
            performed_by: performedByStr,
        };

        // Only add entity_details if not empty
        if (Object.keys(entityDetails).length > 0) {
            logDoc.entity_details = entityDetails;
        }

        // Add fields_changed if present
        if (activityData.fields_changed?.length > 0) {
            logDoc.fields_changed = activityData.fields_changed;
        }

        // Add metadata if present
        if (activityData.metadata && Object.keys(activityData.metadata).length > 0) {
            logDoc.metadata = activityData.metadata;
        }

        const result = await ActivityLogsStore.insertOne(logDoc);
        if (result) {
            invalidateCacheKey(COUNT_CACHE_KEY);
        } else {
            console.error('Failed to insert activity log:', logDoc.action, logDoc.entity_type, entityId);
        }
    });
};

export const getActivityLogs = async (limit = 100, skip = 0) => {
    try {
        if (!ActivityLogsStore.enabled) {
            console.warn('Activity logs are disabled');
            return [];
        }

        const { limit: safeLimit, skip: safeSkip } = parseSkipLimitPagination(
            { limit, skip },
            { defaultLimit: 50, maxLimit: MAX_LIMIT, maxSkip: MAX_SKIP }
        );

        const logs = await ActivityLogsStore.find({}, {
            sort: { timestamp: -1 },
            skip: safeSkip,
            limit: safeLimit,
            projection: { _id: 0 }
        });

        // Flatten entity_details to root level for easier frontend access
        return logs.map(log => ({
            ...log,
            // Spread entity_details to root level
            book_title: log.entity_details?.title,
            book_isbn: log.entity_details?.isbn,
            member_name: log.entity_details?.name,
            member_card_id: log.entity_details?.card_id,
        }));
    } catch (error) {
        console.error('Failed to retrieve activity logs:', error.message);
        return [];
    }
};

export const getActivityLogsWithTotal = async (limit = 100, skip = 0) => {
    if (!ActivityLogsStore.enabled) {
        return { logs: [], total: 0 };
    }

    const logs = await getActivityLogs(limit, skip);
    const total = await withCache(COUNT_CACHE_KEY, COUNT_CACHE_TTL_MS, async () => (
        ActivityLogsStore.count()
    ));

    return { logs, total };
};

export default {
    logActivity,
    getActivityLogs,
    getActivityLogsWithTotal,
};
