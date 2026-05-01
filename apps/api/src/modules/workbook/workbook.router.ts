import { Router } from 'express';
import { WorkbookController } from './workbook.controller';
import { SnapshotController } from './snapshot.controller';
import { requireAuth } from '../../middleware/auth.middleware';

export const workbookRouter = Router();

workbookRouter.use(requireAuth);

/** @swagger /api/v1/workbooks/workspace/{workspaceId}: get: summary: Get workbooks tags: [Workbook] */
workbookRouter.get('/workspace/:workspaceId', WorkbookController.getWorkbooks);
/** @swagger /api/v1/workbooks: post: summary: Create workbook tags: [Workbook] */
workbookRouter.post('/', WorkbookController.createWorkbook);
/** @swagger /api/v1/workbooks/{id}: get: summary: Get workbook tags: [Workbook] */
workbookRouter.get('/:id', WorkbookController.getWorkbook);

/** @swagger /api/v1/workbooks/{id}/snapshots: post: summary: Create snapshot tags: [Snapshot] */
workbookRouter.post('/:id/snapshots', SnapshotController.createSnapshot);
/** @swagger /api/v1/workbooks/{id}/snapshots: get: summary: Get snapshots tags: [Snapshot] */
workbookRouter.get('/:id/snapshots', SnapshotController.getSnapshots);
/** @swagger /api/v1/workbooks/snapshots/{id}/restore: post: summary: Restore snapshot tags: [Snapshot] */
workbookRouter.post('/snapshots/:id/restore', SnapshotController.restoreSnapshot);
