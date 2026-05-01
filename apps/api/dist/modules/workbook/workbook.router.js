"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workbookRouter = void 0;
const express_1 = require("express");
const workbook_controller_1 = require("./workbook.controller");
const snapshot_controller_1 = require("./snapshot.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
exports.workbookRouter = (0, express_1.Router)();
exports.workbookRouter.use(auth_middleware_1.requireAuth);
/** @swagger /api/v1/workbooks/workspace/{workspaceId}: get: summary: Get workbooks tags: [Workbook] */
exports.workbookRouter.get('/workspace/:workspaceId', workbook_controller_1.WorkbookController.getWorkbooks);
/** @swagger /api/v1/workbooks: post: summary: Create workbook tags: [Workbook] */
exports.workbookRouter.post('/', workbook_controller_1.WorkbookController.createWorkbook);
/** @swagger /api/v1/workbooks/{id}: get: summary: Get workbook tags: [Workbook] */
exports.workbookRouter.get('/:id', workbook_controller_1.WorkbookController.getWorkbook);
/** @swagger /api/v1/workbooks/{id}/snapshots: post: summary: Create snapshot tags: [Snapshot] */
exports.workbookRouter.post('/:id/snapshots', snapshot_controller_1.SnapshotController.createSnapshot);
/** @swagger /api/v1/workbooks/{id}/snapshots: get: summary: Get snapshots tags: [Snapshot] */
exports.workbookRouter.get('/:id/snapshots', snapshot_controller_1.SnapshotController.getSnapshots);
/** @swagger /api/v1/workbooks/snapshots/{id}/restore: post: summary: Restore snapshot tags: [Snapshot] */
exports.workbookRouter.post('/snapshots/:id/restore', snapshot_controller_1.SnapshotController.restoreSnapshot);
