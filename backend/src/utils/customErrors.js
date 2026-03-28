/**
 * Custom Error Classes for Library Management System
 * Provides structured error handling across the application
 */

// Base error class for all application errors
class AppError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Distinguishes operational errors from programming errors
        Error.captureStackTrace(this, this.constructor);
    }
}

// 400 - Validation Error
class ValidationError extends AppError {
    constructor(message, details = {}) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

// 401 - Authentication Error
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

// 403 - Authorization Error
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

// 404 - Not Found Error
class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.resource = resource;
    }
}

// 409 - Conflict Error
class ConflictError extends AppError {
    constructor(message, conflictField = null) {
        super(message, 409, 'CONFLICT');
        this.conflictField = conflictField;
    }
}

// 422 - Business Rule Violation
class BusinessRuleError extends AppError {
    constructor(message, rule = null) {
        super(message, 422, 'BUSINESS_RULE_VIOLATION');
        this.rule = rule;
    }
}

// 500 - Database Error
class DatabaseError extends AppError {
    constructor(message, originalError = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.originalError = originalError;
        
        // Log original error details for debugging
        if (originalError) {
            console.error('Original Database Error:', {
                message: originalError.message,
                code: originalError.code,
                stack: originalError.stack
            });
        }
    }
}

// 500 - External Service Error
class ExternalServiceError extends AppError {
    constructor(service, message = 'External service unavailable') {
        super(message, 500, 'EXTERNAL_SERVICE_ERROR');
        this.service = service;
    }
}

// 503 - Service Unavailable
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE');
    }
}

export {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    BusinessRuleError,
    DatabaseError,
    ExternalServiceError,
    ServiceUnavailableError
};
