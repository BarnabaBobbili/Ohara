/**
 * Fine Calculation Job
 * 
 * Runs daily to calculate overdue fines for all borrowed books
 * Calls the PostgreSQL stored procedure sp_calculate_overdue_fines()
 * 
 * Schedule: Daily at 2:00 AM IST
 */

import { calculateOverdueFines } from '../db/postgresProcs.js';
import { formatDateTimeIndian, formatCurrencyINR, formatNumberIndian } from '../utils/indianLocale.js';

/**
 * Execute the fine calculation job
 * @returns {Promise<Object>} Job execution result
 */
export const executeFineCalculationJob = async () => {
    const startTime = Date.now();
    const executedAt = new Date();
    console.log(`[CRON] Starting fine calculation job at ${formatDateTimeIndian(executedAt)}...`);
    
    try {
        const result = await calculateOverdueFines();
        
        const duration = Date.now() - startTime;
        
        if (result.success) {
            console.log(`[CRON] ✓ Fine calculation completed in ${duration}ms`);
            console.log(`[CRON]   - Fines calculated: ${formatNumberIndian(result.finesCalculated)}`);
            console.log(`[CRON]   - Total amount: ${formatCurrencyINR(result.totalAmount)}`);
            console.log(`[CRON]   - ${result.message}`);
            
            return {
                success: true,
                jobName: 'fineCalculation',
                executedAt,
                executedAt_formatted: formatDateTimeIndian(executedAt),
                duration,
                result: {
                    finesCalculated: result.finesCalculated,
                    finesCalculated_formatted: formatNumberIndian(result.finesCalculated),
                    totalAmount: result.totalAmount,
                    totalAmount_formatted: formatCurrencyINR(result.totalAmount),
                    message: result.message
                }
            };
        } else {
            console.error(`[CRON] ✗ Fine calculation failed: ${result.message}`);
            
            return {
                success: false,
                jobName: 'fineCalculation',
                executedAt,
                executedAt_formatted: formatDateTimeIndian(executedAt),
                duration,
                error: result.message
            };
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[CRON] ✗ Fine calculation job error:`, error.message);
        
        return {
            success: false,
            jobName: 'fineCalculation',
            executedAt,
            executedAt_formatted: formatDateTimeIndian(executedAt),
            duration,
            error: error.message
        };
    }
};

export default {
    executeFineCalculationJob
};
