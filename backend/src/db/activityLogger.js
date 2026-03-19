import { getMongoDatabase } from './mongodb.js';
import { enqueueLogJob } from './logQueue.js';
import { invalidateCacheKey, withCache } from '../utils/cache.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';

const MAX_LIMIT = Number.parseInt(process.env.ACTIVITY_LOG_MAX_LIMIT || '200', 10);
const MAX_SKIP = Number.parseInt(process.env.ACTIVITY_LOG_MAX_SKIP || '5000', 10);
const COUNT_CACHE_KEY = 'reports:activity:count';
const COUNT_CACHE_TTL_MS = Number.parseInt(process.env.ACTIVITY_COUNT_CACHE_MS || '15000', 10);

export const logActivity = (activityData) => {
    enqueueLogJob('mongo:activity', async () => {
        const db = getMongoDatabase();
        if (!db) {
            return;
        }

        const logsCollection = db.collection('activity_logs');
        await logsCollection.insertOne({
            ...activityData,
            timestamp: new Date(),
        });

        invalidateCacheKey(COUNT_CACHE_KEY);
    });
};

export const getActivityLogs = async (limit = 100, skip = 0) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            console.warn('Cannot fetch activity logs: MongoDB not connected');
            return [];
        }

        const logsCollection = db.collection('activity_logs');
        const { limit: safeLimit, skip: safeSkip } = parseSkipLimitPagination(
            { limit, skip },
            { defaultLimit: 50, maxLimit: MAX_LIMIT, maxSkip: MAX_SKIP }
        );

        const logs = await logsCollection
            .find({}, { projection: { _id: 0 } })
            .sort({ timestamp: -1 })
            .skip(safeSkip)
            .limit(safeLimit)
            .toArray();

        return logs;
    } catch (error) {
        console.error('Failed to retrieve activity logs:', error.message);
        return [];
    }
};

export const getActivityLogsWithTotal = async (limit = 100, skip = 0) => {
    const db = getMongoDatabase();
    if (!db) {
        return { logs: [], total: 0 };
    }

    const logs = await getActivityLogs(limit, skip);
    const total = await withCache(COUNT_CACHE_KEY, COUNT_CACHE_TTL_MS, async () => (
        db.collection('activity_logs').estimatedDocumentCount()
    ));

    return { logs, total };
};

export default {
    logActivity,
    getActivityLogs,
    getActivityLogsWithTotal,
};
