import { Request, Response } from 'express';
import { z } from 'zod';
import { WorkbookService } from './workbook.service';

const createWorkbookSchema = z.object({
  name: z.string().min(1).max(100),
  workspaceId: z.string().uuid()
});

export class WorkbookController {
  static async getWorkbooks(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { workspaceId } = req.params;

    const workbooks = await WorkbookService.getWorkbooks(workspaceId, userId);

    res.json({
      success: true,
      data: workbooks
    });
  }

  static async createWorkbook(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { name, workspaceId } = createWorkbookSchema.parse(req.body);

    const workbook = await WorkbookService.createWorkbook(name, workspaceId, userId);

    res.status(201).json({
      success: true,
      data: workbook
    });
  }

  static async getWorkbook(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { id } = req.params;

    const workbook = await WorkbookService.getWorkbookDetails(id, userId);

    res.json({
      success: true,
      data: workbook
    });
  }
}
