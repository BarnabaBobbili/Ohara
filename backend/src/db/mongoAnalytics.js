/**
 * MongoDB Aggregation Pipelines for Activity Analytics
 * 
 * This module provides analytics functions using MongoDB aggregation framework
 * with $match, $group, and $project operators for activity_logs collection.
 * 
 * Collections used:
 * - activity_logs: User and system activity tracking (90-day TTL)
 * - analytics: Pre-computed metrics and statistics
 * 
 * All responses include Indian locale formatted values (_formatted suffix)
 */

import { getMongoDatabase } from './mongodb.js';
import { DatabaseError } from '../utils/customErrors.js';
import { 
    formatDateIndian, 
    formatDateTimeIndian, 
    formatNumberIndian,
    formatPercentageIndian,
    getRelativeTimeIndian 
} from '../utils/indianLocale.js';

/**
 * Get activity summary grouped by action type
 * Shows total count and recent activity for each action type
 * 
 * Pipeline stages:
 * 1. $match - Filter by date range
 * 2. $group - Count by action type
 * 3. $sort - Order by count descending
 * 4. $project - Format output
 * 
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Array>} Array of {action, count, percentage}
 */
export const getActivitySummaryByAction = async (days = 30) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            throw new DatabaseError('MongoDB connection not available');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const pipeline = [
            // Stage 1: Filter by date range
            {
                $match: {
                    timestamp: { $gte: startDate }
                }
            },
            // Stage 2: Group by action and count
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    latestActivity: { $max: '$timestamp' },
                    uniqueUsers: { $addToSet: '$performed_by' }
                }
            },
            // Stage 3: Calculate unique user count
            {
                $project: {
                    _id: 0,
                    action: '$_id',
                    count: 1,
                    latestActivity: 1,
                    uniqueUserCount: { $size: '$uniqueUsers' }
                }
            },
            // Stage 4: Sort by count descending
            {
                $sort: { count: -1 }
            }
        ];

        const results = await db.collection('activity_logs')
            .aggregate(pipeline)
            .toArray();

        // Calculate total for percentage
        const total = results.reduce((sum, item) => sum + item.count, 0);

        return results.map(item => ({
            action: item.action,
            count: item.count,
            count_formatted: formatNumberIndian(item.count),
            percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : '0.00',
            percentage_formatted: formatPercentageIndian(total > 0 ? ((item.count / total) * 100) : 0),
            latestActivity: item.latestActivity,
            latestActivity_formatted: formatDateTimeIndian(item.latestActivity),
            latestActivity_relative: getRelativeTimeIndian(item.latestActivity),
            uniqueUsers: item.uniqueUserCount,
            uniqueUsers_formatted: formatNumberIndian(item.uniqueUserCount)
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get activity summary: ${error.message}`);
    }
};

/**
 * Get daily activity trend for time-series analysis
 * Groups activities by date for trend visualization
 * 
 * Pipeline stages:
 * 1. $match - Filter by date range
 * 2. $project - Extract date components
 * 3. $group - Count by date
 * 4. $sort - Order chronologically
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Array>} Array of {date, totalActivities, breakdown}
 */
export const getDailyActivityTrend = async (days = 30) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            throw new DatabaseError('MongoDB connection not available');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const pipeline = [
            // Stage 1: Filter by date range
            {
                $match: {
                    timestamp: { $gte: startDate }
                }
            },
            // Stage 2: Extract date parts and prepare for grouping
            {
                $project: {
                    date: {
                        $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                    },
                    action: 1,
                    entity_type: 1
                }
            },
            // Stage 3: Group by date and action
            {
                $group: {
                    _id: {
                        date: '$date',
                        action: '$action'
                    },
                    count: { $sum: 1 }
                }
            },
            // Stage 4: Regroup by date only to get daily totals
            {
                $group: {
                    _id: '$_id.date',
                    totalActivities: { $sum: '$count' },
                    breakdown: {
                        $push: {
                            action: '$_id.action',
                            count: '$count'
                        }
                    }
                }
            },
            // Stage 5: Format output
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    totalActivities: 1,
                    breakdown: 1
                }
            },
            // Stage 6: Sort chronologically
            {
                $sort: { date: 1 }
            }
        ];

        const results = await db.collection('activity_logs')
            .aggregate(pipeline)
            .toArray();

        return results.map(item => ({
            date: item.date,
            date_formatted: formatDateIndian(new Date(item.date)),
            totalActivities: item.totalActivities,
            totalActivities_formatted: formatNumberIndian(item.totalActivities),
            breakdown: item.breakdown
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get daily activity trend: ${error.message}`);
    }
};

