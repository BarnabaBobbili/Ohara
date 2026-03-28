/**
 * Analytics API Routes
 * 
 * Provides REST endpoints for:
 * - Activity analytics (MongoDB aggregations)
 * - Financial analytics (MySQL aggregations)
 * - Collection analytics (PostgreSQL queries)
 * 
 * All routes use asyncHandler for consistent error handling
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

// Import analytics modules
import * as activityAnalytics from '../db/mongoAnalytics.js';
import * as financialAnalytics from '../db/financialAnalytics.js';
import * as collectionAnalytics from '../db/collectionAnalytics.js';

const router = express.Router();

// ============================================================
// ACTIVITY ANALYTICS (MongoDB)
// ============================================================

/**
 * GET /api/analytics/activity/summary
 * Get activity summary grouped by action type
 * Query params: days (default: 30)
 */
router.get('/activity/summary', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const summary = await activityAnalytics.getActivitySummaryByAction(days);
    
    res.json({
        success: true,
        data: summary,
        meta: {
            period: `Last ${days} days`,
            source: 'MongoDB activity_logs'
        }
    });
}));

/**
 * GET /api/analytics/activity/trend
 * Get daily activity trend for time-series analysis
 * Query params: days (default: 30)
 */
router.get('/activity/trend', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const trend = await activityAnalytics.getDailyActivityTrend(days);
    
    res.json({
        success: true,
        data: trend,
        meta: {
            period: `Last ${days} days`,
            source: 'MongoDB activity_logs'
        }
    });
}));

/**
 * GET /api/analytics/activity/top-users
 * Get most active users by activity count
 * Query params: days (default: 30), limit (default: 10)
 */
router.get('/activity/top-users', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const limit = parseInt(req.query.limit, 10) || 10;
    const topUsers = await activityAnalytics.getMostActiveUsers(days, limit);
    
    res.json({
        success: true,
        data: topUsers,
        meta: {
            period: `Last ${days} days`,
            limit,
            source: 'MongoDB activity_logs'
        }
    });
}));

/**
 * GET /api/analytics/activity/entities/:entityType
 * Get entity activity breakdown (books, members, transactions)
 * Path params: entityType (book, member, transaction, etc.)
 * Query params: days (default: 30), limit (default: 20)
 */
router.get('/activity/entities/:entityType', asyncHandler(async (req, res) => {
    const { entityType } = req.params;
    const days = parseInt(req.query.days, 10) || 30;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    const breakdown = await activityAnalytics.getEntityActivityBreakdown(entityType, days, limit);
    
    res.json({
        success: true,
        data: breakdown,
        meta: {
            entityType,
            period: `Last ${days} days`,
            limit,
            source: 'MongoDB activity_logs'
        }
    });
}));

/**
 * GET /api/analytics/activity/heatmap
 * Get hourly activity heatmap for peak usage analysis
 * Query params: days (default: 30)
 */
router.get('/activity/heatmap', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const heatmap = await activityAnalytics.getHourlyActivityHeatmap(days);
    
    res.json({
        success: true,
        data: heatmap,
        meta: {
            period: `Last ${days} days`,
            source: 'MongoDB activity_logs'
        }
    });
}));

/**
 * GET /api/analytics/activity/dashboard
 * Get comprehensive activity dashboard
 * Query params: days (default: 7)
 */
router.get('/activity/dashboard', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 7;
    const dashboard = await activityAnalytics.getActivityDashboard(days);
    
    res.json({
        success: true,
        data: dashboard,
        meta: {
            source: 'MongoDB activity_logs'
        }
    });
}));

/**
 * GET /api/analytics/activity/comparison
 * Get activity comparison between two time periods
 * Query params: currentDays (default: 7), previousDays (default: 7)
 */
router.get('/activity/comparison', asyncHandler(async (req, res) => {
    const currentDays = parseInt(req.query.currentDays, 10) || 7;
    const previousDays = parseInt(req.query.previousDays, 10) || 7;
    
    const comparison = await activityAnalytics.getActivityComparison(currentDays, previousDays);
    
    res.json({
        success: true,
        data: comparison,
        meta: {
            source: 'MongoDB activity_logs'
        }
    });
}));

// ============================================================
// FINANCIAL ANALYTICS (MySQL)
// ============================================================

