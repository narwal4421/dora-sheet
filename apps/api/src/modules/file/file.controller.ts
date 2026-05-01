import { Request, Response } from 'express';
import { FileService } from './file.service';

export class FileController {
  static async importXlsx(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { workbookId } = req.body;
    const file = req.file;

    if (!file || !workbookId) throw { statusCode: 400, message: 'Missing file or workbookId' };

    await FileService.importExcel(file.buffer, workbookId, userId);
    res.json({ success: true });
  }

  static async importCsv(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { workbookId } = req.body;
    const file = req.file;

    if (!file || !workbookId) throw { statusCode: 400, message: 'Missing file or workbookId' };

    await FileService.importCsv(file.buffer, workbookId, userId);
    res.json({ success: true });
  }

  static async exportXlsx(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { workbookId } = req.params;

    const buffer = await FileService.exportXlsx(workbookId, userId);
    
    res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }

  static async exportPdf(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { workbookId } = req.params;

    const buffer = await FileService.exportPdf(workbookId, userId);
    
    res.setHeader('Content-Disposition', 'attachment; filename="export.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
  }

  static async exportCsv(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { sheetId } = req.params;

    const csv = await FileService.exportCsv(sheetId, userId);
    
    res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  }
}
