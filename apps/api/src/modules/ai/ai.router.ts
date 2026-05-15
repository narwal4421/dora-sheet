import { Router } from 'express';
import { AIController } from './ai.controller';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
export const aiRouter = Router();

/**
 * @swagger
 * /api/v1/ai/chat:
 *   post:
 *     summary: AI Chat
 *     tags:
 *       - AI
 *     responses:
 *       200:
 *         description: Success
 */
aiRouter.post('/chat', upload.single('attachedFile'), AIController.chat);
