/**
 * Financial Analytics using MySQL Aggregations
 * 
 * This module provides financial analytics using MySQL aggregation queries
 * for the financial_records and audit_trail tables.
 * 
 * Tables used:
 * - financial_records: Fines, payments, waivers, refunds (immutable ledger)
 *   Columns: id, member_id, transaction_type, amount, description, pg_transaction_id, processed_by, created_at
 * - audit_trail: Book change audit trail
 *   Columns: id, book_id, action, field_name, old_value, new_value, changed_by, changed_at, metadata
 * 
 * All responses include Indian locale formatted values (_formatted suffix)
 * - Currency: ₹ with lakhs/crores notation
 * - Dates: DD/MM/YYYY format with IST timezone
 */

import { getMySQLPool } from './mysql.js';
import { DatabaseError } from '../utils/customErrors.js';
import {
    formatCurrencyINR,
    formatDateIndian,
    formatDateTimeIndian,
    formatNumberIndian,
    formatPercentageIndian,
    getRelativeTimeIndian,
    getFiscalYearIndian
} from '../utils/indianLocale.js';

const toSafePositiveInt = (value, fallback, min = 1, max = 1000) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
};

/**
 * Get financial summary by transaction type
 * Groups financial records by type and calculates totals
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Array>} Array of {type, total, count, avgAmount}
 */
