/**
 * Validation Schemas for Circulation Operations
 * Uses Joi for input validation
 */

import Joi from 'joi';

// Checkout book validation schema
const checkoutSchema = Joi.object({
    book_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Book ID must be a number',
            'number.positive': 'Book ID must be positive',
            'any.required': 'Book ID is required'
        }),
    
    member_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Member ID must be a number',
            'number.positive': 'Member ID must be positive',
            'any.required': 'Member ID is required'
        }),
    
    staff_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Staff ID must be a number',
            'number.positive': 'Staff ID must be positive',
            'any.required': 'Staff ID is required'
        }),
    
    notes: Joi.string()
        .max(500)
        .optional()
        .allow('')
});

// Return book validation schema
const returnSchema = Joi.object({
    transaction_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Transaction ID must be a number',
            'number.positive': 'Transaction ID must be positive',
            'any.required': 'Transaction ID is required'
        }),
    
    staff_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Staff ID must be a number',
            'number.positive': 'Staff ID must be positive',
            'any.required': 'Staff ID is required'
        }),
    
    return_condition: Joi.string()
        .valid('excellent', 'good', 'fair', 'poor', 'damaged')
        .required()
        .messages({
            'any.only': 'Return condition must be one of: excellent, good, fair, poor, damaged',
            'any.required': 'Return condition is required'
        }),
    
    notes: Joi.string()
        .max(500)
        .optional()
        .allow('')
});

// Renew loan validation schema
const renewSchema = Joi.object({
    transaction_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Transaction ID must be a number',
            'number.positive': 'Transaction ID must be positive',
            'any.required': 'Transaction ID is required'
        }),
    
    member_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Member ID must be a number',
            'number.positive': 'Member ID must be positive',
            'any.required': 'Member ID is required'
        })
});

// Mark book as lost validation schema
const markLostSchema = Joi.object({
    transaction_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Transaction ID must be a number',
            'number.positive': 'Transaction ID must be positive',
            'any.required': 'Transaction ID is required'
        }),
    
    staff_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Staff ID must be a number',
            'number.positive': 'Staff ID must be positive',
            'any.required': 'Staff ID is required'
        }),
    
    replacement_cost: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            'number.base': 'Replacement cost must be a number',
            'number.positive': 'Replacement cost must be positive',
            'any.required': 'Replacement cost is required'
        }),
    
    notes: Joi.string()
        .max(500)
        .optional()
        .allow('')
});

// Reservation creation validation schema
const createReservationSchema = Joi.object({
    book_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Book ID must be a number',
            'number.positive': 'Book ID must be positive',
            'any.required': 'Book ID is required'
        }),
    
    member_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Member ID must be a number',
            'number.positive': 'Member ID must be positive',
            'any.required': 'Member ID is required'
        }),
    
    notes: Joi.string()
        .max(500)
        .optional()
        .allow('')
});

// Cancel reservation validation schema
const cancelReservationSchema = Joi.object({
    reservation_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Reservation ID must be a number',
            'number.positive': 'Reservation ID must be positive',
            'any.required': 'Reservation ID is required'
        }),
    
    reason: Joi.string()
        .max(200)
        .optional()
        .allow('')
});

// Fine payment validation schema
const paymentSchema = Joi.object({
    member_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Member ID must be a number',
            'number.positive': 'Member ID must be positive',
            'any.required': 'Member ID is required'
        }),
    
    amount: Joi.number()
        .positive()
        .precision(2)
        .max(10000)
        .required()
        .messages({
            'number.base': 'Amount must be a number',
            'number.positive': 'Amount must be positive',
            'number.max': 'Amount cannot exceed 10000',
            'any.required': 'Amount is required'
        }),
    
    payment_method: Joi.string()
        .valid('cash', 'card', 'upi', 'net_banking', 'wallet')
        .required()
        .messages({
            'any.only': 'Payment method must be one of: cash, card, upi, net_banking, wallet',
            'any.required': 'Payment method is required'
        }),
    
    pg_transaction_id: Joi.string()
        .max(100)
        .optional()
        .allow(''),
    
    processed_by: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Processed by (staff ID) must be a number',
            'number.positive': 'Processed by must be positive',
            'any.required': 'Processed by is required'
        })
});

// Fine waiver validation schema
const waiverSchema = Joi.object({
    member_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Member ID must be a number',
            'number.positive': 'Member ID must be positive',
            'any.required': 'Member ID is required'
        }),
    
    amount: Joi.number()
        .positive()
        .precision(2)
        .max(10000)
        .required()
        .messages({
            'number.base': 'Amount must be a number',
            'number.positive': 'Amount must be positive',
            'number.max': 'Amount cannot exceed 10000',
            'any.required': 'Amount is required'
        }),
    
    reason: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
            'string.min': 'Reason must be at least 10 characters',
            'string.max': 'Reason cannot exceed 500 characters',
            'any.required': 'Reason is required'
        }),
    
    staff_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Staff ID must be a number',
            'number.positive': 'Staff ID must be positive',
            'any.required': 'Staff ID is required'
        })
});

export {
    checkoutSchema,
    returnSchema,
    renewSchema,
    markLostSchema,
    createReservationSchema,
    cancelReservationSchema,
    paymentSchema,
    waiverSchema
};
