import { Request, Response } from 'express';
import { z } from 'zod';
import { WorkspaceService } from './workspace.service';

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100)
});

export class WorkspaceController {
  static async getWorkspaces(req: Request, res: Response) {
    const userId = req.user!.userId;
    const workspaces = await WorkspaceService.getUserWorkspaces(userId);

    res.json({
      success: true,
      data: workspaces
    });
  }

  static async createWorkspace(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { name } = createWorkspaceSchema.parse(req.body);

    const workspace = await WorkspaceService.createWorkspace(name, userId);

    res.status(201).json({
      success: true,
      data: workspace
    });
  }

  static async getWorkspace(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { id } = req.params;

    const workspace = await WorkspaceService.getWorkspaceDetails(id, userId);

    res.json({
      success: true,
      data: workspace
    });
  }

  static async addMember(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { email, role } = req.body;
    await WorkspaceService.addMember(id, userId, email, role);
    res.json({ success: true });
  }

  static async getMembers(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { id } = req.params;
    const members = await WorkspaceService.getMembers(id, userId);
    res.json({ success: true, data: members });
  }
}
