/**
 * Job Scheduler
 * 
 * Manages scheduled jobs using node-cron for the Library Management System.
 * 
 * Jobs:
 * 1. Fine Calculation - Daily at 2:00 AM IST (calculates overdue fines)
 * 2. Member Suspension - Daily at 3:00 AM IST (auto-suspends members with high fines)
 * 3. Reservation Expiry - Daily at 4:00 AM IST (expires unclaimed reservations)
 * 
 * All times are in IST (Asia/Kolkata) unless configured otherwise
 */

import cron from 'node-cron';
import { executeFineCalculationJob } from './fineCalculationJob.js';
import { executeMemberSuspensionJob } from './memberSuspensionJob.js';
import { executeReservationExpiryJob } from './reservationExpiryJob.js';
import { logJobExecution, getJobExecutionHistory, getJobStatistics } from './jobLogger.js';
import { formatDateTimeIndian } from '../utils/indianLocale.js';

// Job execution tracking
const jobHistory = {
    fineCalculation: { lastRun: null, lastResult: null },
    memberSuspension: { lastRun: null, lastResult: null },
    reservationExpiry: { lastRun: null, lastResult: null }
};

// Track active cron jobs
const activeCronJobs = [];

/**
 * Initialize and start all scheduled jobs
 */
export const startScheduledJobs = () => {
    const isEnabled = process.env.ENABLE_SCHEDULED_JOBS !== 'false';
    
    if (!isEnabled) {
        console.log('[SCHEDULER] Scheduled jobs are disabled (ENABLE_SCHEDULED_JOBS=false)');
        return;
    }
    
    console.log('='.repeat(60));
    console.log('[SCHEDULER] Initializing scheduled jobs...');
    console.log('='.repeat(60));
    
    // Job 1: Fine Calculation - Daily at 2:00 AM
    const fineCalculationSchedule = process.env.FINE_CALC_CRON || '0 2 * * *';
    const fineCalculationJob = cron.schedule(fineCalculationSchedule, async () => {
        const result = await executeFineCalculationJob();
        jobHistory.fineCalculation.lastRun = result.executedAt;
        jobHistory.fineCalculation.lastResult = result;
        await logJobExecution(result);  // Log to MongoDB
    }, {
        scheduled: true,
        timezone: process.env.TIMEZONE || 'Asia/Kolkata'
    });
    
    activeCronJobs.push({
        name: 'fineCalculation',
        schedule: fineCalculationSchedule,
        job: fineCalculationJob
    });
    
    console.log(`[SCHEDULER] ✓ Fine Calculation Job scheduled: ${fineCalculationSchedule}`);
    
    // Job 2: Member Suspension - Daily at 3:00 AM
    const memberSuspensionSchedule = process.env.MEMBER_SUSPEND_CRON || '0 3 * * *';
    const memberSuspensionJob = cron.schedule(memberSuspensionSchedule, async () => {
        const result = await executeMemberSuspensionJob();
        jobHistory.memberSuspension.lastRun = result.executedAt;
        jobHistory.memberSuspension.lastResult = result;
        await logJobExecution(result);  // Log to MongoDB
    }, {
        scheduled: true,
        timezone: process.env.TIMEZONE || 'Asia/Kolkata'
    });
    
    activeCronJobs.push({
        name: 'memberSuspension',
        schedule: memberSuspensionSchedule,
        job: memberSuspensionJob
    });
    
    console.log(`[SCHEDULER] ✓ Member Suspension Job scheduled: ${memberSuspensionSchedule}`);
    
    // Job 3: Reservation Expiry - Daily at 4:00 AM
    const reservationExpirySchedule = process.env.RESERVATION_EXPIRY_CRON || '0 4 * * *';
    const reservationExpiryJob = cron.schedule(reservationExpirySchedule, async () => {
        const result = await executeReservationExpiryJob();
        jobHistory.reservationExpiry.lastRun = result.executedAt;
        jobHistory.reservationExpiry.lastResult = result;
        await logJobExecution(result);  // Log to MongoDB
    }, {
        scheduled: true,
        timezone: process.env.TIMEZONE || 'Asia/Kolkata'
    });
    
    activeCronJobs.push({
        name: 'reservationExpiry',
        schedule: reservationExpirySchedule,
        job: reservationExpiryJob
    });
    
    console.log(`[SCHEDULER] ✓ Reservation Expiry Job scheduled: ${reservationExpirySchedule}`);
    
    console.log('='.repeat(60));
    console.log(`[SCHEDULER] ${activeCronJobs.length} scheduled jobs are now active`);
    console.log(`[SCHEDULER] Timezone: ${process.env.TIMEZONE || 'Asia/Kolkata'}`);
    console.log('='.repeat(60));
};

