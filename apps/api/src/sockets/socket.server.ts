import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';

const BODYGUARD_LIMITS = {
  JOIN_REQUESTS: 5,   // max 5 requests per 10 min
  CHAT_MESSAGES: 30,  // max 30 messages per 1 min
  GRID_UPDATES: 100,  // max 100 cell updates per 1 min
  PAYLOAD_MAX_SIZE: 5000, // max 5KB per cell payload
};

// 🛡️ THE BODYGUARD: Security Sanitization
const sanitize = (text: string) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .slice(0, 500);
};

export let io: SocketServer;

export const initSockets = (httpServer: Server) => {
  io = new SocketServer(httpServer, {
    cors: { origin: (origin: any, callback: any) => callback(null, true), credentials: true }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token || token === 'dummy-token') {
      // In strict production, we'd block here. For now, we allow local-dev but mark it.
      socket.data.userId = 'local-dev-user';
      return next();
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string, role: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (e) {
      // 🛡️ SECURITY: If token is provided but invalid, KICK THEM.
      return next(new Error('AUTHENTICATION_FAILED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const clientIp = socket.handshake.address;
    let currentRoom: string | null = null;
    let currentWorkbookId: string | null = null;

    // 🛡️ INTERNAL HELPER: Rate Limiter
    const checkRateLimit = async (type: string, limit: number, windowSec: number) => {
      const key = `shield:${type}:${clientIp}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSec);
      return count <= limit;
    };

    socket.on('join_workbook', async (payload: { workbookId: string, name?: string }, callback) => {
      try {
        const workbookId = sanitize(payload.workbookId);
        const name = sanitize(payload.name || 'Guest User');
        const room = `workbook:${workbookId}`;
        
        const isLocked = await redis.get(`room:locked:${workbookId}`);
        const currentHost = await redis.get(`room:host:${workbookId}`);

        if (isLocked === 'true' && currentHost !== userId) {
          socket.emit('join_request_denied', { reason: 'ROOM_LOCKED' });
          return;
        }

        if (!currentHost) await redis.set(`room:host:${workbookId}`, userId);
        
        if (currentRoom) {
          socket.leave(currentRoom);
          socket.to(currentRoom).emit('user_left', { userId });
        }

        socket.join(room);
        currentRoom = room;
        currentWorkbookId = workbookId;

        const userColor = getUserColor(userId);
        const isHost = (await redis.get(`room:host:${workbookId}`)) === userId;
        socket.to(room).emit('user_joined', { userId, name, color: userColor, isHost });
        if (callback) callback({ success: true, color: userColor, isHost });
      } catch (err) { console.error('join_workbook error', err); }
    });

    socket.on('cell_update', async (payload: { workbookId: string, sheetId: string, cellKey: string, cell: any }) => {
      // 🛡️ SECURITY 1: Room Affinity
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;

      // 🛡️ SECURITY 2: Rate Limit (Grid Flood Protection)
      const allowed = await checkRateLimit('grid', BODYGUARD_LIMITS.GRID_UPDATES, 60);
      if (!allowed) {
        socket.emit('error', { message: 'RATE_LIMIT: Typing too fast!' });
        return;
      }

      // 🛡️ SECURITY 3: Payload Size Limit
      if (JSON.stringify(payload.cell).length > BODYGUARD_LIMITS.PAYLOAD_MAX_SIZE) {
        socket.emit('error', { message: 'PAYLOAD_TOO_LARGE' });
        return;
      }

      socket.to(currentRoom).emit('cell_updated', { ...payload, userId });
      try {
        const { sheetId, cellKey, cell } = payload;
        const sheet = await prisma.sheet.findUnique({ where: { id: sheetId } });
        if (sheet) {
          const currentData = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
          currentData[cellKey] = { ...currentData[cellKey], ...cell };
          await prisma.sheet.update({ where: { id: sheetId }, data: { data: JSON.stringify(currentData) } });
        }
      } catch (err) { console.error('Socket persistence error:', err); }
    });

    socket.on('chat_message', async (payload: { workbookId: string, message: string, userName: string }) => {
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;

      const cleanMsg = sanitize(payload.message);
      const cleanUser = sanitize(payload.userName);
      if (!cleanMsg) return;

      const allowed = await checkRateLimit('chat', BODYGUARD_LIMITS.CHAT_MESSAGES, 60);
      if (!allowed) {
        socket.emit('error', { message: 'ANTI_SPAM: Slow down!' });
        return;
      }

      socket.to(currentRoom).emit('chat_message_received', { userName: cleanUser, message: cleanMsg, timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', async () => {
      if (currentRoom && currentWorkbookId) {
        socket.to(currentRoom).emit('user_left', { userId });
        const locks = await redis.smembers(`user:locks:${userId}:${currentWorkbookId}`);
        if (locks.length > 0) {
          const keys = locks.map((l: string) => `cell:lock:${currentWorkbookId}:${l}`);
          await redis.del(...keys);
          await redis.del(`user:locks:${userId}:${currentWorkbookId}`);
          locks.forEach((cellKey: string) => {
            socket.to(currentRoom!).emit('cell_locked', { userId, cellKey, action: 'unlock' });
          });
        }
      }
    });

    // ... (rest of the handlers: bulk_cell_update, cursor_move, cell_lock, etc. would follow same patterns)
  });
};

const CURSOR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#a855f7','#ec4899'];
function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}