export const getFinancialSummaryByType = async (days = 30) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        
        const query = `
            SELECT 
                transaction_type AS type,
                COUNT(*) AS count,
                SUM(amount) AS total,
                AVG(amount) AS avgAmount,
                MIN(amount) AS minAmount,
                MAX(amount) AS maxAmount,
                MAX(created_at) AS latestTransaction
            FROM financial_records
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY transaction_type
            ORDER BY total DESC
        `;
        
        const [rows] = await pool.execute(query, [days]);
        
        return rows.map(row => ({
            type: row.type,
            count: Number(row.count) || 0,
            count_formatted: formatNumberIndian(Number(row.count) || 0),
            total: parseFloat(row.total || 0).toFixed(2),
            total_formatted: formatCurrencyINR(parseFloat(row.total || 0)),
            avgAmount: parseFloat(row.avgAmount || 0).toFixed(2),
            avgAmount_formatted: formatCurrencyINR(parseFloat(row.avgAmount || 0)),
            minAmount: parseFloat(row.minAmount || 0).toFixed(2),
            minAmount_formatted: formatCurrencyINR(parseFloat(row.minAmount || 0)),
            maxAmount: parseFloat(row.maxAmount || 0).toFixed(2),
            maxAmount_formatted: formatCurrencyINR(parseFloat(row.maxAmount || 0)),
            latestTransaction: row.latestTransaction,
            latestTransaction_formatted: formatDateTimeIndian(row.latestTransaction),
            latestTransaction_relative: getRelativeTimeIndian(row.latestTransaction)
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get financial summary: ${error.message}`);
    }
};

/**
 * Get daily financial trends for time-series analysis
 * Shows daily totals by transaction type
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Array>} Array of {date, fines, payments, waivers, netRevenue}
 */
export const getDailyFinancialTrend = async (days = 30) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        
        const query = `
            SELECT 
                DATE(created_at) AS date,
                SUM(CASE WHEN transaction_type = 'fine' THEN amount ELSE 0 END) AS fines,
                SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) AS payments,
                SUM(CASE WHEN transaction_type = 'waiver' THEN amount ELSE 0 END) AS waivers,
                SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END) AS refunds,
                SUM(CASE WHEN transaction_type = 'payment' THEN amount 
                         WHEN transaction_type IN ('refund', 'waiver') THEN -amount 
                         ELSE 0 END) AS netRevenue,
                COUNT(*) AS transactionCount
            FROM financial_records
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;
        
        const [rows] = await pool.execute(query, [days]);
        
        return rows.map(row => ({
            date: row.date,
            date_formatted: formatDateIndian(row.date),
            fines: parseFloat(row.fines || 0).toFixed(2),
            fines_formatted: formatCurrencyINR(parseFloat(row.fines || 0)),
            payments: parseFloat(row.payments || 0).toFixed(2),
            payments_formatted: formatCurrencyINR(parseFloat(row.payments || 0)),
            waivers: parseFloat(row.waivers || 0).toFixed(2),
            waivers_formatted: formatCurrencyINR(parseFloat(row.waivers || 0)),
            refunds: parseFloat(row.refunds || 0).toFixed(2),
            refunds_formatted: formatCurrencyINR(parseFloat(row.refunds || 0)),
            netRevenue: parseFloat(row.netRevenue || 0).toFixed(2),
            netRevenue_formatted: formatCurrencyINR(parseFloat(row.netRevenue || 0)),
            transactionCount: Number(row.transactionCount) || 0,
            transactionCount_formatted: formatNumberIndian(Number(row.transactionCount) || 0)
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get daily financial trend: ${error.message}`);
    }
};

/**
 * Get top members by total fines
 * Identifies members with highest fine amounts
 * Note: Only member_id is available in financial_records, member details need to be joined from PostgreSQL
 * 
 * @param {number} days - Number of days to analyze (default: 90)
 * @param {number} limit - Number of top members to return (default: 20)
 * @returns {Promise<Array>} Array of {memberId, totalFines, fineCount, totalPaid}
 */
export const getTopMembersByFines = async (days = 90, limit = 20) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        const safeDays = toSafePositiveInt(days, 90, 1, 3650);
        const safeLimit = toSafePositiveInt(limit, 20, 1, 500);
        
        const query = `
            SELECT 
                member_id AS memberId,
                SUM(CASE WHEN transaction_type = 'fine' THEN amount ELSE 0 END) AS totalFines,
                SUM(CASE WHEN transaction_type = 'fine' THEN 1 ELSE 0 END) AS fineCount,
                SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) AS totalPaid,
                SUM(CASE WHEN transaction_type = 'waiver' THEN amount ELSE 0 END) AS totalWaived,
                COUNT(*) AS totalTransactions,
                MAX(created_at) AS latestTransaction
            FROM financial_records
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY member_id
            HAVING totalFines > 0
            ORDER BY totalFines DESC
            LIMIT ${safeLimit}
        `;
        
        const [rows] = await pool.execute(query, [safeDays]);
        
        return rows.map(row => {
            const totalFines = parseFloat(row.totalFines || 0);
            const totalPaid = parseFloat(row.totalPaid || 0);
            const totalWaived = parseFloat(row.totalWaived || 0);
            const outstandingBalance = totalFines - totalPaid - totalWaived;
            
            return {
                memberId: row.memberId,
                totalFines: totalFines.toFixed(2),
                totalFines_formatted: formatCurrencyINR(totalFines),
                fineCount: Number(row.fineCount) || 0,
                fineCount_formatted: formatNumberIndian(Number(row.fineCount) || 0),
                totalPaid: totalPaid.toFixed(2),
                totalPaid_formatted: formatCurrencyINR(totalPaid),
                totalWaived: totalWaived.toFixed(2),
                totalWaived_formatted: formatCurrencyINR(totalWaived),
                outstandingBalance: outstandingBalance.toFixed(2),
                outstandingBalance_formatted: formatCurrencyINR(outstandingBalance),
                totalTransactions: Number(row.totalTransactions) || 0,
                totalTransactions_formatted: formatNumberIndian(Number(row.totalTransactions) || 0),
                latestTransaction: row.latestTransaction,
                latestTransaction_formatted: formatDateTimeIndian(row.latestTransaction),
                latestTransaction_relative: getRelativeTimeIndian(row.latestTransaction)
            };
        });
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get top members by fines: ${error.message}`);
    }
};

/**
 * Get payment breakdown by processed_by (staff who processed payments)
 * Shows distribution of payments processed by each staff member
 * Note: payment_method column doesn't exist in current schema
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Array>} Array of {processedBy, count, total, percentage}
 */