/**
 * Stop all scheduled jobs gracefully
 */
export const stopScheduledJobs = () => {
    console.log('[SCHEDULER] Stopping all scheduled jobs...');
    
    activeCronJobs.forEach(({ name, job }) => {
        job.stop();
        console.log(`[SCHEDULER] ✓ Stopped job: ${name}`);
    });
    
    activeCronJobs.length = 0;
    console.log('[SCHEDULER] All scheduled jobs stopped');
};

/**
 * Get job execution history and status
 * @returns {Object} Job history and status
 */
export const getJobStatus = () => {
    const now = new Date();
    return {
        enabled: process.env.ENABLE_SCHEDULED_JOBS !== 'false',
        timezone: process.env.TIMEZONE || 'Asia/Kolkata',
        currentTime: now,
        currentTime_formatted: formatDateTimeIndian(now),
        activeJobs: activeCronJobs.map(({ name, schedule }) => ({ name, schedule })),
        history: Object.fromEntries(
            Object.entries(jobHistory).map(([name, data]) => [
                name,
                {
                    ...data,
                    lastRun_formatted: data.lastRun ? formatDateTimeIndian(data.lastRun) : null
                }
            ])
        )
    };
};

/**
 * Manually trigger a specific job (for testing or admin use)
 * @param {string} jobName - Name of the job to execute
 * @returns {Promise<Object>} Job execution result
 */
export const triggerJob = async (jobName) => {
    console.log(`[SCHEDULER] Manually triggering job: ${jobName}`);
    
    let result;
    
    switch (jobName) {
        case 'fineCalculation':
            result = await executeFineCalculationJob();
            jobHistory.fineCalculation.lastRun = result.executedAt;
            jobHistory.fineCalculation.lastResult = result;
            break;
            
        case 'memberSuspension':
            result = await executeMemberSuspensionJob();
            jobHistory.memberSuspension.lastRun = result.executedAt;
            jobHistory.memberSuspension.lastResult = result;
            break;
            
        case 'reservationExpiry':
            result = await executeReservationExpiryJob();
            jobHistory.reservationExpiry.lastRun = result.executedAt;
            jobHistory.reservationExpiry.lastResult = result;
            break;
            
        default:
            throw new Error(`Unknown job name: ${jobName}`);
    }
    
    // Log to MongoDB
    await logJobExecution(result);
    
    return result;
};

/**
 * Run all jobs once (useful for initial setup or testing)
 * @returns {Promise<Object[]>} Results from all jobs
 */
export const runAllJobsOnce = async () => {
    console.log('[SCHEDULER] Running all jobs once...');
    
    const results = await Promise.allSettled([
        executeFineCalculationJob(),
        executeMemberSuspensionJob(),
        executeReservationExpiryJob()
    ]);
    
    const jobNames = ['fineCalculation', 'memberSuspension', 'reservationExpiry'];
    
    for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const jobName = jobNames[index];
        
        if (result.status === 'fulfilled') {
            jobHistory[jobName].lastRun = result.value.executedAt;
            jobHistory[jobName].lastResult = result.value;
            await logJobExecution(result.value);  // Log to MongoDB
        } else {
            console.error(`[SCHEDULER] Job ${jobName} failed:`, result.reason);
            // Log failure to MongoDB
            await logJobExecution({
                jobName,
                success: false,
                executedAt: new Date(),
                error: result.reason?.message || 'Unknown error'
            });
        }
    }
    
    return results;
};

export default {
    startScheduledJobs,
    stopScheduledJobs,
    getJobStatus,
    triggerJob,
    runAllJobsOnce
};
