import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';

const BODYGUARD_LIMITS = {
  JOIN_REQUESTS: 5, // max 5 requests per 10 min
  CHAT_MESSAGES: 30, // max 30 messages per 1 min
  WINDOW_MS: 60000,
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
    .slice(0, 500); // Strict length limit
};

export let io: SocketServer;

export const initSockets = (httpServer: Server) => {
  io = new SocketServer(httpServer, {
    cors: { 
      origin: (origin: any, callback: any) => {
        callback(null, true);
      }, 
      credentials: true 
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token || token === 'dummy-token') {
      socket.data.userId = 'local-dev-user';
      return next();
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string, role: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (e) {
      // fallback for local demo
      socket.data.userId = 'local-dev-user';
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    let currentRoom: string | null = null;

    socket.on('join_workbook', async (payload: { workbookId: string, name?: string }, callback) => {
      try {
        const workbookId = sanitize(payload.workbookId);
        const name = sanitize(payload.name || 'Guest User');
        const room = `workbook:${workbookId}`;
        const userName = name;

        // 🛡️ SECURITY GATE 1: Check if room is locked
        const isLocked = await redis.get(`room:locked:${workbookId}`);
        const currentHost = await redis.get(`room:host:${workbookId}`);

        // If locked and user is NOT the host, deny entry
        if (isLocked === 'true' && currentHost !== userId) {
          socket.emit('join_request_denied', { reason: 'ROOM_LOCKED' });
          return;
        }

        // 🛡️ SECURITY GATE 2: Assign Host if none exists
        if (!currentHost) {
          await redis.set(`room:host:${workbookId}`, userId);
        }
        
        if (currentRoom) {
          socket.leave(currentRoom);
          socket.to(currentRoom).emit('user_left', { userId });
        }

        socket.join(room);
        currentRoom = room;

        const userColor = getUserColor(userId);
        const isHost = (await redis.get(`room:host:${workbookId}`)) === userId;

        socket.to(room).emit('user_joined', { userId, name: userName, color: userColor, isHost });
        
        if (callback) callback({ success: true, color: userColor, isHost });
      } catch (err) {
        console.error('join_workbook error', err);
      }
    });

    socket.on('request_to_join', async (payload: { targetRoomId: string, userInfo: { name: string, socketId: string } }) => {
      try {
        const targetId = sanitize(payload.targetRoomId);
        const requesterName = sanitize(payload.userInfo.name);
        
        const room = `workbook:${targetId}`;
        const isLocked = await redis.get(`room:locked:${targetId}`);
        
        // 🛡️ THE BODYGUARD: Rate Limit Join Requests
        const clientIp = socket.handshake.address;
        const rateKey = `shield:join:${clientIp}`;
        const count = await redis.incr(rateKey);
        if (count === 1) await redis.expire(rateKey, 600); // 10 min window
        if (count > BODYGUARD_LIMITS.JOIN_REQUESTS) {
          socket.emit('error', { message: 'RATE_LIMIT: Too many join requests. Try again in 10 mins.' });
          return;
        }
        
        if (isLocked === 'true') {
          socket.emit('join_request_denied', { reason: 'ROOM_LOCKED' });
          return;
        }

        // Broadcast to everyone in the target room (specifically the host)
        socket.to(room).emit('incoming_join_request', { 
          requesterSocketId: socket.id, 
          name: requesterName 
        });
      } catch (err) {
        console.error('request_to_join error', err);
      }
    });

    socket.on('toggle_room_lock', async (payload: { workbookId: string, locked: boolean }) => {
      if (!currentRoom) return;
      
      // 🛡️ SECURITY CHECK: Only the host can toggle the lock
      const currentHost = await redis.get(`room:host:${payload.workbookId}`);
      if (currentHost !== userId) {
        socket.emit('error', { message: 'ONLY_HOST_CAN_LOCK' });
        return;
      }

      await redis.set(`room:locked:${payload.workbookId}`, String(payload.locked));
      // Notify all users in the room about the status change
      io.to(currentRoom).emit('room_lock_status', { locked: payload.locked });
    });

    socket.on('respond_to_join', (payload: { requesterSocketId: string, approved: boolean, targetRoomId: string }) => {
      if (payload.approved) {
        io.to(payload.requesterSocketId).emit('join_request_accepted', { 
          targetRoomId: payload.targetRoomId 
        });
      } else {
        io.to(payload.requesterSocketId).emit('join_request_denied');
      }
    });

    socket.on('leave_workbook', async (payload: { workbookId: string }) => {
      const room = `workbook:${payload.workbookId}`;
      socket.leave(room);
      if (currentRoom === room) currentRoom = null;
      socket.to(room).emit('user_left', { userId });
      
      // Release locks
      const locks = await redis.smembers(`user:locks:${userId}:${payload.workbookId}`);
      if (locks.length > 0) {
        const keys = locks.map((l: string) => `cell:lock:${payload.workbookId}:${l}`);
        await redis.del(...keys);
        await redis.del(`user:locks:${userId}:${payload.workbookId}`);
        locks.forEach((cellKey: string) => {
          socket.to(room).emit('cell_locked', { userId, cellKey, action: 'unlock' });
        });
      }
    });

    socket.on('disconnect', async () => {
      if (currentRoom) {
        const workbookId = currentRoom.split(':')[1];
        socket.to(currentRoom).emit('user_left', { userId });
        
        // Release locks
        const locks = await redis.smembers(`user:locks:${userId}:${workbookId}`);
        if (locks.length > 0) {
          const keys = locks.map((l: string) => `cell:lock:${workbookId}:${l}`);
          await redis.del(...keys);
          await redis.del(`user:locks:${userId}:${workbookId}`);
          locks.forEach((cellKey: string) => {
            socket.to(currentRoom!).emit('cell_locked', { userId, cellKey, action: 'unlock' });
          });
        }
      }
    });

    socket.on('cell_update', async (payload: { sheetId: string, cellKey: string, cell: any }) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('cell_updated', { ...payload, userId });

      // Persist to DB in background
      try {
        const { sheetId, cellKey, cell } = payload;
        const sheet = await prisma.sheet.findUnique({ where: { id: sheetId } });
        if (sheet) {
          const currentData = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
          currentData[cellKey] = { ...currentData[cellKey], ...cell };
          await prisma.sheet.update({
            where: { id: sheetId },
            data: { data: JSON.stringify(currentData) }
          });
        }
      } catch (err) {
        console.error('Socket persistence error:', err);
      }
    });

    socket.on('bulk_cell_update', async (payload: { sheetId: string, updates: Record<string, any> }) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('bulk_cell_updated', { ...payload, userId });

      try {
        const { sheetId, updates } = payload;
        const sheet = await prisma.sheet.findUnique({ where: { id: sheetId } });
        if (sheet) {
          const currentData = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
          Object.entries(updates).forEach(([key, val]) => {
            currentData[key] = { ...currentData[key], ...val };
          });
          await prisma.sheet.update({
            where: { id: sheetId },
            data: { data: JSON.stringify(currentData) }
          });
        }
      } catch (err) {
        console.error('Socket bulk persistence error:', err);
      }
    });

    socket.on('cursor_move', (payload: { userName: string, sheetId: string, row: number, col: number, color: string }) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('cursor_moved', { ...payload, userId });
    });

    socket.on('cell_lock', async (payload: { cellKey: string, action: 'lock'|'unlock' }) => {
      if (!currentRoom) return;
      const workbookId = currentRoom.split(':')[1];
      const lockKey = `cell:lock:${workbookId}:${payload.cellKey}`;
      const userLocksKey = `user:locks:${userId}:${workbookId}`;

      if (payload.action === 'lock') {
        const existing = await redis.get(lockKey);
        if (existing && existing !== userId) {
          socket.emit('cell_locked', { error: 'CELL_LOCKED', lockedBy: existing });
          return;
        }
        await redis.set(lockKey, userId, 'EX', 5);
        await redis.sadd(userLocksKey, payload.cellKey);
        socket.to(currentRoom).emit('cell_locked', { userId, cellKey: payload.cellKey, action: 'lock' });
      } else {
        await redis.del(lockKey);
        await redis.srem(userLocksKey, payload.cellKey);
        socket.to(currentRoom).emit('cell_locked', { userId, cellKey: payload.cellKey, action: 'unlock' });
      }
    });

    socket.on('sheet_action', async (payload: { sheetId: string, action: string, index?: number, colIndex?: number }) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('sheet_action_received', payload);
    });

    socket.on('chat_message', async (payload: { workbookId: string, message: string, userName: string }) => {
      const { workbookId } = payload;
      const cleanMsg = sanitize(payload.message);
      const cleanUser = sanitize(payload.userName);

      if (!cleanMsg) return;

      // 🛡️ THE BODYGUARD: Rate Limit Chat
      const clientIp = socket.handshake.address;
      const rateKey = `shield:chat:${clientIp}`;
      const count = await redis.incr(rateKey);
      if (count === 1) await redis.expire(rateKey, 60);
      if (count > BODYGUARD_LIMITS.CHAT_MESSAGES) {
        socket.emit('error', { message: 'ANTI_SPAM: You are typing too fast!' });
        return;
      }

      const room = `workbook:${workbookId}`;
      socket.to(room).emit('chat_message_received', { 
        userName: cleanUser, 
        message: cleanMsg, 
        timestamp: new Date().toISOString() 
      });
    });
  });
};

const CURSOR_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#6366f1','#a855f7','#ec4899'
];

function getUserColor(userId: string): string {
  const hash = userId.split('').reduce(
    (acc, char) => acc + char.charCodeAt(0), 0
  );
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}