export const getPaymentsByProcessor = async (days = 30) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        
        const query = `
            SELECT 
                COALESCE(processed_by, 'system') AS processedBy,
                COUNT(*) AS count,
                SUM(amount) AS total,
                AVG(amount) AS avgAmount
            FROM financial_records
            WHERE transaction_type = 'payment'
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY processed_by
            ORDER BY total DESC
        `;
        
        const [rows] = await pool.execute(query, [days]);
        
        const totalAmount = rows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0);
        
        return rows.map(row => ({
            processedBy: row.processedBy,
            count: Number(row.count) || 0,
            count_formatted: formatNumberIndian(Number(row.count) || 0),
            total: parseFloat(row.total || 0).toFixed(2),
            total_formatted: formatCurrencyINR(parseFloat(row.total || 0)),
            avgAmount: parseFloat(row.avgAmount || 0).toFixed(2),
            avgAmount_formatted: formatCurrencyINR(parseFloat(row.avgAmount || 0)),
            percentage: totalAmount > 0 
                ? ((parseFloat(row.total || 0) / totalAmount) * 100).toFixed(2)
                : '0.00',
            percentage_formatted: formatPercentageIndian(totalAmount > 0 
                ? ((parseFloat(row.total || 0) / totalAmount) * 100)
                : 0)
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get payments by processor: ${error.message}`);
    }
};

/**
 * Get fines linked to PostgreSQL transactions
 * Shows fines with their associated pg_transaction_id
 * 
 * @param {number} days - Number of days to analyze (default: 90)
 * @param {number} limit - Number of records to return (default: 50)
 * @returns {Promise<Array>} Array of fine records with transaction references
 */
export const getFinesWithTransactionLinks = async (days = 90, limit = 50) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        const safeDays = toSafePositiveInt(days, 90, 1, 3650);
        const safeLimit = toSafePositiveInt(limit, 50, 1, 1000);
        
        const query = `
            SELECT 
                id,
                member_id AS memberId,
                amount,
                description,
                pg_transaction_id AS pgTransactionId,
                processed_by AS processedBy,
                created_at AS createdAt
            FROM financial_records
            WHERE transaction_type = 'fine'
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY amount DESC
            LIMIT ${safeLimit}
        `;
        
        const [rows] = await pool.execute(query, [safeDays]);
        
        return rows.map(row => ({
            id: row.id,
            memberId: row.memberId,
            amount: parseFloat(row.amount).toFixed(2),
            amount_formatted: formatCurrencyINR(parseFloat(row.amount)),
            description: row.description,
            pgTransactionId: row.pgTransactionId,
            processedBy: row.processedBy,
            createdAt: row.createdAt,
            createdAt_formatted: formatDateTimeIndian(row.createdAt),
            createdAt_relative: getRelativeTimeIndian(row.createdAt)
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get fines with transaction links: ${error.message}`);
    }
};

/**
 * Get monthly revenue report
 * Summarizes revenue by month for financial reporting
 * 
 * @param {number} months - Number of months to analyze (default: 12)
 * @returns {Promise<Array>} Array of {month, year, revenue, expenses, net}
 */
