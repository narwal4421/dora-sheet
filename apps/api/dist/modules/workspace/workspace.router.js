"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceRouter = void 0;
const express_1 = require("express");
const workspace_controller_1 = require("./workspace.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
exports.workspaceRouter = (0, express_1.Router)();
exports.workspaceRouter.use(auth_middleware_1.requireAuth);
/** @swagger /api/v1/workspaces: get: summary: Get workspaces tags: [Workspace] */
exports.workspaceRouter.get('/', workspace_controller_1.WorkspaceController.getWorkspaces);
/** @swagger /api/v1/workspaces: post: summary: Create workspace tags: [Workspace] */
exports.workspaceRouter.post('/', workspace_controller_1.WorkspaceController.createWorkspace);
/** @swagger /api/v1/workspaces/{id}: get: summary: Get workspace tags: [Workspace] */
exports.workspaceRouter.get('/:id', workspace_controller_1.WorkspaceController.getWorkspace);
/** @swagger /api/v1/workspaces/{id}/members: post: summary: Add member tags: [Workspace] */
exports.workspaceRouter.post('/:id/members', workspace_controller_1.WorkspaceController.addMember);
/** @swagger /api/v1/workspaces/{id}/members: get: summary: Get members tags: [Workspace] */
exports.workspaceRouter.get('/:id/members', workspace_controller_1.WorkspaceController.getMembers);
