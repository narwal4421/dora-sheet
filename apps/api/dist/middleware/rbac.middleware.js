"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            throw { name: 'UnauthorizedError', message: 'User not authenticated' };
        }
        if (!allowedRoles.includes(req.user.role)) {
            throw { name: 'ForbiddenError', message: 'Insufficient permissions' };
        }
        next();
    };
}
exports.requireRole = requireRole;
