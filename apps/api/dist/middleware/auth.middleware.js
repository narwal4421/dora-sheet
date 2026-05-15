"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
function requireAuth(req, res, next) {
    // Bypass authentication for public access - make the site free for all
    req.user = {
        userId: 'public-user-id',
        email: 'public@dora-sheet.com',
        role: 'ADMIN',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (100 * 365 * 24 * 60 * 60) // 100 years
    };
    next();
}
exports.requireAuth = requireAuth;