/**
 * Get most active users by activity count
 * Identifies top users generating the most activities
 * 
 * Pipeline stages:
 * 1. $match - Filter by date range and exclude system
 * 2. $group - Count activities per user
 * 3. $sort - Order by activity count
 * 4. $limit - Top N users
 * 5. $project - Format output
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @param {number} limit - Number of top users to return (default: 10)
 * @returns {Promise<Array>} Array of {user, activityCount, actions}
 */
export const getMostActiveUsers = async (days = 30, limit = 10) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            throw new DatabaseError('MongoDB connection not available');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const pipeline = [
            // Stage 1: Filter by date range, exclude system user
            {
                $match: {
                    timestamp: { $gte: startDate },
                    performed_by: { $ne: 'system' }
                }
            },
            // Stage 2: Group by user and collect actions
            {
                $group: {
                    _id: '$performed_by',
                    activityCount: { $sum: 1 },
                    actions: { $push: '$action' },
                    firstActivity: { $min: '$timestamp' },
                    lastActivity: { $max: '$timestamp' }
                }
            },
            // Stage 3: Sort by activity count descending
            {
                $sort: { activityCount: -1 }
            },
            // Stage 4: Limit to top N
            {
                $limit: limit
            },
            // Stage 5: Count unique actions per user
            {
                $project: {
                    _id: 0,
                    user: '$_id',
                    activityCount: 1,
                    uniqueActions: { $size: { $setUnion: ['$actions', []] } },
                    firstActivity: 1,
                    lastActivity: 1
                }
            }
        ];

        const results = await db.collection('activity_logs')
            .aggregate(pipeline)
            .toArray();

        return results.map(item => ({
            user: item.user,
            activityCount: item.activityCount,
            activityCount_formatted: formatNumberIndian(item.activityCount),
            uniqueActions: item.uniqueActions,
            firstActivity: item.firstActivity,
            firstActivity_formatted: formatDateTimeIndian(item.firstActivity),
            lastActivity: item.lastActivity,
            lastActivity_formatted: formatDateTimeIndian(item.lastActivity),
            lastActivity_relative: getRelativeTimeIndian(item.lastActivity)
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get most active users: ${error.message}`);
    }
};

/**
 * Get entity activity breakdown (books, members, transactions)
 * Shows which entities are most frequently accessed
 * 
 * Pipeline stages:
 * 1. $match - Filter by date range and entity type
 * 2. $group - Count activities per entity
 * 3. $sort - Order by count
 * 4. $limit - Top N entities
 * 
 * @param {string} entityType - Entity type to analyze (book, member, transaction, etc.)
 * @param {number} days - Number of days to analyze (default: 30)
 * @param {number} limit - Number of top entities to return (default: 20)
 * @returns {Promise<Array>} Array of {entityId, entityDetails, activityCount, recentActions}
 */
export const getEntityActivityBreakdown = async (entityType, days = 30, limit = 20) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            throw new DatabaseError('MongoDB connection not available');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const pipeline = [
            // Stage 1: Filter by entity type and date range
            {
                $match: {
                    entity_type: entityType,
                    timestamp: { $gte: startDate }
                }
            },
            // Stage 2: Group by entity_id
            {
                $group: {
                    _id: '$entity_id',
                    activityCount: { $sum: 1 },
                    actions: { $push: '$action' },
                    entityDetails: { $first: '$entity_details' },
                    latestActivity: { $max: '$timestamp' }
                }
            },
            // Stage 3: Sort by activity count descending
            {
                $sort: { activityCount: -1 }
            },
            // Stage 4: Limit to top N
            {
                $limit: limit
            },
            // Stage 5: Format output
            {
                $project: {
                    _id: 0,
                    entityId: '$_id',
                    entityDetails: 1,
                    activityCount: 1,
                    uniqueActions: { $size: { $setUnion: ['$actions', []] } },
                    recentActions: { $slice: ['$actions', -5] },
                    latestActivity: 1
                }
            }
        ];

        const results = await db.collection('activity_logs')
            .aggregate(pipeline)
            .toArray();

        return results.map(item => ({
            entityId: item.entityId,
            entityDetails: item.entityDetails,
            activityCount: item.activityCount,
            activityCount_formatted: formatNumberIndian(item.activityCount),
            uniqueActions: item.uniqueActions,
            recentActions: item.recentActions,
            latestActivity: item.latestActivity,
            latestActivity_formatted: formatDateTimeIndian(item.latestActivity),
            latestActivity_relative: getRelativeTimeIndian(item.latestActivity)
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get entity activity breakdown: ${error.message}`);
    }
};

