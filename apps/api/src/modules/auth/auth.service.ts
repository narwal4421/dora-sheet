import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { JWTPayload } from '@smartsheet-ai/types';
import { JWTPayload } from '@smartsheet-ai/types';

export class AuthService {
  static async register(email: string, passwordRaw: string, name: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw { statusCode: 400, code: 'USER_EXISTS', message: 'User already exists' };
    }

    const passwordHash = await bcrypt.hash(passwordRaw, 12);

    const user = await prisma.$transaction(async (tx) => {
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

  static async login(email: string, passwordRaw: string) {
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { workspaces: { take: 1 } }
    });

    if (!user) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const isValid = await bcrypt.compare(passwordRaw, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const workspaceId = user.workspaces[0]?.workspaceId || '';
    
    const accessToken = this.generateAccessToken(user.id, user.email, user.role, workspaceId);
    const refreshToken = this.generateRefreshToken(user.id);

    return { user: { id: user.id, email: user.email, name: user.name, role: user.role, workspaceId }, accessToken, refreshToken };
  }

  static async refresh(oldRefreshToken: string) {
    const isRevoked = await redis.get(`revoked:rt:${oldRefreshToken}`);
    if (isRevoked) {
      throw { statusCode: 401, code: 'TOKEN_REVOKED', message: 'Token has been revoked' };
    }

    try {
      const payload = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
      const user = await prisma.user.findUnique({ 
        where: { id: payload.sub },
        include: { workspaces: { take: 1 } }
      });
      
      if (!user) throw new Error();

      // Rotate token: revoke old
      await redis.set(`revoked:rt:${oldRefreshToken}`, 'true', 'EX', 7 * 24 * 60 * 60);

      const workspaceId = user.workspaces[0]?.workspaceId || '';
      const accessToken = this.generateAccessToken(user.id, user.email, user.role, workspaceId);
      const newRefreshToken = this.generateRefreshToken(user.id);

      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw { statusCode: 401, code: 'INVALID_TOKEN', message: 'Invalid refresh token' };
    }
  }

  static async logout(refreshToken: string) {
    if (refreshToken) {
      await redis.set(`revoked:rt:${refreshToken}`, 'true', 'EX', 7 * 24 * 60 * 60);
    }
  }

  private static generateAccessToken(userId: string, email: string, role: string, workspaceId: string) {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId,
      email,
      role: role as 'ADMIN' | 'EDITOR' | 'VIEWER',
      workspaceId
    };
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
  }

  private static generateRefreshToken(userId: string) {
    return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }
}
