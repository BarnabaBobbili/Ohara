/**
 * Member Suspension Job
 * 
 * Runs daily to auto-suspend members who exceed the fine threshold
 * Calls the PostgreSQL stored procedure sp_auto_suspend_members()
 * 
 * Schedule: Daily at 3:00 AM IST
 */

import { autoSuspendMembers } from '../db/postgresProcs.js';
import { formatDateTimeIndian, formatNumberIndian } from '../utils/indianLocale.js';

/**
 * Execute the member suspension job
 * @returns {Promise<Object>} Job execution result
 */
export const executeMemberSuspensionJob = async () => {
    const startTime = Date.now();
    const executedAt = new Date();
    console.log(`[CRON] Starting member suspension job at ${formatDateTimeIndian(executedAt)}...`);
    
    try {
        const result = await autoSuspendMembers();
        
        const duration = Date.now() - startTime;
        
        if (result.success) {
            console.log(`[CRON] ✓ Member suspension completed in ${duration}ms`);
            console.log(`[CRON]   - Members suspended: ${formatNumberIndian(result.membersSuspended)}`);
            console.log(`[CRON]   - ${result.message}`);
            
            return {
                success: true,
                jobName: 'memberSuspension',
                executedAt,
                executedAt_formatted: formatDateTimeIndian(executedAt),
                duration,
                result: {
                    membersSuspended: result.membersSuspended,
                    membersSuspended_formatted: formatNumberIndian(result.membersSuspended),
                    message: result.message
                }
            };
        } else {
            console.error(`[CRON] ✗ Member suspension failed: ${result.message}`);
            
            return {
                success: false,
                jobName: 'memberSuspension',
                executedAt,
                executedAt_formatted: formatDateTimeIndian(executedAt),
                duration,
                error: result.message
            };
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[CRON] ✗ Member suspension job error:`, error.message);
        
        return {
            success: false,
            jobName: 'memberSuspension',
            executedAt,
            executedAt_formatted: formatDateTimeIndian(executedAt),
            duration,
            error: error.message
        };
    }
};

export default {
    executeMemberSuspensionJob
};