export const getMonthlyRevenueReport = async (months = 12) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        
        const query = `
            SELECT 
                YEAR(created_at) AS year,
                MONTH(created_at) AS month,
                DATE_FORMAT(created_at, '%Y-%m') AS monthYear,
                SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) AS revenue,
                SUM(CASE WHEN transaction_type IN ('refund', 'waiver') THEN amount ELSE 0 END) AS expenses,
                SUM(CASE WHEN transaction_type = 'payment' THEN amount 
                         WHEN transaction_type IN ('refund', 'waiver') THEN -amount 
                         ELSE 0 END) AS net,
                COUNT(*) AS transactionCount
            FROM financial_records
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY year DESC, month DESC
        `;
        
        const [rows] = await pool.execute(query, [months]);
        
        return rows.map(row => ({
            year: row.year,
            month: row.month,
            monthYear: row.monthYear,
            fiscalYear: getFiscalYearIndian(new Date(row.year, row.month - 1, 1)),
            revenue: parseFloat(row.revenue || 0).toFixed(2),
            revenue_formatted: formatCurrencyINR(parseFloat(row.revenue || 0)),
            expenses: parseFloat(row.expenses || 0).toFixed(2),
            expenses_formatted: formatCurrencyINR(parseFloat(row.expenses || 0)),
            net: parseFloat(row.net || 0).toFixed(2),
            net_formatted: formatCurrencyINR(parseFloat(row.net || 0)),
            transactionCount: Number(row.transactionCount) || 0,
            transactionCount_formatted: formatNumberIndian(Number(row.transactionCount) || 0)
        }));
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get monthly revenue report: ${error.message}`);
    }
};

/**
 * Get comprehensive financial dashboard
 * Combines multiple metrics for overview
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} Dashboard object with financial metrics
 */
export const getFinancialDashboard = async (days = 30) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        
        // Get summary metrics
        const summaryQuery = `
            SELECT 
                COUNT(*) AS totalTransactions,
                SUM(CASE WHEN transaction_type = 'fine' THEN amount ELSE 0 END) AS totalFines,
                SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) AS totalPayments,
                SUM(CASE WHEN transaction_type = 'waiver' THEN amount ELSE 0 END) AS totalWaivers,
                SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END) AS totalRefunds,
                COUNT(DISTINCT member_id) AS uniqueMembers,
                AVG(CASE WHEN transaction_type = 'payment' THEN amount END) AS avgPayment
            FROM financial_records
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        
        // Get recent high-value transactions
        const recentQuery = `
            SELECT 
                id,
                member_id AS memberId,
                transaction_type AS type,
                amount,
                description,
                processed_by AS processedBy,
                created_at AS createdAt
            FROM financial_records
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY amount DESC
            LIMIT 10
        `;
        
        const [summaryRows] = await pool.execute(summaryQuery, [days]);
        const [recentRows] = await pool.execute(recentQuery, [days]);
        
        const summary = summaryRows[0];
        const totalPayments = parseFloat(summary.totalPayments || 0);
        const totalRefunds = parseFloat(summary.totalRefunds || 0);
        const totalWaivers = parseFloat(summary.totalWaivers || 0);
        const totalFines = parseFloat(summary.totalFines || 0);
        const netRevenue = totalPayments - totalRefunds - totalWaivers;
        
        const collectionRate = totalFines > 0
            ? ((totalPayments / totalFines) * 100).toFixed(2)
            : '0.00';
        
        return {
            period: `Last ${days} days`,
            summary: {
                totalTransactions: Number(summary.totalTransactions) || 0,
                totalTransactions_formatted: formatNumberIndian(Number(summary.totalTransactions) || 0),
                totalFines: totalFines.toFixed(2),
                totalFines_formatted: formatCurrencyINR(totalFines),
                totalPayments: totalPayments.toFixed(2),
                totalPayments_formatted: formatCurrencyINR(totalPayments),
                totalWaivers: totalWaivers.toFixed(2),
                totalWaivers_formatted: formatCurrencyINR(totalWaivers),
                totalRefunds: totalRefunds.toFixed(2),
                totalRefunds_formatted: formatCurrencyINR(totalRefunds),
                netRevenue: netRevenue.toFixed(2),
                netRevenue_formatted: formatCurrencyINR(netRevenue),
                uniqueMembers: Number(summary.uniqueMembers) || 0,
                uniqueMembers_formatted: formatNumberIndian(Number(summary.uniqueMembers) || 0),
                avgPayment: parseFloat(summary.avgPayment || 0).toFixed(2),
                avgPayment_formatted: formatCurrencyINR(parseFloat(summary.avgPayment || 0)),
                collectionRate: collectionRate,
                collectionRate_formatted: formatPercentageIndian(parseFloat(collectionRate))
            },
            recentHighValueTransactions: recentRows.map(row => ({
                id: row.id,
                memberId: row.memberId,
                type: row.type,
                amount: parseFloat(row.amount).toFixed(2),
                amount_formatted: formatCurrencyINR(parseFloat(row.amount)),
                description: row.description,
                processedBy: row.processedBy,
                createdAt: row.createdAt,
                createdAt_formatted: formatDateTimeIndian(row.createdAt),
                createdAt_relative: getRelativeTimeIndian(row.createdAt)
            }))
        };
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get financial dashboard: ${error.message}`);
    }
};

/**
 * Get waiver statistics and analysis
 * Analyzes fine waivers for compliance and trend monitoring
 * 
 * @param {number} days - Number of days to analyze (default: 90)
 * @returns {Promise<Object>} Waiver statistics object
 */
export const getWaiverAnalysis = async (days = 90) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        
        const query = `
            SELECT 
                COALESCE(processed_by, 'system') AS staffEmail,
                COUNT(*) AS staffWaiverCount,
                SUM(amount) AS staffWaivedAmount,
                COUNT(DISTINCT member_id) AS uniqueMembers
            FROM financial_records
            WHERE transaction_type = 'waiver'
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY processed_by
            ORDER BY staffWaivedAmount DESC
        `;
        
        const [rows] = await pool.execute(query, [days]);
        
        const totalWaivedAmount = rows.reduce((sum, row) => sum + parseFloat(row.staffWaivedAmount || 0), 0);
        const totalWaivers = rows.reduce((sum, row) => sum + Number(row.staffWaiverCount), 0);
        const totalUniqueMembers = rows.reduce((sum, row) => sum + Number(row.uniqueMembers || 0), 0);
        
        return {
            period: `Last ${days} days`,
            summary: {
                totalWaivers,
                totalWaivers_formatted: formatNumberIndian(totalWaivers),
                totalWaivedAmount: totalWaivedAmount.toFixed(2),
                totalWaivedAmount_formatted: formatCurrencyINR(totalWaivedAmount),
                avgWaiverAmount: totalWaivers > 0 ? (totalWaivedAmount / totalWaivers).toFixed(2) : '0.00',
                avgWaiverAmount_formatted: formatCurrencyINR(totalWaivers > 0 ? (totalWaivedAmount / totalWaivers) : 0),
                uniqueMembers: totalUniqueMembers,
                uniqueMembers_formatted: formatNumberIndian(totalUniqueMembers),
                uniqueStaff: rows.length
            },
            byStaff: rows.map(row => {
                const waiverCount = Number(row.staffWaiverCount) || 0;
                const waivedAmount = parseFloat(row.staffWaivedAmount || 0);
                const avgWaiver = waiverCount > 0 ? waivedAmount / waiverCount : 0;
                
                return {
                    staffEmail: row.staffEmail,
                    waiverCount,
                    waiverCount_formatted: formatNumberIndian(waiverCount),
                    totalWaived: waivedAmount.toFixed(2),
                    totalWaived_formatted: formatCurrencyINR(waivedAmount),
                    avgWaiver: avgWaiver.toFixed(2),
                    avgWaiver_formatted: formatCurrencyINR(avgWaiver),
                    percentageOfTotal: totalWaivedAmount > 0 
                        ? ((waivedAmount / totalWaivedAmount) * 100).toFixed(2)
                        : '0.00',
                    percentageOfTotal_formatted: formatPercentageIndian(totalWaivedAmount > 0 
                        ? ((waivedAmount / totalWaivedAmount) * 100)
                        : 0)
                };
            })
        };
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get waiver analysis: ${error.message}`);
    }
};

