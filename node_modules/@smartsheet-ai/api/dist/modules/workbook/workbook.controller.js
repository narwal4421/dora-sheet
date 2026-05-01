"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkbookController = void 0;
const zod_1 = require("zod");
const workbook_service_1 = require("./workbook.service");
const createWorkbookSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    workspaceId: zod_1.z.string().uuid()
});
class WorkbookController {
    static async getWorkbooks(req, res) {
        const userId = req.user.userId;
        const { workspaceId } = req.params;
        const workbooks = await workbook_service_1.WorkbookService.getWorkbooks(workspaceId, userId);
        res.json({
            success: true,
            data: workbooks
        });
    }
    static async createWorkbook(req, res) {
        const userId = req.user.userId;
        const { name, workspaceId } = createWorkbookSchema.parse(req.body);
        const workbook = await workbook_service_1.WorkbookService.createWorkbook(name, workspaceId, userId);
        res.status(201).json({
            success: true,
            data: workbook
        });
    }
    static async getWorkbook(req, res) {
        const userId = req.user.userId;
        const { id } = req.params;
        const workbook = await workbook_service_1.WorkbookService.getWorkbookDetails(id, userId);
        res.json({
            success: true,
            data: workbook
        });
    }
}
exports.WorkbookController = WorkbookController;
