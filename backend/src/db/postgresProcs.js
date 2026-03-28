/**
 * PostgreSQL Stored Procedure Execution Wrapper
 * Provides convenient methods to call PL/pgSQL procedures with exception handling
 */

import prisma from './prisma.js';
import { BusinessRuleError, DatabaseError, NotFoundError } from '../utils/customErrors.js';

/**
 * Error code mapping for PL/pgSQL RAISE EXCEPTION
 */
const PROCEDURE_ERROR_MAP = {
    'BOOK_NOT_FOUND': 'Book not found',
    'BOOK_NOT_ACTIVE': 'Book is not active',
    'MEMBER_NOT_FOUND': 'Member not found',
    'MEMBER_SUSPENDED': 'Member account is suspended or inactive',
    'MEMBER_NOT_ACTIVE': 'Member account is not active',
    'LIMIT_EXCEEDED': 'Member has reached borrowing limit',
    'NO_COPIES_AVAILABLE': 'No copies available for checkout',
    'DUPLICATE_CHECKOUT': 'Member already has this book checked out',
    'DUPLICATE_RESERVATION': 'Member already has an active reservation for this book',
    'BOOK_ALREADY_BORROWED': 'Member currently has this book borrowed',
    'RESERVATION_LIMIT_EXCEEDED': 'Maximum reservation limit reached',
    'REFERENCE_ONLY': 'This is a reference-only book and cannot be borrowed',
    'OUTSTANDING_FINES_EXCEED_LIMIT': 'Outstanding fines exceed the allowed limit',
    'TRANSACTION_NOT_FOUND': 'Transaction not found',
    'TRANSACTION_NOT_ACTIVE': 'Transaction is not active',
    'ALREADY_RETURNED': 'Book has already been returned',
    'INVALID_CONDITION': 'Invalid return condition specified',
    'MAX_RENEWALS_EXCEEDED': 'Maximum number of renewals exceeded',
    'RESERVATION_EXISTS': 'Book has pending reservations by other members',
    'RESERVATION_NOT_FOUND': 'Reservation not found',
    'INVALID_RESERVATION_STATUS': 'Cannot perform this action on reservation with current status',
    'UNAUTHORIZED': 'You are not authorized to perform this action',
    'INVALID_AMOUNT': 'Invalid amount specified',
    'AMOUNT_EXCEEDS_FINES': 'Amount exceeds outstanding fines',
    'REASON_TOO_SHORT': 'Reason must be at least 10 characters',
    'INVALID_PAYMENT_METHOD': 'Invalid payment method'
};

/**
 * Execute a stored procedure with exception handling
 * @param {string} procedureName - Name of the procedure
 * @param {Object} params - Named parameters for the procedure
 * @returns {Promise<Object>} Result from the procedure
 */
async function executeProcedure(procedureName, params) {
    try {
        // Call procedure using raw SQL
        const paramNames = Object.keys(params);
        const paramValues = Object.values(params);
        
        // Create parameter placeholders ($1, $2, etc.)
        const placeholders = paramValues.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `CALL ${procedureName}(${placeholders})`;
        
        const result = await prisma.$queryRawUnsafe(query, ...paramValues);
        
        return result;
    } catch (error) {
        // Handle PL/pgSQL RAISE EXCEPTION (error code P0001)
        if (error.code === 'P0001') {
            const errorMessage = error.message;
            const friendlyMessage = PROCEDURE_ERROR_MAP[errorMessage] || errorMessage;
            throw new BusinessRuleError(friendlyMessage, errorMessage);
        }
        
        // Handle other database errors
        throw new DatabaseError('Procedure execution failed', error);
    }
}

/**
 * Execute a function and return the result
 * @param {string} functionName - Name of the function
 * @param {Array} params - Parameters for the function
 * @returns {Promise<Array>} Result rows from the function
 */
async function executeFunction(functionName, params = []) {
    try {
        const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
        const query = `SELECT * FROM ${functionName}(${placeholders})`;
        
        const result = await prisma.$queryRawUnsafe(query, ...params);
        return result;
    } catch (error) {
        throw new DatabaseError('Function execution failed', error);
    }
}

// ============================================================
// CIRCULATION PROCEDURES
// ============================================================

/**
 * Checkout a book with advanced validations
 * @param {number} bookId - Book ID
 * @param {number} memberId - Member ID
 * @param {number} staffId - Staff ID performing the checkout
 * @returns {Promise<Object>} Transaction details
 */