/**
 * Get hourly activity heatmap for identifying peak usage times
 * Groups activities by hour of day for pattern analysis
 * 
 * Pipeline stages:
 * 1. $match - Filter by date range
 * 2. $project - Extract hour from timestamp
 * 3. $group - Count by hour
 * 4. $sort - Order by hour
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Array>} Array of {hour, count, percentage}
 */
export const getHourlyActivityHeatmap = async (days = 30) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            throw new DatabaseError('MongoDB connection not available');
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const pipeline = [
            // Stage 1: Filter by date range
            {
                $match: {
                    timestamp: { $gte: startDate }
                }
            },
            // Stage 2: Extract hour from timestamp
            {
                $project: {
                    hour: { $hour: '$timestamp' },
                    action: 1
                }
            },
            // Stage 3: Group by hour
            {
                $group: {
                    _id: '$hour',
                    count: { $sum: 1 },
                    actions: { $push: '$action' }
                }
            },
            // Stage 4: Sort by hour
            {
                $sort: { _id: 1 }
            },
            // Stage 5: Format output
            {
                $project: {
                    _id: 0,
                    hour: '$_id',
                    count: 1,
                    uniqueActions: { $size: { $setUnion: ['$actions', []] } }
                }
            }
        ];

        const results = await db.collection('activity_logs')
            .aggregate(pipeline)
            .toArray();

        // Calculate total for percentage
        const total = results.reduce((sum, item) => sum + item.count, 0);

        return results.map(item => ({
            hour: item.hour,
            hourLabel: `${item.hour.toString().padStart(2, '0')}:00`,
            hourLabel_IST: `${item.hour.toString().padStart(2, '0')}:00 IST`,
            count: item.count,
            count_formatted: formatNumberIndian(item.count),
            percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : '0.00',
            percentage_formatted: formatPercentageIndian(total > 0 ? ((item.count / total) * 100) : 0),
            uniqueActions: item.uniqueActions
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get hourly activity heatmap: ${error.message}`);
    }
};

/**
 * Get comprehensive activity dashboard with multiple metrics
 * Combines multiple aggregations into a single dashboard view
 * 
 * Uses $facet to run multiple pipelines in parallel:
 * - totalActivities: Overall count
 * - actionBreakdown: Count by action type
 * - entityBreakdown: Count by entity type
 * - topUsers: Most active users
 * - recentActivities: Latest 10 activities
 * 
 * @param {number} days - Number of days to analyze (default: 7)
 * @returns {Promise<Object>} Dashboard object with multiple metrics
 */
export const getActivityDashboard = async (days = 7, range = {}) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            throw new DatabaseError('MongoDB connection not available');
        }

        const parseDate = (value) => {
            if (!value) return null;
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        };

        const rangeStart = parseDate(range?.startDate);
        const rangeEnd = parseDate(range?.endDate);

        let startDate;
        let endDate;
        if (rangeStart && rangeEnd) {
            startDate = rangeStart;
            endDate = rangeEnd;
        } else {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }

        if (startDate > endDate) {
            throw new DatabaseError('Invalid date range: startDate cannot be after endDate');
        }

        const pipeline = [
            // Stage 1: Filter by date range
            {
                $match: {
                    timestamp: { $gte: startDate, $lte: endDate }
                }
            },
            // Stage 2: Facet - run multiple pipelines in parallel
            {
                $facet: {
                    // Total activities count
                    totalActivities: [
                        { $count: 'total' }
                    ],
                    // Action breakdown
                    actionBreakdown: [
                        {
                            $group: {
                                _id: '$action',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        {
                            $project: {
                                _id: 0,
                                action: '$_id',
                                count: 1
                            }
                        }
                    ],
                    // Entity type breakdown
                    entityBreakdown: [
                        {
                            $group: {
                                _id: '$entity_type',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        {
                            $project: {
                                _id: 0,
                                entityType: '$_id',
                                count: 1
                            }
                        }
                    ],
                    // Top 5 users
                    topUsers: [
                        {
                            $match: {
                                performed_by: { $ne: 'system' }
                            }
                        },
                        {
                            $group: {
                                _id: '$performed_by',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                _id: 0,
                                user: '$_id',
                                activityCount: '$count'
                            }
                        }
                    ],
                    // Recent 10 activities
                    recentActivities: [
                        { $sort: { timestamp: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                action: 1,
                                entity_type: 1,
                                entity_id: 1,
                                entity_details: 1,
                                performed_by: 1,
                                timestamp: 1
                            }
                        }
                    ]
                }
            }
        ];

        const results = await db.collection('activity_logs')
            .aggregate(pipeline)
            .toArray();

        const facetResult = results[0];

        return {
            period: rangeStart && rangeEnd
                ? `${formatDateIndian(startDate)} to ${formatDateIndian(endDate)}`
                : `Last ${days} days`,
            startDate,
            startDate_formatted: formatDateIndian(startDate),
            endDate,
            endDate_formatted: formatDateIndian(endDate),
            totalActivities: facetResult.totalActivities[0]?.total || 0,
            totalActivities_formatted: formatNumberIndian(facetResult.totalActivities[0]?.total || 0),
            actionBreakdown: facetResult.actionBreakdown.map(item => ({
                ...item,
                count_formatted: formatNumberIndian(item.count)
            })),
            entityBreakdown: facetResult.entityBreakdown.map(item => ({
                ...item,
                count_formatted: formatNumberIndian(item.count)
            })),
            topUsers: facetResult.topUsers.map(user => ({
                ...user,
                activityCount_formatted: formatNumberIndian(user.activityCount)
            })),
            recentActivities: facetResult.recentActivities.map(activity => ({
                ...activity,
                timestamp_formatted: formatDateTimeIndian(activity.timestamp),
                timestamp_relative: getRelativeTimeIndian(activity.timestamp)
            }))
        };
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get activity dashboard: ${error.message}`);
    }
};

