/**
 * Jobs Admin Routes
 * 
 * Admin endpoints for managing scheduled jobs:
 * - View job status and history
 * - Manually trigger jobs
 * - Run all jobs once
 * 
 * All endpoints require admin authentication
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { getJobStatus, triggerJob, runAllJobsOnce } from '../jobs/jobScheduler.js';
import { getJobExecutionHistory, getJobStatistics } from '../jobs/jobLogger.js';

const router = express.Router();

// Apply authentication to all job routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/jobs/status
 * Get status of all scheduled jobs
 */
router.get('/status', asyncHandler(async (req, res) => {
    const status = getJobStatus();
    
    res.json({
        success: true,
        data: status
    });
}));

/**
 * POST /api/jobs/trigger/:jobName
 * Manually trigger a specific job
 * 
 * Path params:
 * - jobName: fineCalculation, memberSuspension, or reservationExpiry
 */
router.post('/trigger/:jobName', asyncHandler(async (req, res) => {
    const { jobName } = req.params;
    
    const validJobs = ['fineCalculation', 'memberSuspension', 'reservationExpiry'];
    if (!validJobs.includes(jobName)) {
        return res.status(400).json({
            success: false,
            error: `Invalid job name. Must be one of: ${validJobs.join(', ')}`
        });
    }
    
    const result = await triggerJob(jobName);
    
    res.json({
        success: true,
        data: result,
        message: `Job ${jobName} executed successfully`
    });
}));

/**
 * POST /api/jobs/run-all
 * Run all jobs once immediately
 */
router.post('/run-all', asyncHandler(async (req, res) => {
    const results = await runAllJobsOnce();
    
    const summary = results.map((result, index) => {
        const jobNames = ['fineCalculation', 'memberSuspension', 'reservationExpiry'];
        return {
            job: jobNames[index],
            status: result.status,
            result: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
        };
    });
    
    res.json({
        success: true,
        data: summary,
        message: 'All jobs executed'
    });
}));

/**
 * GET /api/jobs/history
 * Get job execution history from MongoDB
 * 
 * Query params:
 * - jobName: Filter by job name (optional)
 * - days: Number of days to look back (default: 7)
 * - limit: Maximum records to return (default: 100)
 */
router.get('/history', asyncHandler(async (req, res) => {
    const jobName = req.query.jobName || null;
    const days = parseInt(req.query.days, 10) || 7;
    const limit = parseInt(req.query.limit, 10) || 100;
    
    const history = await getJobExecutionHistory(jobName, days, limit);
    
    res.json({
        success: true,
        data: history,
        meta: {
            jobName,
            period: `Last ${days} days`,
            limit
        }
    });
}));

/**
 * GET /api/jobs/statistics
 * Get job execution statistics
 * 
 * Query params:
 * - days: Number of days to analyze (default: 30)
 */
router.get('/statistics', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    
    const statistics = await getJobStatistics(days);
    
    res.json({
        success: true,
        data: statistics
    });
}));

export default router;