/**
 * Get book audit trail summary from audit_trail table
 * Analyzes book changes for audit purposes
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} Audit trail summary
 */
export const getBookAuditSummary = async (days = 30) => {
    try {
        const pool = getMySQLPool();
        if (!pool) {
            throw new DatabaseError('MySQL connection not available');
        }
        
        const query = `
            SELECT 
                action,
                COUNT(*) AS count,
                COUNT(DISTINCT book_id) AS uniqueBooks,
                COUNT(DISTINCT changed_by) AS uniqueUsers,
                MAX(changed_at) AS latestChange
            FROM audit_trail
            WHERE changed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY action
            ORDER BY count DESC
        `;
        
        const [rows] = await pool.execute(query, [days]);
        
        return {
            period: `Last ${days} days`,
            breakdown: rows.map(row => ({
                action: row.action,
                count: Number(row.count) || 0,
                count_formatted: formatNumberIndian(Number(row.count) || 0),
                uniqueBooks: Number(row.uniqueBooks) || 0,
                uniqueBooks_formatted: formatNumberIndian(Number(row.uniqueBooks) || 0),
                uniqueUsers: Number(row.uniqueUsers) || 0,
                uniqueUsers_formatted: formatNumberIndian(Number(row.uniqueUsers) || 0),
                latestChange: row.latestChange,
                latestChange_formatted: formatDateTimeIndian(row.latestChange),
                latestChange_relative: getRelativeTimeIndian(row.latestChange)
            }))
        };
    } catch (error) {
        if (error instanceof DatabaseError) throw error;
        throw new DatabaseError(`Failed to get book audit summary: ${error.message}`);
    }
};

export default {
    getFinancialSummaryByType,
    getDailyFinancialTrend,
    getTopMembersByFines,
    getPaymentsByProcessor,
    getFinesWithTransactionLinks,
    getMonthlyRevenueReport,
    getFinancialDashboard,
    getWaiverAnalysis,
    getBookAuditSummary
};
