"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../config/prisma");
const env_1 = require("../../config/env");
const redis_1 = require("../../config/redis");
class AuthService {
    static async register(email, passwordRaw, name) {
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw { statusCode: 400, code: 'USER_EXISTS', message: 'User already exists' };
        }
        const passwordHash = await bcryptjs_1.default.hash(passwordRaw, 12);
        const user = await prisma_1.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    name,
                    passwordHash,
                    role: "EDITOR", // Default a new user to EDITOR or let's say ADMIN of their workspace
                },
            });
            const newWorkspace = await tx.workspace.create({
                data: {
                    name: `${name}'s Workspace`,
                    members: {
                        create: [
                            { userId: newUser.id, role: "ADMIN" },
                        ],
                    },
                },
            });
            return { ...newUser, workspaceId: newWorkspace.id };
        });
        const accessToken = this.generateAccessToken(user.id, user.email, user.role, user.workspaceId);
        const refreshToken = this.generateRefreshToken(user.id);
        return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken, refreshToken };
    }
    static async login(email, passwordRaw) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: { workspaces: { take: 1 } }
        });
        if (!user) {
            throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
        }
        const isValid = await bcryptjs_1.default.compare(passwordRaw, user.passwordHash);
        if (!isValid) {
            throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
        }
        const workspaceId = user.workspaces[0]?.workspaceId || '';
        const accessToken = this.generateAccessToken(user.id, user.email, user.role, workspaceId);
        const refreshToken = this.generateRefreshToken(user.id);
        return { user: { id: user.id, email: user.email, name: user.name, role: user.role, workspaceId }, accessToken, refreshToken };
    }
    static async refresh(oldRefreshToken) {
        const isRevoked = await redis_1.redis.get(`revoked:rt:${oldRefreshToken}`);
        if (isRevoked) {
            throw { statusCode: 401, code: 'TOKEN_REVOKED', message: 'Token has been revoked' };
        }
        try {
            const payload = jsonwebtoken_1.default.verify(oldRefreshToken, env_1.env.JWT_REFRESH_SECRET);
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: payload.sub },
                include: { workspaces: { take: 1 } }
            });
            if (!user)
                throw new Error();
            // Rotate token: revoke old
            await redis_1.redis.set(`revoked:rt:${oldRefreshToken}`, 'true', 'EX', 7 * 24 * 60 * 60);
            const workspaceId = user.workspaces[0]?.workspaceId || '';
            const accessToken = this.generateAccessToken(user.id, user.email, user.role, workspaceId);
            const newRefreshToken = this.generateRefreshToken(user.id);
            return { accessToken, refreshToken: newRefreshToken };
        }
        catch {
            throw { statusCode: 401, code: 'INVALID_TOKEN', message: 'Invalid refresh token' };
        }
    }
    static async logout(refreshToken) {
        if (refreshToken) {
            await redis_1.redis.set(`revoked:rt:${refreshToken}`, 'true', 'EX', 7 * 24 * 60 * 60);
        }
    }
    static generateAccessToken(userId, email, role, workspaceId) {
        const payload = {
            userId,
            email,
            role: role,
            workspaceId
        };
        return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, { expiresIn: '15m' });
    }
    static generateRefreshToken(userId) {
        return jsonwebtoken_1.default.sign({ sub: userId }, env_1.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    }
}
exports.AuthService = AuthService;
