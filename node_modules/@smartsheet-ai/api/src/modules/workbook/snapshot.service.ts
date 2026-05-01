import { prisma } from '../../config/prisma';

export class SnapshotService {
  static async createSnapshot(workbookId: string, userId: string, label?: string) {
    // Verify access
    const workbook = await prisma.workbook.findUnique({
      where: { id: workbookId },
      include: { sheets: true, workspace: { include: { members: { where: { userId } } } } }
    });

    if (!workbook || workbook.workspace.members.length === 0) throw { statusCode: 403, message: 'Forbidden' };

    // Dump all sheets
    const snapshotData = workbook.sheets.map(s => ({
      id: s.id,
      name: s.name,
      order: s.order,
      data: s.data,
      rowCount: s.rowCount,
      colCount: s.colCount
    }));

    return prisma.snapshot.create({
      data: {
        workbookId,
        userId,
        label: label || `Auto-save ${new Date().toISOString()}`,
        data: JSON.stringify(snapshotData)
      }
    });
  }

  static async getSnapshots(workbookId: string, userId: string) {
    const workbook = await prisma.workbook.findUnique({
      where: { id: workbookId },
      include: { workspace: { include: { members: { where: { userId } } } } }
    });

    if (!workbook || workbook.workspace.members.length === 0) throw { statusCode: 403, message: 'Forbidden' };

    return prisma.snapshot.findMany({
      where: { workbookId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, label: true, createdAt: true, userId: true, user: { select: { name: true } } }
    });
  }

  static async restoreSnapshot(snapshotId: string, userId: string) {
    const snapshot = await prisma.snapshot.findUnique({
      where: { id: snapshotId },
      include: { workbook: { include: { workspace: { include: { members: { where: { userId } } } } } } }
    });

    if (!snapshot || snapshot.workbook.workspace.members.length === 0 || snapshot.workbook.workspace.members[0].role === 'VIEWER') {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const sheetsData = (typeof snapshot.data === 'string' ? JSON.parse(snapshot.data) : snapshot.data) as any[];

    // Transaction to replace sheets
    await prisma.$transaction(async (tx) => {
      await tx.sheet.deleteMany({ where: { workbookId: snapshot.workbookId } });

      for (const s of sheetsData) {
        await tx.sheet.create({
          data: {
            id: s.id,
            name: s.name,
            workbookId: snapshot.workbookId,
            order: s.order,
            data: s.data,
            rowCount: s.rowCount,
            colCount: s.colCount
          }
        });
      }
    });
  }
}