/**
 * Get activity comparison between two time periods
 * Useful for growth analysis and trend comparison
 * 
 * @param {number} currentDays - Current period length in days (default: 7)
 * @param {number} previousDays - Previous period length in days (default: 7)
 * @returns {Promise<Object>} Comparison object with growth metrics
 */
export const getActivityComparison = async (currentDays = 7, previousDays = 7) => {
    try {
        const db = getMongoDatabase();
        if (!db) {
            throw new DatabaseError('MongoDB connection not available');
        }

        const now = new Date();
        const currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - currentDays);
        
        const previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - previousDays);

        const pipeline = [
            // Stage 1: Filter to include both periods
            {
                $match: {
                    timestamp: { $gte: previousStart }
                }
            },
            // Stage 2: Tag each activity with its period
            {
                $project: {
                    period: {
                        $cond: {
                            if: { $gte: ['$timestamp', currentStart] },
                            then: 'current',
                            else: 'previous'
                        }
                    },
                    action: 1,
                    performed_by: 1
                }
            },
            // Stage 3: Group by period and action
            {
                $group: {
                    _id: {
                        period: '$period',
                        action: '$action'
                    },
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$performed_by' }
                }
            },
            // Stage 4: Group by period
            {
                $group: {
                    _id: '$_id.period',
                    total: { $sum: '$count' },
                    actions: {
                        $push: {
                            action: '$_id.action',
                            count: '$count',
                            uniqueUsers: { $size: '$uniqueUsers' }
                        }
                    }
                }
            }
        ];

        const results = await db.collection('activity_logs')
            .aggregate(pipeline)
            .toArray();

        const currentData = results.find(r => r._id === 'current');
        const previousData = results.find(r => r._id === 'previous');

        const currentTotal = currentData?.total || 0;
        const previousTotal = previousData?.total || 0;
        const growth = previousTotal > 0 
            ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(2)
            : '0.00';

        return {
            currentPeriod: {
                days: currentDays,
                total: currentTotal,
                total_formatted: formatNumberIndian(currentTotal),
                breakdown: currentData?.actions?.map(item => ({
                    ...item,
                    count_formatted: formatNumberIndian(item.count)
                })) || []
            },
            previousPeriod: {
                days: previousDays,
                total: previousTotal,
                total_formatted: formatNumberIndian(previousTotal),
                breakdown: previousData?.actions?.map(item => ({
                    ...item,
                    count_formatted: formatNumberIndian(item.count)
                })) || []
            },
            growth: {
                percentage: growth,
                percentage_formatted: formatPercentageIndian(parseFloat(growth)),
                absolute: currentTotal - previousTotal,
                absolute_formatted: formatNumberIndian(currentTotal - previousTotal),
                trend: currentTotal >= previousTotal ? 'up' : 'down'
            }
        };
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get activity comparison: ${error.message}`);
    }
};

export default {
    getActivitySummaryByAction,
    getDailyActivityTrend,
    getMostActiveUsers,
    getEntityActivityBreakdown,
    getHourlyActivityHeatmap,
    getActivityDashboard,
    getActivityComparison
};
