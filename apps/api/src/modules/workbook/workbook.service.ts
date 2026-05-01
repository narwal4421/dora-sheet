import { prisma } from '../../config/prisma';

export class WorkbookService {
  static async getWorkbooks(workspaceId: string, userId: string) {
    // Verify user has access to workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    if (!membership) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not have access to this workspace' };
    }

    const workbooks = await prisma.workbook.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { sheets: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return workbooks;
  }

  static async createWorkbook(name: string, workspaceId: string, userId: string) {
    // Verify user has access and is at least an EDITOR
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId }
      }
    });

    if (!membership || membership.role === 'VIEWER') {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not have permission to create workbooks in this workspace' };
    }

    const workbook = await prisma.$transaction(async (tx) => {
      const newWorkbook = await tx.workbook.create({
        data: {
          name,
          workspaceId
        }
      });

      // Create default sheet
      await tx.sheet.create({
        data: {
          name: 'Sheet 1',
          workbookId: newWorkbook.id,
          order: 0,
          rowCount: 100,
          colCount: 26,
          data: {} // Empty JSON
        }
      });

      return newWorkbook;
    });

    return workbook;
  }

  static async getWorkbookDetails(workbookId: string, userId: string) {
    const workbook = await prisma.workbook.findUnique({
      where: { id: workbookId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId }
            }
          }
        },
        sheets: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!workbook) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Workbook not found' };
    }

    if (workbook.workspace.members.length === 0) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not have access to this workbook' };
    }

    const myRole = workbook.workspace.members[0].role;
    
    // Clean up response by omitting workspace members
    const { workspace, ...rest } = workbook;
    const { members, ...workspaceWithoutMembers } = workspace;

    return {
      ...rest,
      workspace: workspaceWithoutMembers,
      myRole
    };
  }
}
