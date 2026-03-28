/**
 * Request Validation Middleware
 * Uses Joi for schema-based validation
 */

import Joi from 'joi';
import { ValidationError } from '../utils/customErrors.js';

/**
 * Validate request body against a Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateRequest(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,      // Validate all fields, not just first error
            stripUnknown: true,      // Remove unknown keys
            convert: true            // Convert types (e.g., string "1" to number 1)
        });

        if (error) {
            // Transform Joi errors to our custom format
            const details = error.details.reduce((acc, detail) => {
                const key = detail.path.join('.');
                acc[key] = detail.message.replace(/"/g, '');
                return acc;
            }, {});

            throw new ValidationError('Validation failed', details);
        }

        // Replace req.body with sanitized and validated values
        req.body = value;
        next();
    };
}

/**
 * Validate request query parameters
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const details = error.details.reduce((acc, detail) => {
                const key = detail.path.join('.');
                acc[key] = detail.message.replace(/"/g, '');
                return acc;
            }, {});

            throw new ValidationError('Query validation failed', details);
        }

        req.query = value;
        next();
    };
}

/**
 * Validate request params (URL parameters)
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const details = error.details.reduce((acc, detail) => {
                const key = detail.path.join('.');
                acc[key] = detail.message.replace(/"/g, '');
                return acc;
            }, {});

            throw new ValidationError('Parameter validation failed', details);
        }

        req.params = value;
        next();
    };
}

export {
    validateRequest,
    validateQuery,
    validateParams
};