export async function checkoutBookAdvanced(bookId, memberId, staffId) {
    const result = await executeProcedure('sp_checkout_book_advanced', {
        p_book_id: bookId,
        p_member_id: memberId,
        p_staff_id: staffId,
        p_transaction_id: null,
        p_status: null,
        p_message: null
    });
    
    // The procedure returns the values in the result
    // Extract from the first row (procedures with INOUT params return a single row)
    const row = result[0] || {};
    
    if (row.p_status === 'ERROR') {
        throw new BusinessRuleError(row.p_message, 'CHECKOUT_FAILED');
    }
    
    return {
        transaction_id: row.p_transaction_id,
        status: row.p_status,
        message: row.p_message
    };
}

/**
 * Return a book with fine calculation
 * @param {number} transactionId - Transaction ID
 * @param {number} staffId - Staff ID processing the return
 * @param {string} returnCondition - Condition of the returned book
 * @returns {Promise<Object>} Return details with fine amount
 */
export async function returnBookAdvanced(transactionId, staffId, returnCondition) {
    const result = await executeProcedure('sp_return_book_advanced', {
        p_transaction_id: transactionId,
        p_staff_id: staffId,
        p_return_condition: returnCondition,
        p_fine_amount: 0.00,
        p_status: null,
        p_message: null
    });
    
    const row = result[0] || {};
    
    if (row.p_status === 'ERROR') {
        throw new BusinessRuleError(row.p_message, 'RETURN_FAILED');
    }
    
    return {
        fine_amount: parseFloat(row.p_fine_amount),
        status: row.p_status,
        message: row.p_message
    };
}

/**
 * Renew a loan
 * @param {number} transactionId - Transaction ID
 * @param {number} memberId - Member ID
 * @returns {Promise<Object>} Renewal details
 */
export async function renewLoan(transactionId, memberId) {
    const result = await executeProcedure('sp_renew_loan', {
        p_transaction_id: transactionId,
        p_member_id: memberId,
        p_new_due_date: null,
        p_status: null,
        p_message: null
    });
    
    const row = result[0] || {};
    
    if (row.p_status === 'ERROR') {
        throw new BusinessRuleError(row.p_message, 'RENEWAL_FAILED');
    }
    
    return {
        new_due_date: row.p_new_due_date,
        status: row.p_status,
        message: row.p_message
    };
}

/**
 * Mark a book as lost
 * @param {number} transactionId - Transaction ID
 * @param {number} staffId - Staff ID
 * @param {number} replacementCost - Cost to replace the book
 * @returns {Promise<Object>} Lost book processing details
 */
export async function markBookLost(transactionId, staffId, replacementCost) {
    const result = await executeProcedure('sp_mark_book_lost', {
        p_transaction_id: transactionId,
        p_staff_id: staffId,
        p_replacement_cost: replacementCost,
        p_status: null,
        p_message: null
    });
    
    const row = result[0] || {};
    
    if (row.p_status === 'ERROR') {
        throw new BusinessRuleError(row.p_message, 'MARK_LOST_FAILED');
    }
    
    return {
        status: row.p_status,
        message: row.p_message
    };
}

// ============================================================
// FINE MANAGEMENT PROCEDURES
// ============================================================

/**
 * Calculate overdue fines for all overdue books (batch job)
 * @returns {Promise<Object>} Count of updated transactions and total fines
 */
export async function calculateOverdueFines() {
    const result = await executeProcedure('sp_calculate_overdue_fines', {
        p_updated_count: 0,
        p_total_fines: 0.00
    });
    
    const row = result[0] || {};
    
    return {
        updated_count: row.p_updated_count || 0,
        total_fines: parseFloat(row.p_total_fines) || 0.00
    };
}

/**
 * Apply a fine waiver for a member
 * @param {number} memberId - Member ID
 * @param {number} amount - Amount to waive
 * @param {string} reason - Reason for waiver
 * @param {number} staffId - Staff ID applying the waiver
 * @returns {Promise<Object>} Waiver details
 */
export async function applyFineWaiver(memberId, amount, reason, staffId) {
    const result = await executeProcedure('sp_apply_fine_waiver', {
        p_member_id: memberId,
        p_amount: amount,
        p_reason: reason,
        p_staff_id: staffId,
        p_status: null,
        p_message: null
    });
    
    const row = result[0] || {};
    
    if (row.p_status === 'ERROR') {
        throw new BusinessRuleError(row.p_message, 'WAIVER_FAILED');
    }
    
    return {
        status: row.p_status,
        message: row.p_message
    };
}

/**
 * Process a fine payment
 * @param {number} memberId - Member ID
 * @param {number} amount - Payment amount
 * @param {string} paymentMethod - Payment method
 * @param {string} pgTransactionId - Payment gateway transaction ID
 * @param {number} processedBy - Staff ID processing the payment
 * @returns {Promise<Object>} Payment details
 */
