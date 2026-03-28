/**
 * Job Result Logger
 * 
 * Logs scheduled job execution results to MongoDB for audit and monitoring
 * Uses the analytics collection with a 'job_execution' type
 * 
 * All timestamps and durations include Indian locale formatted values
 */

import { getMongoDatabase } from '../db/mongodb.js';
import { formatDateTimeIndian, formatNumberIndian, formatPercentageIndian } from '../utils/indianLocale.js';

/**
 * Log job execution result to MongoDB
 * @param {Object} result - Job execution result
 * @returns {Promise<void>}
 */
export const logJobExecution = async (result) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            console.warn('[JOB_LOGGER] MongoDB not available, skipping job log');
            return;
        }

        const logEntry = {
            type: 'job_execution',
            job_name: result.jobName,
            success: result.success,
            executed_at: result.executedAt || new Date(),
            duration_ms: result.duration || 0,
            result: result.result || null,
            error: result.error || null,
            timestamp: new Date()
        };

        await db.collection('analytics').insertOne(logEntry);
        
    } catch (error) {
        // Don't throw - logging failure shouldn't break the job
        console.error('[JOB_LOGGER] Failed to log job execution:', error.message);
    }
};

/**
 * Get job execution history from MongoDB
 * @param {string} jobName - Job name to filter (optional)
 * @param {number} days - Number of days to look back (default: 7)
 * @param {number} limit - Maximum records to return (default: 100)
 * @returns {Promise<Array>} Job execution history
 */
export const getJobExecutionHistory = async (jobName = null, days = 7, limit = 100) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            return [];
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const filter = {
            type: 'job_execution',
            timestamp: { $gte: startDate }
        };

        if (jobName) {
            filter.job_name = jobName;
        }

        const history = await db.collection('analytics')
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();

        return history.map(entry => ({
            jobName: entry.job_name,
            success: entry.success,
            executedAt: entry.executed_at,
            executedAt_formatted: formatDateTimeIndian(entry.executed_at),
            durationMs: entry.duration_ms,
            durationMs_formatted: `${formatNumberIndian(entry.duration_ms)} ms`,
            result: entry.result,
            error: entry.error
        }));
    } catch (error) {
        console.error('[JOB_LOGGER] Failed to get job history:', error.message);
        return [];
    }
};

/**
 * Get job execution statistics
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} Job statistics
 */
export const getJobStatistics = async (days = 30) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            return {};
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const pipeline = [
            {
                $match: {
                    type: 'job_execution',
                    timestamp: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$job_name',
                    totalExecutions: { $sum: 1 },
                    successCount: {
                        $sum: { $cond: ['$success', 1, 0] }
                    },
                    failureCount: {
                        $sum: { $cond: ['$success', 0, 1] }
                    },
                    avgDuration: { $avg: '$duration_ms' },
                    lastExecution: { $max: '$executed_at' }
                }
            },
            {
                $project: {
                    _id: 0,
                    jobName: '$_id',
                    totalExecutions: 1,
                    successCount: 1,
                    failureCount: 1,
                    successRate: {
                        $multiply: [
                            { $divide: ['$successCount', '$totalExecutions'] },
                            100
                        ]
                    },
                    avgDurationMs: { $round: ['$avgDuration', 0] },
                    lastExecution: 1
                }
            }
        ];

        const stats = await db.collection('analytics')
            .aggregate(pipeline)
            .toArray();

        return {
            period: `Last ${days} days`,
            jobs: stats.map(stat => ({
                ...stat,
                totalExecutions_formatted: formatNumberIndian(stat.totalExecutions),
                successCount_formatted: formatNumberIndian(stat.successCount),
                failureCount_formatted: formatNumberIndian(stat.failureCount),
                successRate_formatted: formatPercentageIndian(stat.successRate),
                avgDurationMs_formatted: `${formatNumberIndian(stat.avgDurationMs)} ms`,
                lastExecution_formatted: formatDateTimeIndian(stat.lastExecution)
            }))
        };
    } catch (error) {
        console.error('[JOB_LOGGER] Failed to get job statistics:', error.message);
        return {};
    }
};

export default {
    logJobExecution,
    getJobExecutionHistory,
    getJobStatistics
};
