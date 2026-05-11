import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';

const BODYGUARD_LIMITS = {
  JOIN_REQUESTS: 5,
  CHAT_MESSAGES: 30,
  GRID_UPDATES: 100,
  PAYLOAD_MAX_SIZE: 5000,
};

const ALLOWED_SHEET_ACTIONS = ['add_row', 'delete_row', 'add_column', 'delete_column', 'rename_sheet'];

const sanitize = (text: any): any => {
  if (typeof text !== 'string') return text;
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').slice(0, 500);
};

export let io: SocketServer;

export const initSockets = (httpServer: Server) => {
  io = new SocketServer(httpServer, {
    cors: { origin: (origin: any, callback: any) => callback(null, true), credentials: true }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token || token === 'dummy-token') {
      socket.data.userId = `guest-${uuidv4().slice(0, 8)}`;
      return next();
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string, role: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (e) {
      return next(new Error('AUTHENTICATION_FAILED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const clientIp = socket.handshake.address;
    let currentRoom: string | null = null;
    let currentWorkbookId: string | null = null;

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

        if (isLocked === 'true' && currentHost && currentHost !== userId) {
          socket.emit('join_request_denied', { reason: 'ROOM_LOCKED' });
          return;
        }
        if (!currentHost) await redis.set(`room:host:${workbookId}`, userId);
        
        // Track connection per user in room
        await redis.sadd(`room:users:${workbookId}:${userId}`, socket.id);
        
        if (currentRoom && currentRoom !== room) {
          socket.leave(currentRoom);
          socket.to(currentRoom).emit('user_left', { userId });
        }

        socket.join(room);
        currentRoom = room;
        currentWorkbookId = workbookId;

        const isHost = (await redis.get(`room:host:${workbookId}`)) === userId;
        socket.to(room).emit('user_joined', { userId, name, color: getUserColor(userId), isHost });
        if (callback) callback({ success: true, color: getUserColor(userId), isHost });
      } catch (err) { console.error('join_workbook error', err); }
    });

    socket.on('request_to_join', async (payload: { targetRoomId: string, userInfo: { name: string, socketId: string } }) => {
      try {
        const targetId = sanitize(payload.targetRoomId);
        const requesterName = sanitize(payload.userInfo.name);
        const room = `workbook:${targetId}`;
        const allowed = await checkRateLimit('join', BODYGUARD_LIMITS.JOIN_REQUESTS, 600);
        if (!allowed) return socket.emit('error', { message: 'RATE_LIMIT: Too many requests.' });
        const isLocked = await redis.get(`room:locked:${targetId}`);
        if (isLocked === 'true') {
          socket.to(room).emit('incoming_join_request', { requesterSocketId: socket.id, name: requesterName });
        } else {
          socket.emit('error', { message: 'ROOM_NOT_LOCKED' });
        }
      } catch (err) { console.error('request_to_join error', err); }
    });

    socket.on('cell_update', async (payload: { workbookId: string, sheetId: string, cellKey: string, cell: any }) => {
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;
      const allowed = await checkRateLimit('grid', BODYGUARD_LIMITS.GRID_UPDATES, 60);
      if (!allowed) return socket.emit('error', { message: 'RATE_LIMIT: Typing too fast!' });
      if (JSON.stringify(payload.cell).length > BODYGUARD_LIMITS.PAYLOAD_MAX_SIZE) return socket.emit('error', { message: 'PAYLOAD_TOO_LARGE' });

      socket.to(currentRoom).emit('cell_updated', { ...payload, userId });
      try {
        const { sheetId, cellKey, cell } = payload;
        const sheet = await prisma.sheet.findFirst({ where: { id: sheetId, workbookId: currentWorkbookId } });
        if (sheet) {
          const currentData = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
          const sanitizedVal = sanitize(cell.v);
          const sanitizedForm = sanitize(cell.f);
          currentData[cellKey] = { ...currentData[cellKey], ...cell, v: sanitizedVal, f: sanitizedForm };
          await prisma.sheet.update({ where: { id: sheetId }, data: { data: JSON.stringify(currentData) } });
        }
      } catch (err) { console.error('Socket persistence error:', err); }
    });

    socket.on('bulk_cell_update', async (payload: { workbookId: string, sheetId: string, updates: Record<string, any> }) => {
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;
      const allowed = await checkRateLimit('grid', BODYGUARD_LIMITS.GRID_UPDATES, 60);
      if (!allowed) return socket.emit('error', { message: 'RATE_LIMIT: Too many updates!' });

      socket.to(currentRoom).emit('bulk_cell_updated', { ...payload, userId });
      try {
        const { sheetId, updates } = payload;
        const sheet = await prisma.sheet.findFirst({ where: { id: sheetId, workbookId: currentWorkbookId } });
        if (sheet) {
          const currentData = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
          Object.entries(updates).forEach(([key, val]: [string, any]) => { 
            const sanitizedVal = sanitize(val.v);
            const sanitizedForm = sanitize(val.f);
            currentData[key] = { ...currentData[key], ...val, v: sanitizedVal, f: sanitizedForm }; 
          });
          await prisma.sheet.update({ where: { id: sheetId }, data: { data: JSON.stringify(currentData) } });
        }
      } catch (err) { console.error('Socket bulk persistence error:', err); }
    });

    socket.on('sheet_action', (payload: { workbookId: string, sheetId: string, action: string, index?: number, colIndex?: number }) => {
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;
      if (!ALLOWED_SHEET_ACTIONS.includes(payload.action)) return;
      socket.to(currentRoom).emit('sheet_action_received', payload);
    });

    socket.on('chat_message', async (payload: { workbookId: string, message: string, userName: string }) => {
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;
      const cleanMsg = sanitize(payload.message);
      const cleanUser = sanitize(payload.userName);
      if (!cleanMsg) return;
      const allowed = await checkRateLimit('chat', BODYGUARD_LIMITS.CHAT_MESSAGES, 60);
      if (!allowed) return socket.emit('error', { message: 'ANTI_SPAM: Slow down!' });
      socket.to(currentRoom).emit('chat_message_received', { userName: cleanUser, message: cleanMsg, timestamp: new Date().toISOString() });
    });

    socket.on('cursor_move', (payload: { workbookId: string, userName: string, sheetId: string, row: number, col: number, color: string }) => {
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;
      socket.to(currentRoom).emit('cursor_moved', { ...payload, userId });
    });

    socket.on('cell_lock', async (payload: { workbookId: string, cellKey: string, action: 'lock'|'unlock' }) => {
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;
      const lockKey = `cell:lock:${payload.workbookId}:${payload.cellKey}`;
      const userLocksKey = `user:locks:${userId}:${payload.workbookId}`;
      if (payload.action === 'lock') {
        const existing = await redis.get(lockKey);
        if (existing && existing !== userId) return socket.emit('cell_locked', { error: 'CELL_LOCKED', lockedBy: existing });
        await redis.set(lockKey, userId, 'EX', 5);
        await redis.sadd(userLocksKey, payload.cellKey);
        socket.to(currentRoom).emit('cell_locked', { userId, cellKey: payload.cellKey, action: 'lock' });
      } else {
        await redis.del(lockKey);
        await redis.srem(userLocksKey, payload.cellKey);
        socket.to(currentRoom).emit('cell_locked', { userId, cellKey: payload.cellKey, action: 'unlock' });
      }
    });

    socket.on('toggle_room_lock', async (payload: { workbookId: string, locked: boolean }) => {
      if (!currentRoom || currentWorkbookId !== payload.workbookId) return;
      const currentHost = await redis.get(`room:host:${payload.workbookId}`);
      if (currentHost !== userId) return socket.emit('error', { message: 'ONLY_HOST_CAN_LOCK' });
      await redis.set(`room:locked:${payload.workbookId}`, String(payload.locked));
      io.to(currentRoom).emit('room_lock_status', { locked: payload.locked });
    });

    socket.on('respond_to_join', async (payload: { requesterSocketId: string, approved: boolean, targetRoomId: string }) => {
      if (!currentRoom || currentWorkbookId !== payload.targetRoomId) return;
      const currentHost = await redis.get(`room:host:${payload.targetRoomId}`);
      if (currentHost !== userId) return socket.emit('error', { message: 'ONLY_HOST_CAN_RESPOND_TO_JOIN' });
      if (payload.approved) {
        io.to(payload.requesterSocketId).emit('join_request_accepted', { targetRoomId: payload.targetRoomId });
      } else {
        io.to(payload.requesterSocketId).emit('join_request_denied');
      }
    });

    socket.on('disconnect', async () => {
      if (currentRoom && currentWorkbookId) {
        // Remove this specific connection
        await redis.srem(`room:users:${currentWorkbookId}:${userId}`, socket.id);
        
        // 🛡️ SECURITY: Only proceed with cleanup if this was the LAST connection for this user
        const remainingTabs = await redis.scard(`room:users:${currentWorkbookId}:${userId}`);
        
        if (remainingTabs === 0) {
          socket.to(currentRoom).emit('user_left', { userId });
          
          const currentHost = await redis.get(`room:host:${currentWorkbookId}`);
          if (currentHost === userId) {
            const socketsInRoom = await io.in(currentRoom).fetchSockets();
            const realRemainingUsers = socketsInRoom.filter(s => s.data.userId !== userId);
            
            if (realRemainingUsers.length > 0) {
              const nextHost = realRemainingUsers[0].data.userId;
              await redis.set(`room:host:${currentWorkbookId}`, nextHost);
              io.to(currentRoom).emit('host_changed', { newHostId: nextHost });
            } else {
              await redis.del(`room:host:${currentWorkbookId}`);
              await redis.del(`room:locked:${currentWorkbookId}`);
            }
          }

          const locks = await redis.smembers(`user:locks:${userId}:${currentWorkbookId}`);
          if (locks.length > 0) {
            const keys = locks.map((l: string) => `cell:lock:${currentWorkbookId}:${l}`);
            await redis.del(...keys);
            await redis.del(`user:locks:${userId}:${currentWorkbookId}`);
            locks.forEach((cellKey: string) => { socket.to(currentRoom!).emit('cell_locked', { userId, cellKey, action: 'unlock' }); });
          }
        }
      }
    });
  });
};

const CURSOR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#a855f7','#ec4899'];
function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}
