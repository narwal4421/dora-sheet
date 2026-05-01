import { Request, Response } from 'express';
import { SnapshotService } from './snapshot.service';

export class SnapshotController {
  static async createSnapshot(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { id: workbookId } = req.params;
    const { label } = req.body;

    const snapshot = await SnapshotService.createSnapshot(workbookId, userId, label);
    res.json({ success: true, data: snapshot });
  }

  static async getSnapshots(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { id: workbookId } = req.params;

    const snapshots = await SnapshotService.getSnapshots(workbookId, userId);
    res.json({ success: true, data: snapshots });
  }

  static async restoreSnapshot(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { id: snapshotId } = req.params;

    await SnapshotService.restoreSnapshot(snapshotId, userId);
    res.json({ success: true });
  }
}
