import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/error.middleware';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { authRouter } from './modules/auth/auth.router';
import { workspaceRouter } from './modules/workspace/workspace.router';
import { workbookRouter } from './modules/workbook/workbook.router';
import { aiRouter } from './modules/ai/ai.router';
import { fileRouter } from './modules/file/file.router';

const app = express();
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

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Dynamic origin reflection for demo - allows any requester to connect
    callback(null, origin || true);
  },
  credentials: true
}));
app.use(express.json());

// Global Rate Limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/workbooks', workbookRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1', fileRouter);

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date() } });
});

// Error handling middleware must be last
app.use(errorHandler);

import http from 'http';
import { initSockets } from './sockets/socket.server';

const port = env.PORT || 3001;
const server = http.createServer(app);

initSockets(server);

import { prisma } from './config/prisma';

// Auto-snapshot every 5 minutes
setInterval(async () => {
  try {
    const workbooks = await prisma.workbook.findMany({
      include: { sheets: true, workspace: { include: { members: { take: 1 } } } }
    });

    for (const wb of workbooks) {
      if (wb.workspace.members.length === 0) continue;
      
      const snapshotData = wb.sheets.map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        data: s.data,
        rowCount: s.rowCount,
        colCount: s.colCount
      }));

      await prisma.snapshot.create({
        data: {
          workbookId: wb.id,
          userId: wb.workspace.members[0].userId, // Attribution to first member for auto-saves
          label: `Auto-save ${new Date().toISOString()}`,
          data: snapshotData as any
        }
      });
    }
  } catch (err) {
    logger.error('Auto-snapshot error:', err);
  }
}, 5 * 60 * 1000);

server.listen(port, () => {
  logger.info(`SmartSheet API running on port ${port} in ${env.NODE_ENV} mode`);
});
