"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceService = void 0;
const prisma_1 = require("../../config/prisma");
class WorkspaceService {
    static async getUserWorkspaces(userId) {
        const memberships = await prisma_1.prisma.workspaceMember.findMany({
            where: { userId },
            include: {
                workspace: {
                    include: {
                        _count: {
                            select: { workbooks: true, members: true }
                        }
                    }
                }
            },
            orderBy: { workspace: { createdAt: 'desc' } }
        });
        return memberships.map(m => ({
            ...m.workspace,
            myRole: m.role
        }));
    }
    static async createWorkspace(name, userId) {
        const workspace = await prisma_1.prisma.workspace.create({
            data: {
                name,
                members: {
                    create: [
                        { userId, role: 'ADMIN' }
                    ]
                }
            }
        });
        return workspace;
    }
    static async getWorkspaceDetails(workspaceId, userId) {
        // Check if user is a member
        const membership = await prisma_1.prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId,
                    workspaceId
                }
            }
        });
        if (!membership) {
            throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not have access to this workspace' };
        }
        const workspace = await prisma_1.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                workbooks: {
                    orderBy: { updatedAt: 'desc' }
                }
            }
        });
        if (!workspace) {
            throw { statusCode: 404, code: 'NOT_FOUND', message: 'Workspace not found' };
        }
        return {
            ...workspace,
            myRole: membership.role
        };
    }
    static async addMember(workspaceId, adminId, email, role) {
        const workspace = await prisma_1.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: { where: { userId: adminId, role: 'ADMIN' } } }
        });
        if (!workspace || workspace.members.length === 0)
            throw { statusCode: 403, message: 'Forbidden' };
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!targetUser)
            throw { statusCode: 404, message: 'User not found' };
        await prisma_1.prisma.workspaceMember.create({
            data: {
                workspaceId,
                userId: targetUser.id,
                role
            }
        });
    }
    static async getMembers(workspaceId, userId) {
        const workspace = await prisma_1.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: { where: { userId } } }
        });
        if (!workspace || workspace.members.length === 0)
            throw { statusCode: 403, message: 'Forbidden' };
        return prisma_1.prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: { user: { select: { id: true, name: true, email: true } } }
        });
    }
}
exports.WorkspaceService = WorkspaceService;
