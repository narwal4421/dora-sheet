"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const file_service_1 = require("./file.service");
class FileController {
    static async importXlsx(req, res) {
        const userId = req.user.userId;
        const { workbookId } = req.body;
        const file = req.file;
        if (!file || !workbookId)
            throw { statusCode: 400, message: 'Missing file or workbookId' };
        await file_service_1.FileService.importExcel(file.buffer, workbookId, userId);
        res.json({ success: true });
    }
    static async importCsv(req, res) {
        const userId = req.user.userId;
        const { workbookId } = req.body;
        const file = req.file;
        if (!file || !workbookId)
            throw { statusCode: 400, message: 'Missing file or workbookId' };
        await file_service_1.FileService.importCsv(file.buffer, workbookId, userId);
        res.json({ success: true });
    }
    static async exportXlsx(req, res) {
        const userId = req.user.userId;
        const { workbookId } = req.params;
        const buffer = await file_service_1.FileService.exportXlsx(workbookId, userId);
        res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }
    static async exportPdf(req, res) {
        const userId = req.user.userId;
        const { workbookId } = req.params;
        const buffer = await file_service_1.FileService.exportPdf(workbookId, userId);
        res.setHeader('Content-Disposition', 'attachment; filename="export.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(buffer);
    }
    static async exportCsv(req, res) {
        const userId = req.user.userId;
        const { sheetId } = req.params;
        const csv = await file_service_1.FileService.exportCsv(sheetId, userId);
        res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
    }
}
exports.FileController = FileController;
