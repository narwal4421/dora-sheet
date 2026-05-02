import { Request, Response } from 'express';
import { z } from 'zod';
import { AIService } from './ai.service';
import { redis } from '../../config/redis';
import dayjs from 'dayjs';
import * as xlsx from 'xlsx';

const chatSchema = z.object({
  sheetId: z.string(),
  prompt: z.string().min(1),
  activeCell: z.string().optional(),
  history: z.string().optional()
});

export class AIController {
  static async chat(req: Request, res: Response) {
    try {
      const userId = req.user?.userId || 'local-dev-user';
      
      // Rate Limiting (Safe mock)
      const today = dayjs().format('YYYY-MM-DD');
      const limitKey = `ai:ratelimit:${userId}:${today}`;
      
      let count = 0;
      try {
        count = await redis.incr(limitKey);
      } catch (e) {
        console.warn("Redis fail, skipping rate limit");
      }

      if (count > 100) {
        return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
      }

      // Safe Parsing
      let body;
      try {
        body = chatSchema.parse(req.body);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: 'Invalid request: ' + e.message });
      }

      let { sheetId, prompt, history } = body;
      let fileData: string | undefined = undefined;
      let mimeType: string | undefined = undefined;
      
      // Safe History Parsing
      let parsedHistory = [];
      try {
        parsedHistory = history ? JSON.parse(history) : [];
        if (!Array.isArray(parsedHistory)) parsedHistory = [];
      } catch (e) {
        console.warn("History parse failed, using empty history");
        parsedHistory = [];
      }
      
      if (req.file) {
        const isExcel = 
          req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          req.file.mimetype === 'application/vnd.ms-excel' ||
          req.file.originalname.endsWith('.xlsx') ||
          req.file.originalname.endsWith('.xls') ||
          req.file.originalname.endsWith('.csv');

        if (isExcel) {
          try {
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const firstSheetName = workbook.SheetNames[0];
            const csvData = xlsx.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
            prompt += `\n\n[Attached Spreadsheet Data]:\n${csvData}`;
          } catch (error) {
            console.error("Excel parse failed", error);
          }
        } else {
          fileData = req.file.buffer.toString('base64');
          mimeType = req.file.mimetype;
        }
      }

      const result = await AIService.chat(userId, sheetId, prompt, fileData, mimeType, parsedHistory);

      return res.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      console.error("[Controller Critical Error]", err);
      return res.status(500).json({
        success: false,
        message: `Controller Error: ${err.message}`
      });
    }
  }
}
