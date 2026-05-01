"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceController = void 0;
const zod_1 = require("zod");
const workspace_service_1 = require("./workspace.service");
const createWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100)
});
class WorkspaceController {
    static async getWorkspaces(req, res) {
        const userId = req.user.userId;
        const workspaces = await workspace_service_1.WorkspaceService.getUserWorkspaces(userId);
        res.json({
            success: true,
            data: workspaces
        });
    }
    static async createWorkspace(req, res) {
        const userId = req.user.userId;
        const { name } = createWorkspaceSchema.parse(req.body);
        const workspace = await workspace_service_1.WorkspaceService.createWorkspace(name, userId);
        res.status(201).json({
            success: true,
            data: workspace
        });
    }
    static async getWorkspace(req, res) {
        const userId = req.user.userId;
        const { id } = req.params;
        const workspace = await workspace_service_1.WorkspaceService.getWorkspaceDetails(id, userId);
        res.json({
            success: true,
            data: workspace
        });
    }
}
exports.WorkspaceController = WorkspaceController;
