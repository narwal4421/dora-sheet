"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const error_middleware_1 = require("./middleware/error.middleware");
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_router_1 = require("./modules/auth/auth.router");
const workspace_router_1 = require("./modules/workspace/workspace.router");
const workbook_router_1 = require("./modules/workbook/workbook.router");
const ai_router_1 = require("./modules/ai/ai.router");
const file_router_1 = require("./modules/file/file.router");
const app = (0, express_1.default)();
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express_1.default.json());
// Global Rate Limiting
app.use('/api', rateLimiter_1.apiLimiter);
// Routes
app.use('/api/v1/auth', rateLimiter_1.authLimiter, auth_router_1.authRouter);
app.use('/api/v1/workspaces', workspace_router_1.workspaceRouter);
app.use('/api/v1/workbooks', workbook_router_1.workbookRouter);
app.use('/api/v1/ai', ai_router_1.aiRouter);
app.use('/api/v1', file_router_1.fileRouter);
app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', time: new Date() } });
});
// Error handling middleware must be last
app.use(error_middleware_1.errorHandler);
const port = env_1.env.PORT || 3001;
app.listen(port, () => {
    logger_1.logger.info(`SmartSheet API running on port ${port} in ${env_1.env.NODE_ENV} mode`);
});