/**
 * GET /api/analytics/financial/summary
 * Get financial summary by transaction type
 * Query params: days (default: 30)
 */
router.get('/financial/summary', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const summary = await financialAnalytics.getFinancialSummaryByType(days);
    
    res.json({
        success: true,
        data: summary,
        meta: {
            period: `Last ${days} days`,
            source: 'MySQL financial_records'
        }
    });
}));

/**
 * GET /api/analytics/financial/trend
 * Get daily financial trends
 * Query params: days (default: 30)
 */
router.get('/financial/trend', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const trend = await financialAnalytics.getDailyFinancialTrend(days);
    
    res.json({
        success: true,
        data: trend,
        meta: {
            period: `Last ${days} days`,
            source: 'MySQL financial_records'
        }
    });
}));

/**
 * GET /api/analytics/financial/top-members
 * Get top members by total fines
 * Query params: days (default: 90), limit (default: 20)
 */
router.get('/financial/top-members', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 90;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    const topMembers = await financialAnalytics.getTopMembersByFines(days, limit);
    
    res.json({
        success: true,
        data: topMembers,
        meta: {
            period: `Last ${days} days`,
            limit,
            source: 'MySQL financial_records'
        }
    });
}));

/**
 * GET /api/analytics/financial/payments-by-processor
 * Get payments breakdown by staff who processed them
 * Query params: days (default: 30)
 */
router.get('/financial/payments-by-processor', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const breakdown = await financialAnalytics.getPaymentsByProcessor(days);
    
    res.json({
        success: true,
        data: breakdown,
        meta: {
            period: `Last ${days} days`,
            source: 'MySQL financial_records'
        }
    });
}));

/**
 * GET /api/analytics/financial/fines-with-links
 * Get fines with their PostgreSQL transaction links
 * Query params: days (default: 90), limit (default: 50)
 */
router.get('/financial/fines-with-links', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 90;
    const limit = parseInt(req.query.limit, 10) || 50;
    
    const fines = await financialAnalytics.getFinesWithTransactionLinks(days, limit);
    
    res.json({
        success: true,
        data: fines,
        meta: {
            period: `Last ${days} days`,
            limit,
            source: 'MySQL financial_records'
        }
    });
}));

/**
 * GET /api/analytics/financial/monthly-revenue
 * Get monthly revenue report
 * Query params: months (default: 12)
 */
router.get('/financial/monthly-revenue', asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months, 10) || 12;
    const report = await financialAnalytics.getMonthlyRevenueReport(months);
    
    res.json({
        success: true,
        data: report,
        meta: {
            period: `Last ${months} months`,
            source: 'MySQL financial_records'
        }
    });
}));

/**
 * GET /api/analytics/financial/dashboard
 * Get comprehensive financial dashboard
 * Query params: days (default: 30)
 */
router.get('/financial/dashboard', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const dashboard = await financialAnalytics.getFinancialDashboard(days);
    
    res.json({
        success: true,
        data: dashboard,
        meta: {
            source: 'MySQL financial_records'
        }
    });
}));

/**
 * GET /api/analytics/financial/waivers
 * Get waiver statistics and analysis
 * Query params: days (default: 90)
 */
router.get('/financial/waivers', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 90;
    const analysis = await financialAnalytics.getWaiverAnalysis(days);
    
    res.json({
        success: true,
        data: analysis,
        meta: {
            source: 'MySQL financial_records'
        }
    });
}));

/**
 * GET /api/analytics/financial/book-audit
 * Get book audit trail summary
 * Query params: days (default: 30)
 */
router.get('/financial/book-audit', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const summary = await financialAnalytics.getBookAuditSummary(days);
    
    res.json({
        success: true,
        data: summary,
        meta: {
            source: 'MySQL audit_trail'
        }
    });
}));

// ============================================================
// COLLECTION ANALYTICS (PostgreSQL)
// ============================================================

/**
 * GET /api/analytics/collection/popular-books
 * Get most popular books by circulation
 * Query params: days (default: 90), limit (default: 20)
 */
