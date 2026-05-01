"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../config/logger");
const zod_1 = require("zod");
function errorHandler(err, req, res, next) {
    logger_1.logger.error(err.message, err);
    let statusCode = 500;
    let response = {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
    };
    if (err instanceof zod_1.ZodError) {
        statusCode = 400;
        response = {
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: err.errors,
        };
    }
    else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        response = {
            success: false,
            code: 'UNAUTHORIZED',
            message: err.message || 'Unauthorized',
        };
    }
    else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        response = {
            success: false,
            code: 'FORBIDDEN',
            message: err.message || 'Forbidden access',
        };
    }
    else if (err.code === 'P2002') { // Prisma unique constraint violation
        statusCode = 409;
        response = {
            success: false,
            code: 'CONFLICT',
            message: 'Resource already exists',
        };
    }
    else if (err.statusCode) {
        statusCode = err.statusCode;
        response = {
            success: false,
            code: err.code || 'ERROR',
            message: err.message,
        };
    }
    res.status(statusCode).json(response);
}
exports.errorHandler = errorHandler;
