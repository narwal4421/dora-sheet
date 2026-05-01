import { Request, Response } from 'express';
import { z } from 'zod';
import { AIService } from './ai.service';
import { redis } from '../../config/redis';
import dayjs from 'dayjs';
import * as xlsx from 'xlsx';

const chatSchema = z.object({
  sheetId: z.string(),
  prompt: z.string().min(1),
  activeCell: z.string().optional()
});

export class AIController {
  static async chat(req: Request, res: Response) {
    const userId = req.user?.userId || 'local-dev-user';
    
    // Rate Limiting
    const today = dayjs().format('YYYY-MM-DD');
    const limitKey = `ai:ratelimit:${userId}:${today}`;
    
    const count = await redis.incr(limitKey);
    if (count === 1) {
      // Set expiry to end of day
      const eod = dayjs().endOf('day').unix();
      const now = dayjs().unix();
      await redis.expire(limitKey, eod - now);
    }

    if (count > 50) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Rate limit exceeded',
          resetAt: dayjs().add(1, 'day').startOf('day').toISOString()
        }
      });
      return;
    }

    let { sheetId, prompt } = chatSchema.parse(req.body);
    let fileData: string | undefined = undefined;
    let mimeType: string | undefined = undefined;
    
    if (req.file) {
      const isExcel = 
        req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        req.file.mimetype === 'application/vnd.ms-excel' ||
        req.file.originalname.endsWith('.xlsx') ||
        req.file.originalname.endsWith('.xls') ||
        req.file.originalname.endsWith('.csv');

      if (isExcel) {
        // Parse Excel/CSV into text before sending to AI
        try {
          const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const csvData = xlsx.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
          
          prompt += `\n\n[Attached Spreadsheet Data]:\n${csvData}`;
        } catch (error) {
          console.error("Failed to parse Excel file:", error);
          throw new Error("Failed to parse the uploaded spreadsheet.");
        }
      } else {
        fileData = req.file.buffer.toString('base64');
        mimeType = req.file.mimetype;
      }
    }
    const result = await AIService.chat(userId, sheetId, prompt, fileData, mimeType);

    res.json({
      success: true,
      data: result
    });
  }
}
