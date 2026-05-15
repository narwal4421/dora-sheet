"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const error_middleware_1 = require("./middleware/error.middleware");
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_router_1 = require("./modules/auth/auth.router");
const workspace_router_1 = require("./modules/workspace/workspace.router");
const workbook_router_1 = require("./modules/workbook/workbook.router");
const ai_router_1 = require("./modules/ai/ai.router");
const file_router_1 = require("./modules/file/file.router");
const call_router_1 = require("./modules/call/call.router");
const app = (0, express_1.default)();
app.set('trust proxy', 1); // Trust the Render proxy for accurate rate-limiting IP detection
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SmartSheet AI API',
            version: '1.0.0',
            description: 'API documentation for SmartSheet AI Platform',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/modules/**/*.ts'],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Dynamic origin reflection for demo - allows any requester to connect
        callback(null, origin || true);
    },
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
app.use('/api/v1/call', call_router_1.callRouter);
app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', time: new Date() } });
});
// Error handling middleware must be last
app.use(error_middleware_1.errorHandler);
const http_1 = __importDefault(require("http"));
const socket_server_1 = require("./sockets/socket.server");
const port = env_1.env.PORT || 3001;
const server = http_1.default.createServer(app);
(0, socket_server_1.initSockets)(server);
const prisma_1 = require("./config/prisma");
// Auto-snapshot every 5 minutes
setInterval(async () => {
    try {
        const workbooks = await prisma_1.prisma.workbook.findMany({
            include: { sheets: true, workspace: { include: { members: { take: 1 } } } }
        });
        for (const wb of workbooks) {
            if (wb.workspace.members.length === 0)
                continue;
            const snapshotData = wb.sheets.map(s => ({
                id: s.id,
                name: s.name,
                order: s.order,
                data: s.data,
                rowCount: s.rowCount,
                colCount: s.colCount
            }));
            await prisma_1.prisma.snapshot.create({
                data: {
                    workbookId: wb.id,
                    userId: wb.workspace.members[0].userId, // Attribution to first member for auto-saves
                    label: `Auto-save ${new Date().toISOString()}`,
                    data: snapshotData
                }
            });
        }
    }
    catch (err) {
        logger_1.logger.error('Auto-snapshot error:', err);
    }
}, 5 * 60 * 1000);
server.listen(port, async () => {
    logger_1.logger.info(`SmartSheet API running on port ${port} in ${env_1.env.NODE_ENV} mode`);
    // SEED DEFAULT DATA FOR DEMO
    try {
        const defaultId = 'default-workbook-id';
        const existingSheet = await prisma_1.prisma.sheet.findUnique({ where: { id: defaultId } });
        if (!existingSheet) {
            logger_1.logger.info('Seeding default workbook and sheet...');
            const workspace = await prisma_1.prisma.workspace.create({
                data: { name: 'Public Workspace', id: 'default-workspace-id' }
            });
            await prisma_1.prisma.workspaceMember.create({
                data: { workspaceId: workspace.id, userId: 'local-dev-user', role: 'ADMIN' }
            });
            const workbook = await prisma_1.prisma.workbook.create({
                data: {
                    id: defaultId,
                    name: 'Demo Workbook',
                    workspaceId: workspace.id
                }
            });
            await prisma_1.prisma.sheet.create({
                data: {
                    id: defaultId,
                    name: 'Sheet 1',
                    workbookId: workbook.id,
                    data: JSON.stringify({}),
                    rowCount: 100,
                    colCount: 26
                }
            });
            logger_1.logger.info('Default data seeded successfully.');
        }
    }
    catch (err) {
        logger_1.logger.error('Startup seeding failed:', err);
    }
});