export async function processPaymentAdvanced(memberId, amount, paymentMethod, pgTransactionId, processedBy) {
    const result = await executeProcedure('sp_process_payment_advanced', {
        p_member_id: memberId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_pg_transaction_id: pgTransactionId || '',
        p_processed_by: processedBy,
        p_remaining_balance: null,
        p_status: null,
        p_message: null
    });
    
    const row = result[0] || {};
    
    if (row.p_status === 'ERROR') {
        throw new BusinessRuleError(row.p_message, 'PAYMENT_FAILED');
    }
    
    return {
        remaining_balance: parseFloat(row.p_remaining_balance) || 0.00,
        status: row.p_status,
        message: row.p_message
    };
}

/**
 * Auto-suspend members with fines exceeding threshold (batch job)
 * @param {number} fineThreshold - Fine threshold (default: 50.00)
 * @returns {Promise<Object>} Count of suspended members
 */
export async function autoSuspendMembers(fineThreshold = 50.00) {
    const result = await executeProcedure('sp_auto_suspend_members', {
        p_fine_threshold: fineThreshold,
        p_suspended_count: 0
    });
    
    const row = result[0] || {};
    
    return {
        suspended_count: row.p_suspended_count || 0
    };
}

// ============================================================
// REPORTING FUNCTIONS
// ============================================================

/**
 * Get detailed fine breakdown for a member
 * @param {number} memberId - Member ID
 * @returns {Promise<Array>} Array of fine details
 */
export async function getMemberFineDetails(memberId) {
    const result = await executeFunction('fn_get_member_fine_details', [memberId]);
    return result;
}

/**
 * Get system-wide fine statistics
 * @returns {Promise<Object>} Fine statistics
 */
export async function getFineStatistics() {
    const result = await executeFunction('fn_get_fine_statistics', []);
    return result[0] || {};
}

// ============================================================
// RESERVATION MANAGEMENT PROCEDURES
// ============================================================

/**
 * Create a reservation for a book
 * @param {number} memberId - Member ID
 * @param {number} bookId - Book ID
 * @returns {Promise<Object>} Reservation result
 */
export async function createReservation(memberId, bookId) {
    const result = await prisma.$queryRaw`
        SELECT * FROM sp_create_reservation(
            ${memberId}::INT,
            ${bookId}::INT,
            'error'::VARCHAR,
            ''::TEXT,
            NULL::INT
        )
    `;
    
    const row = result[0];
    return {
        success: row.p_status === 'success',
        message: row.p_message,
        reservationId: row.p_reservation_id
    };
}

/**
 * Fulfill the next reservation in queue for a book
 * @param {number} bookId - Book ID
 * @returns {Promise<Object>} Fulfillment result
 */
export async function fulfillNextReservation(bookId) {
    const result = await prisma.$queryRaw`
        SELECT * FROM sp_fulfill_next_reservation(
            ${bookId}::INT,
            'error'::VARCHAR,
            ''::TEXT,
            NULL::INT,
            NULL::INT,
            NULL::VARCHAR,
            NULL::VARCHAR
        )
    `;
    
    const row = result[0];
    return {
        success: row.p_status === 'success',
        message: row.p_message,
        fulfilledReservationId: row.p_fulfilled_reservation_id,
        memberId: row.p_member_id,
        memberName: row.p_member_name,
        memberEmail: row.p_member_email
    };
}

/**
 * Cancel a reservation
 * @param {number} reservationId - Reservation ID
 * @param {number|null} memberId - Member ID (null for admin cancellation)
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelReservation(reservationId, memberId = null) {
    const result = await prisma.$queryRaw`
        SELECT * FROM sp_cancel_reservation(
            ${reservationId}::INT,
            ${memberId}::INT,
            'error'::VARCHAR,
            ''::TEXT
        )
    `;
    
    const row = result[0];
    return {
        success: row.p_status === 'success',
        message: row.p_message
    };
}

/**
 * Expire unclaimed reservations (called by cron job)
 * @param {number} holdPeriodDays - Number of days to hold before expiring
 * @returns {Promise<Object>} Expiry result
 */
export async function expireUnclaimedReservations(holdPeriodDays = 2) {
    const result = await prisma.$queryRaw`
        SELECT * FROM sp_expire_unclaimed_reservations(
            ${holdPeriodDays}::INT,
            'error'::VARCHAR,
            ''::TEXT,
            0::INT
        )
    `;
    
    const row = result[0];
    return {
        success: row.p_status === 'success',
        message: row.p_message,
        expiredCount: row.p_expired_count
    };
}

// Export the base execution functions as well
export {
    executeProcedure,
    executeFunction
};
