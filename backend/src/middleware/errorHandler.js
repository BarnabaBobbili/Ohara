/**
 * Centralized Error Handler Middleware
 * Handles all errors across the application with proper logging and formatting
 */

import {
    ConflictError,
    ValidationError,
    BusinessRuleError,
    NotFoundError,
    DatabaseError
} from '../utils/customErrors.js';

// PostgreSQL error code mapping
const PG_ERROR_CODES = {
    '23505': 'DUPLICATE_ENTRY',           // Unique violation
    '23503': 'FOREIGN_KEY_VIOLATION',     // Foreign key violation
    '23502': 'NOT_NULL_VIOLATION',        // Not null violation
    '22P02': 'INVALID_INPUT_SYNTAX',      // Invalid text representation
    '42P01': 'UNDEFINED_TABLE',           // Table does not exist
    '42703': 'UNDEFINED_COLUMN',          // Column does not exist
    'P0001': 'CUSTOM_EXCEPTION'           // PL/pgSQL RAISE EXCEPTION
};

// MongoDB error code mapping
const MONGO_ERROR_CODES = {
    11000: 'DUPLICATE_KEY',               // Duplicate key error
    121: 'DOCUMENT_VALIDATION_FAILED',    // Document validation failed
    13: 'UNAUTHORIZED',                   // Not authorized
    18: 'AUTHENTICATION_FAILED'           // Authentication failed
};

// MySQL error code mapping
const MYSQL_ERROR_CODES = {
    'ER_DUP_ENTRY': 'DUPLICATE_ENTRY',
    'ER_NO_REFERENCED_ROW': 'FOREIGN_KEY_VIOLATION',
    'ER_ROW_IS_REFERENCED': 'FOREIGN_KEY_VIOLATION',
    'ER_BAD_NULL_ERROR': 'NOT_NULL_VIOLATION'
};

/**
 * Handle database-specific errors and convert to AppError
 */
function handleDatabaseError(error) {
    // PostgreSQL errors (via Prisma)
    if (error.code && PG_ERROR_CODES[error.code]) {
        switch (error.code) {
            case '23505':
                return new ConflictError(
                    'A record with this value already exists',
                    error.meta?.target?.[0] || error.constraint
                );
            
            case '23503':
                return new ValidationError(
                    'Referenced record does not exist',
                    { field: error.meta?.field_name || 'unknown' }
                );
            
            case '23502':
                return new ValidationError(
                    'Required field is missing',
                    { field: error.meta?.column || 'unknown' }
                );
            
            case 'P0001':
                // Custom PL/pgSQL RAISE EXCEPTION
                return new BusinessRuleError(error.message, error.message);
            
            default:
                return new DatabaseError('Database operation failed', error);
        }
    }

    // Prisma-specific errors
    if (error.code && error.code.startsWith('P')) {
        switch (error.code) {
            case 'P2002':
                return new ConflictError(
                    'Unique constraint violation',
                    error.meta?.target?.[0]
                );
            
            case 'P2025':
                return new NotFoundError('Record');
            
            case 'P2003':
                return new ValidationError(
                    'Foreign key constraint failed',
                    { field: error.meta?.field_name }
                );
            
            case 'P2014':
                return new BusinessRuleError(
                    'The change you are trying to make would violate a relation',
                    'RELATION_VIOLATION'
                );
            
            default:
                return new DatabaseError(`Database error: ${error.code}`, error);
        }
    }

    // MongoDB errors
    if (error.code && MONGO_ERROR_CODES[error.code]) {
        switch (error.code) {
            case 11000:
                const field = Object.keys(error.keyPattern || {})[0] || 'unknown';
                return new ConflictError(`Duplicate value for field: ${field}`, field);
            
            case 121:
                return new ValidationError('Document validation failed', error.errInfo);
            
            default:
                return new DatabaseError('MongoDB operation failed', error);
        }
    }

    // MySQL errors
    if (error.code && MYSQL_ERROR_CODES[error.code]) {
        switch (error.code) {
            case 'ER_DUP_ENTRY':
                return new ConflictError('Duplicate entry', error.sqlMessage);
            
            case 'ER_NO_REFERENCED_ROW':
            case 'ER_ROW_IS_REFERENCED':
                return new ValidationError('Foreign key constraint failed');
            
            case 'ER_BAD_NULL_ERROR':
                return new ValidationError('Required field cannot be null');
            
            default:
                return new DatabaseError('MySQL operation failed', error);
        }
    }

    // Generic database error
    return new DatabaseError('Database operation failed', error);
}

/**
 * Main error handler middleware
 * This must be the last middleware in the chain
 */
function errorHandler(err, req, res, next) {
    let error = err;

    // Convert database errors to AppError
    if (err.code || err.name === 'PrismaClientKnownRequestError' || err.name === 'MongoServerError') {
        error = handleDatabaseError(err);
    }

    // Handle non-operational errors (programming errors)
    if (!error.isOperational) {
        console.error('❌ NON-OPERATIONAL ERROR:', {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            body: req.body,
            query: req.query
        });

        // Don't expose internal errors to client
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred. Please try again later.',
                ...(process.env.NODE_ENV === 'development' && {
                    details: err.message,
                    stack: err.stack
                })
            }
        });
    }

    // Handle operational errors (expected errors)
    const response = {
        success: false,
        error: {
            code: error.errorCode,
            message: error.message
        }
    };

    // Add additional error details if present
    if (error.details) response.error.details = error.details;
    if (error.rule) response.error.rule = error.rule;
    if (error.resource) response.error.resource = error.resource;
    if (error.conflictField) response.error.field = error.conflictField;
    if (error.service) response.error.service = error.service;

    // Log operational errors with status >= 500 (non-blocking)
    if (error.statusCode >= 500) {
        console.error('❌ OPERATIONAL ERROR:', {
            code: error.errorCode,
            message: error.message,
            path: req.path,
            method: req.method
        });
    }

    res.status(error.statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => {...}))
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Handle 404 errors for undefined routes
 */
function notFoundHandler(req, res, next) {
    const error = new NotFoundError('Route');
    error.message = `Cannot ${req.method} ${req.path}`;
    next(error);
}

export {
    errorHandler,
    asyncHandler,
    notFoundHandler,
    handleDatabaseError
};
