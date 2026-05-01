import { Router } from 'express';
import { WorkspaceController } from './workspace.controller';
import { requireAuth } from '../../middleware/auth.middleware';

export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);

/** @swagger /api/v1/workspaces: get: summary: Get workspaces tags: [Workspace] */
workspaceRouter.get('/', WorkspaceController.getWorkspaces);
/** @swagger /api/v1/workspaces: post: summary: Create workspace tags: [Workspace] */
workspaceRouter.post('/', WorkspaceController.createWorkspace);
/** @swagger /api/v1/workspaces/{id}: get: summary: Get workspace tags: [Workspace] */
workspaceRouter.get('/:id', WorkspaceController.getWorkspace);

/** @swagger /api/v1/workspaces/{id}/members: post: summary: Add member tags: [Workspace] */
workspaceRouter.post('/:id/members', WorkspaceController.addMember);
/** @swagger /api/v1/workspaces/{id}/members: get: summary: Get members tags: [Workspace] */
workspaceRouter.get('/:id/members', WorkspaceController.getMembers);
