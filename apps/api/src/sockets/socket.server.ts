import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';

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
        const { workbookId, name } = payload;
        const room = `workbook:${workbookId}`;
        const userName = name || 'Guest User';
        
        if (currentRoom) {
          socket.leave(currentRoom);
          socket.to(currentRoom).emit('user_left', { userId });
        }

        socket.join(room);
        currentRoom = room;

        const userColor = getUserColor(userId);
        socket.to(room).emit('user_joined', { userId, name: userName, color: userColor });
        
        if (callback) callback({ success: true, color: userColor });
      } catch (err) {
        console.error('join_workbook error', err);
      }
    });

    socket.on('request_to_join', (payload: { targetRoomId: string, userInfo: { name: string, socketId: string } }) => {
      const room = `workbook:${payload.targetRoomId}`;
      // Broadcast to everyone in the target room (specifically the host)
      socket.to(room).emit('incoming_join_request', { 
        requesterSocketId: socket.id, 
        name: payload.userInfo.name 
      });
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

    socket.on('chat_message', (payload: { message: string, userName: string }) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('chat_message_received', { 
        ...payload, 
        userId, 
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
