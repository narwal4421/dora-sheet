import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';

const BODYGUARD_LIMITS = {
  JOIN_REQUESTS: 20,
  CHAT_MESSAGES: 30,
  GRID_UPDATES: 100,
  PAYLOAD_MAX_SIZE: 5000,
};

const ALLOWED_SHEET_ACTIONS = ['insertRow', 'deleteRow', 'insertCol', 'deleteCol', 'rename_sheet', 'clearSheet', 'toggleFilter', 'sort'];

// Structured Logging for Security Events
const logSecurity = (action: string, data: any) => {
  console.log(`[SHIELD] [${new Date().toISOString()}] ${action}:`, JSON.stringify(data));
};

const sanitize = (text: any): any => {
  if (typeof text !== 'string') return text;
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').slice(0, 500);
};

export let io: SocketServer;

interface SocketData {
  userId: string;
  name?: string;
  color?: string;
  isHost?: boolean;
}

/**
 * GOD LEVEL SOCKET SERVER
 * Mission-critical real-time synchronization engine with multi-layered security.
 */

export const initSockets = (httpServer: Server) => {
  io = new SocketServer(httpServer, {
    cors: { origin: (origin: any, callback: any) => callback(null, true), credentials: true },
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // --- MIDDLEWARE: AUTH & SECURITY ---
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const clientIp = socket.handshake.address;

    // Rate limit connection attempts
    const connectKey = `shield:connect:${clientIp}`;
    const attempts = await redis.incr(connectKey);
    if (attempts === 1) await redis.expire(connectKey, 60);
    if (attempts > 50) return next(new Error('THROTTLED'));

    if (!token || token === 'dummy-token') {
      // Use client-provided stable guestId to maintain identity across reconnections
      const guestId = socket.handshake.auth.guestId;
      socket.data.userId = (guestId && typeof guestId === 'string') 
        ? guestId 
        : `guest-${uuidv4().slice(0, 8)}`;
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (e) {
      return next(new Error('AUTH_FAILED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const clientIp = socket.handshake.address;
    let activeWorkbookId: string | null = null;

    logSecurity('CLIENT_CONNECTED', { userId, ip: clientIp });

    // --- DOMAIN: COLLABORATION ---
    
    socket.on('join_workbook', async (payload: any, callback: any) => {
      const { workbookId, name } = payload;
      const room = `workbook:${workbookId}`;
      
      try {
        const [isLocked, currentHost, isApproved] = await Promise.all([
          redis.get(`room:locked:${workbookId}`),
          redis.get(`room:host:${workbookId}`),
          redis.get(`room:approved:${workbookId}:${userId}`)
        ]);

        if (isLocked === 'true' && currentHost && currentHost !== userId && isApproved !== 'true') {
          return callback?.({ success: false, reason: 'LOCKED' });
        }

        // Atomic Host Assignment
        if (!currentHost) {
          await redis.set(`room:host:${workbookId}`, userId, 'NX');
        }

        const hostId = await redis.get(`room:host:${workbookId}`);
        const isHost = hostId === userId;

        socket.data.name = sanitize(name);
        socket.data.color = getUserColor(userId);
        socket.data.isHost = isHost;
        activeWorkbookId = workbookId;

        await redis.sadd(`room:users:${workbookId}:${userId}`, socket.id);
        socket.join(room);
        
        socket.to(room).emit('user_joined', { userId, name: socket.data.name, color: socket.data.color, isHost });

        const sockets = await io.in(room).fetchSockets();
        const members = Array.from(new Map(sockets.map(s => [s.data.userId, {
          userId: s.data.userId,
          name: s.data.name,
          color: s.data.color,
          isHost: s.data.userId === hostId
        }])).values());

        const workbook = await prisma.workbook.findUnique({ where: { id: workbookId }, select: { name: true } });
        const workbookName = workbook?.name || 'Untitled Workbook';

        callback?.({ success: true, isHost, members, color: socket.data.color, userId, workbookName });
      } catch (err) {
        console.error('Join Error:', err);
        callback?.({ success: false, reason: 'SERVER_ERROR' });
      }
    });

    socket.on('request_to_join', async (payload: any) => {
      const { targetRoomId, userInfo } = payload;
      const room = `workbook:${targetRoomId}`;
      const isLocked = await redis.get(`room:locked:${targetRoomId}`);
      
      if (isLocked === 'true') {
        io.to(room).emit('incoming_join_request', { 
          requesterSocketId: socket.id, 
          name: sanitize(userInfo.name), 
          requesterUserId: userId 
        });
      } else {
        socket.emit('join_request_accepted', { targetRoomId });
      }
    });

    socket.on('respond_to_join', async (payload: any) => {
      const { requesterSocketId, requesterUserId, approved, targetRoomId } = payload;
      const hostId = await redis.get(`room:host:${targetRoomId}`);
      if (hostId !== userId) return;

      if (approved) {
        await redis.set(`room:approved:${targetRoomId}:${requesterUserId}`, 'true', 'EX', 3600);
        io.to(requesterSocketId).emit('join_request_accepted', { targetRoomId });
      } else {
        io.to(requesterSocketId).emit('join_request_denied');
      }
    });

    socket.on('update_user_name', async (payload: any) => {
      if (!activeWorkbookId) return;
      const { name } = payload;
      socket.data.name = sanitize(name);
      // We broadcast a new user_joined-like event or a specific name update event
      // However, we can simply emit 'user_joined' to force the client to update their member list
      io.to(`workbook:${activeWorkbookId}`).emit('user_joined', { 
        userId, 
        name: socket.data.name, 
        color: socket.data.color, 
        isHost: socket.data.isHost 
      });
    });

    socket.on('toggle_room_lock', async (payload: any) => {
      const { workbookId, locked } = payload;
      const hostId = await redis.get(`room:host:${workbookId}`);
      
      // If no host registered (e.g., Redis was cleared), let socket.data.isHost be the fallback
      const isAuthorized = hostId === userId || (!hostId && socket.data.isHost);
      
      if (!isAuthorized) {
        logSecurity('LOCK_REJECTED', { userId, hostId, workbookId });
        return;
      }

      // If Redis was cleared but client is still marked as host, re-register
      if (!hostId && socket.data.isHost) {
        await redis.set(`room:host:${workbookId}`, userId, 'NX');
      }
      
      await redis.set(`room:locked:${workbookId}`, locked ? 'true' : 'false');
      io.to(`workbook:${workbookId}`).emit('room_lock_status', { locked });
      logSecurity('LOCK_TOGGLED', { userId, workbookId, locked });
    });

    // --- DOMAIN: GRID ENGINE ---

    socket.on('cell_update', async (payload: any) => {
      if (!activeWorkbookId || activeWorkbookId !== payload.workbookId) return;
      socket.to(`workbook:${activeWorkbookId}`).emit('cell_updated', { ...payload, userId });
      persistCellUpdate(payload.sheetId, activeWorkbookId, payload.cellKey, payload.cell).catch(e => console.error('DB_ERROR', e));
    });

    socket.on('bulk_cell_update', async (payload: any) => {
      if (!activeWorkbookId) return;
      socket.to(`workbook:${activeWorkbookId}`).emit('bulk_cell_updated', { ...payload, userId });
      persistBulkUpdate(payload.sheetId, activeWorkbookId, payload.updates).catch(e => console.error('DB_BULK_ERROR', e));
    });

    socket.on('cell_lock', async (payload: any) => {
      if (!activeWorkbookId) return;
      const { cellKey, action } = payload;
      const key = `cell:lock:${activeWorkbookId}:${cellKey}`;
      
      if (action === 'lock') {
        if (await redis.set(key, userId, 'NX', 'EX', 30)) {
          await redis.sadd(`user:locks:${userId}:${activeWorkbookId}`, cellKey);
          io.to(`workbook:${activeWorkbookId}`).emit('cell_locked', { userId, cellKey, action: 'lock' });
        }
      } else {
        if ((await redis.get(key)) === userId) {
          await redis.del(key);
          await redis.srem(`user:locks:${userId}:${activeWorkbookId}`, cellKey);
          io.to(`workbook:${activeWorkbookId}`).emit('cell_locked', { userId, cellKey, action: 'unlock' });
        }
      }
    });

    socket.on('cursor_move', (payload: any) => {
      if (!activeWorkbookId) return;
      socket.to(`workbook:${activeWorkbookId}`).emit('cursor_moved', { ...payload, userId });
    });

    // --- DOMAIN: CHAT & UTILS ---

    socket.on('chat_message', (payload: any) => {
      if (!activeWorkbookId) return;
      io.to(`workbook:${activeWorkbookId}`).emit('chat_message_received', {
        userName: socket.data.name,
        message: sanitize(payload.message),
        timestamp: new Date().toISOString()
      });
    });

    socket.on('sheet_action', async (payload: any) => {
      if (!activeWorkbookId) return;
      socket.to(`workbook:${activeWorkbookId}`).emit('sheet_action_received', payload);
      
      if (payload.action === 'clearSheet') {
        const sheetId = payload.sheetId;
        if (sheetId) {
          await prisma.sheet.update({ where: { id: sheetId }, data: { data: JSON.stringify({}) } });
        }
      }

      if (payload.action === 'rename_sheet') {
        const name = payload.payload?.name || payload.name;
        if (name) {
          await prisma.workbook.update({ where: { id: activeWorkbookId }, data: { name } });
        }
      }
    });

    // --- SYSTEM: DISCONNECT ---

    socket.on('disconnect', async () => {
      if (!activeWorkbookId) return;
      const room = `workbook:${activeWorkbookId}`;

      await redis.srem(`room:users:${activeWorkbookId}:${userId}`, socket.id);
      const remaining = await redis.scard(`room:users:${activeWorkbookId}:${userId}`);

      if (remaining === 0) {
        socket.to(room).emit('user_left', { userId });
        
        // Host Handover logic
        const currentHost = await redis.get(`room:host:${activeWorkbookId}`);
        if (currentHost === userId) {
          const sockets = await io.in(room).fetchSockets();
          const next = sockets.find(s => s.data.userId !== userId);
          if (next) {
            await redis.set(`room:host:${activeWorkbookId}`, next.data.userId);
            io.to(room).emit('host_changed', { newHostId: next.data.userId });
          } else {
            await redis.del(`room:host:${activeWorkbookId}`, `room:locked:${activeWorkbookId}`);
          }
        }

        // Auto-unlock cells
        const locks = await redis.smembers(`user:locks:${userId}:${activeWorkbookId}`);
        if (locks.length > 0) {
          await redis.del(...locks.map((l: string) => `cell:lock:${activeWorkbookId}:${l}`));
          await redis.del(`user:locks:${userId}:${activeWorkbookId}`);
          locks.forEach((l: string) => io.to(room).emit('cell_locked', { userId, cellKey: l, action: 'unlock' }));
        }
      }
    });
  });
};

async function persistCellUpdate(sheetId: string, workbookId: string, cellKey: string, cell: any) {
  const sheet = await prisma.sheet.findFirst({ where: { id: sheetId, workbookId } });
  if (sheet) {
    const data = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
    data[cellKey] = { ...data[cellKey], ...cell, v: sanitize(cell.v), f: sanitize(cell.f) };
    await prisma.sheet.update({ where: { id: sheetId }, data: { data: JSON.stringify(data) } });
  }
}

async function persistBulkUpdate(sheetId: string, workbookId: string, updates: Record<string, any>) {
  const sheet = await prisma.sheet.findFirst({ where: { id: sheetId, workbookId } });
  if (sheet) {
    const data = typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data;
    Object.entries(updates).forEach(([key, val]: [string, any]) => {
      data[key] = { ...data[key], ...val, v: sanitize(val.v), f: sanitize(val.f) };
    });
    await prisma.sheet.update({ where: { id: sheetId }, data: { data: JSON.stringify(data) } });
  }
}

const CURSOR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#a855f7','#ec4899'];
const getUserColor = (id: string) => CURSOR_COLORS[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0) % CURSOR_COLORS.length];