router.get('/collection/popular-books', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 90;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    const popularBooks = await collectionAnalytics.getMostPopularBooks(days, limit);
    
    res.json({
        success: true,
        data: popularBooks,
        meta: {
            period: `Last ${days} days`,
            limit,
            source: 'PostgreSQL books + transactions'
        }
    });
}));

/**
 * GET /api/analytics/collection/least-circulated
 * Get least circulated books (potential weeding candidates)
 * Query params: days (default: 180), limit (default: 50)
 */
router.get('/collection/least-circulated', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 180;
    const limit = parseInt(req.query.limit, 10) || 50;
    
    const leastCirculated = await collectionAnalytics.getLeastCirculatedBooks(days, limit);
    
    res.json({
        success: true,
        data: leastCirculated,
        meta: {
            period: `Last ${days} days`,
            limit,
            source: 'PostgreSQL books + transactions'
        }
    });
}));

/**
 * GET /api/analytics/collection/categories
 * Get category performance breakdown
 * Query params: days (default: 90)
 */
router.get('/collection/categories', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 90;
    const categories = await collectionAnalytics.getCategoryPerformance(days);
    
    res.json({
        success: true,
        data: categories,
        meta: {
            period: `Last ${days} days`,
            source: 'PostgreSQL books + transactions'
        }
    });
}));

/**
 * GET /api/analytics/collection/turnover
 * Get collection turnover rate
 * Query params: months (default: 12)
 */
router.get('/collection/turnover', asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months, 10) || 12;
    const turnover = await collectionAnalytics.getCollectionTurnoverRate(months);
    
    res.json({
        success: true,
        data: turnover,
        meta: {
            source: 'PostgreSQL books + transactions'
        }
    });
}));

/**
 * GET /api/analytics/collection/authors
 * Get author popularity rankings
 * Query params: days (default: 90), limit (default: 20)
 */
router.get('/collection/authors', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 90;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    const authors = await collectionAnalytics.getAuthorPopularity(days, limit);
    
    res.json({
        success: true,
        data: authors,
        meta: {
            period: `Last ${days} days`,
            limit,
            source: 'PostgreSQL books + transactions'
        }
    });
}));

/**
 * GET /api/analytics/collection/new-acquisitions
 * Get new acquisitions performance
 * Query params: months (default: 6)
 */
router.get('/collection/new-acquisitions', asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months, 10) || 6;
    const performance = await collectionAnalytics.getNewAcquisitionsPerformance(months);
    
    res.json({
        success: true,
        data: performance,
        meta: {
            period: `Last ${months} months`,
            source: 'PostgreSQL books + transactions'
        }
    });
}));

/**
 * GET /api/analytics/collection/dashboard
 * Get comprehensive collection dashboard
 * Query params: days (default: 30)
 */
router.get('/collection/dashboard', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const dashboard = await collectionAnalytics.getCollectionDashboard(days);
    
    res.json({
        success: true,
        data: dashboard,
        meta: {
            source: 'PostgreSQL books + transactions + reservations'
        }
    });
}));

/**
 * GET /api/analytics/collection/availability-forecast
 * Get availability forecast for popular books
 * Query params: limit (default: 20)
 */
router.get('/collection/availability-forecast', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 20;
    const forecast = await collectionAnalytics.getAvailabilityForecast(limit);
    
    res.json({
        success: true,
        data: forecast,
        meta: {
            limit,
            source: 'PostgreSQL books + transactions + reservations'
        }
    });
}));

// ============================================================
// COMBINED ANALYTICS
// ============================================================

/**
 * GET /api/analytics/overview
 * Get a high-level overview combining all analytics sources
 * Query params: days (default: 30)
 */
router.get('/overview', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    
    // Run all dashboards in parallel
    const [activityDashboard, financialDashboard, collectionDashboard] = await Promise.all([
        activityAnalytics.getActivityDashboard(days),
        financialAnalytics.getFinancialDashboard(days),
        collectionAnalytics.getCollectionDashboard(days)
    ]);
    
    res.json({
        success: true,
        data: {
            activity: activityDashboard,
            financial: financialDashboard,
            collection: collectionDashboard
        },
        meta: {
            period: `Last ${days} days`,
            sources: {
                activity: 'MongoDB activity_logs',
                financial: 'MySQL financial_records',
                collection: 'PostgreSQL books + transactions'
            }
        }
    });
}));

export default router;
