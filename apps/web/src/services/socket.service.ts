import { io, Socket } from 'socket.io-client';
import { useSheetStore } from '../store/useSheetStore';
import type { CellUpdateEvent, CursorMoveEvent, CellLockEvent } from '../store/useSheetStore';
import { useCallStore } from '../store/useCallStore';

/**
 * Realtime Collaboration Socket Service
 * Enterprise-grade communication layer with Promise-based orchestration,
 * automated event buffering, and real-time state synchronization.
 */

export const SocketEvent = {
  CELL_UPDATE: 'cell_update',
  BULK_CELL_UPDATE: 'bulk_cell_update',
  CURSOR_MOVE: 'cursor_move',
  CELL_LOCK: 'cell_lock',
  SHEET_ACTION: 'sheet_action',
  CHAT_MESSAGE: 'chat_message',
  JOIN_WORKBOOK: 'join_workbook',
  LEAVE_WORKBOOK: 'leave_workbook',
  TOGGLE_LOCK: 'toggle_room_lock',
  REQUEST_JOIN: 'request_to_join',
  RESPOND_JOIN: 'respond_to_join',
  UPDATE_NAME: 'update_user_name',
  START_CALL: 'start_call',
} as const;

type SocketEventType = typeof SocketEvent[keyof typeof SocketEvent];

interface SocketResponse {
  success: boolean;
  isHost?: boolean;
  members?: { userId: string, name: string, color: string, isHost: boolean }[];
  message?: string;
  reason?: string;
  color?: string;
  userId?: string;
  workbookName?: string;
}

class SocketService {
  private static instance: SocketService;
  public socket: Socket | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventBuffer: { event: string, payload: unknown, callback?: (res: any) => void }[] = [];
  private isConnecting: boolean = false;
  private lastCursorEmitTime = 0;
  private lastCursorPosition = { sheetId: '', row: -1, col: -1, selStart: '', selEnd: '' };
  private cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCursorPayload: { userName: string; sheetId: string; row: number; col: number; color?: string; selectionRange?: { start: string; end: string } | null } | null = null;

  private constructor() {
    // Start health check
    setInterval(() => {
      if (this.socket?.connected) {
        useSheetStore.getState().cleanupStaleCursors();
      }
    }, 5000);
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect() {
    if (this.socket?.connected || this.isConnecting) return;
    this.isConnecting = true;

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = import.meta.env.VITE_API_URL || 
      (isLocalhost ? 'http://localhost:3002' : 'https://dora-sheet-api.onrender.com');

    // Immediately ping the health endpoint to wake Render from sleep
    if (!isLocalhost) {
      fetch(apiUrl + '/api/v1/health').catch(() => {});
    }

    // Generate a stable guest ID that persists across page refreshes/reconnections
    if (!localStorage.getItem('guestId')) {
      localStorage.setItem('guestId', `guest-${crypto.randomUUID().slice(0, 8)}`);
    }

    this.socket = io(apiUrl, {
      auth: (cb) => {
        cb({ 
          token: localStorage.getItem('token') || 'dummy-token',
          guestId: localStorage.getItem('guestId')
        });
      },
      transports: ['websocket', 'polling'], // websocket first for instant zero-latency connection
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      useSheetStore.getState().setSocketConnected(true);
      
      const hasBufferedJoin = this.eventBuffer.some(e => e.event === SocketEvent.JOIN_WORKBOOK);
      this.flushBuffer();
      
      const workbookId = this.getWorkbookId();
      if (!hasBufferedJoin && workbookId && workbookId !== 'default-workbook-id') {
        this.joinWorkbook();
      }
    });

    this.socket.on('disconnect', () => {
      useSheetStore.getState().setSocketConnected(false);
    });

    this.socket.on('connect_error', () => {
      this.isConnecting = false;
    });

    // Keep Render backend alive — ping every 8 minutes
    setInterval(() => {
      if (!this.socket?.connected) {
        fetch(apiUrl + '/api/v1/health').catch(() => {});
      }
    }, 8 * 60 * 1000);

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('cell_updated', (event: CellUpdateEvent) => useSheetStore.getState().applyRemoteUpdate(event));
    this.socket.on('bulk_cell_updated', (event: { sheetId?: string, updates: Record<string, Partial<import('../store/useSheetStore').CellData>> }) => useSheetStore.getState().applyRemoteBulkUpdate(event.updates, event.sheetId));
    this.socket.on('cursor_moved', (event: CursorMoveEvent) => useSheetStore.getState().updateRemoteCursor(event));
    this.socket.on('cell_locked', (event: CellLockEvent) => useSheetStore.getState().updateCellLock(event));
    this.socket.on('sheet_action_received', (payload: { action: string, index?: number, colIndex?: number, name?: string, data?: unknown, sender?: string }) => useSheetStore.getState().applyRemoteSheetAction(payload));
    this.socket.on('incoming_join_request', (payload: { requesterSocketId: string, requesterUserId: string, name: string }) => useSheetStore.getState().addJoinRequest(payload));
    this.socket.on('chat_message_received', (payload: { id?: string, userName: string, message: string, timestamp: string }) => useSheetStore.getState().addTeamMessage(payload));
    this.socket.on('room_lock_status', (payload: { locked: boolean }) => useSheetStore.getState().setRoomLocked(payload.locked));
    this.socket.on('host_changed', (data: { newHostId: string }) => {
      const state = useSheetStore.getState();
      state.setIsHost(data.newHostId === state.localUserId);
    });

    this.socket.on('user_joined', (user: { userId: string, name: string, color: string, isHost: boolean }) => {
      const state = useSheetStore.getState();
      state.setConnectedUsers([...state.connectedUsers.filter(u => u.userId !== user.userId), user]);
    });

    this.socket.on('user_left', (payload: { userId: string }) => {
      const state = useSheetStore.getState();
      state.setConnectedUsers(state.connectedUsers.filter(u => u.userId !== payload.userId));
      state.removeRemoteCursor(payload.userId);
    });

    this.socket.on('join_request_accepted', () => {
      useSheetStore.getState().setIsWaitingForApproval(false);
      this.joinWorkbook();
    });

    this.socket.on('join_request_denied', (payload: { reason?: string }) => {
      if (payload?.reason === 'ROOM_LOCKED') {
        useSheetStore.getState().setRoomLockError(true);
      } else {
        useSheetStore.getState().setIsWaitingForApproval(false);
      }
    });

    this.socket.on('incoming_call', (payload: { callerName: string, video: boolean, audio: boolean }) => {
      useCallStore.getState().setIncomingCall(payload);
    });
  }

  /**
   * ELITE EMIT ENGINE
   * Handles automatic workbook ID enrichment, buffering for offline states,
   * and Promise-based feedback.
   */
  private async emitAsync<T>(event: SocketEventType, payload: unknown): Promise<T> {
    return new Promise((resolve) => {
      const workbookId = this.getWorkbookId();
      const enriched = { workbookId, ...(payload as object) };

      if (!this.socket?.connected) {
        this.eventBuffer.push({ event, payload: enriched, callback: resolve });
        return;
      }

      this.socket.emit(event, enriched, (res: T) => resolve(res));
    });
  }

  private flushBuffer() {
    while (this.eventBuffer.length > 0) {
      const { event, payload, callback } = this.eventBuffer.shift()!;
      if (callback) {
        this.socket?.emit(event, payload, callback);
      } else {
        this.socket?.emit(event, payload);
      }
    }
  }

  private getWorkbookId() {
    const path = window.location.pathname;
    const match = path.match(/\/(workbook|dashboard)\/([^/]+)/);
    return match ? match[2] : 'default-workbook-id';
  }

  // --- REALTIME COLLABORATION API ---

  public async joinWorkbook() {
    const name = localStorage.getItem('userName') || 'Guest User';
    const workbookId = this.getWorkbookId();
    const res = await this.emitAsync<SocketResponse>(SocketEvent.JOIN_WORKBOOK, { name, workbookId });
    if (res.success) {
      const state = useSheetStore.getState();
      // Use server-confirmed host status; fallback to true if alone in room
      const members = res.members || [];
      const isHost = !!res.isHost || members.length <= 1;
      state.setIsHost(isHost);
      if (res.userId) state.setLocalUserId(res.userId);
      if (res.color) state.setLocalUserColor(res.color);
      if (res.workbookName) state.renameWorkbook(res.workbookName);
      if (res.members) state.setConnectedUsers(res.members);
      state.setRoomLockError(false);
    }
    return res;
  }

  public emitCellUpdate(sheetId: string, cellKey: string, cell: unknown) {
    this.socket?.emit(SocketEvent.CELL_UPDATE, { 
      workbookId: this.getWorkbookId(), 
      sheetId, 
      cellKey, 
      cell 
    });
  }

  public emitBulkCellUpdate(sheetId: string, updates: Record<string, unknown>) {
    this.socket?.emit(SocketEvent.BULK_CELL_UPDATE, { 
      workbookId: this.getWorkbookId(), 
      sheetId, 
      updates 
    });
  }

  public emitCursorMove(
    userName: string, 
    sheetId: string, 
    row: number, 
    col: number, 
    color?: string,
    selectionRange?: { start: string; end: string } | null
  ) {
    const selStart = selectionRange?.start || '';
    const selEnd = selectionRange?.end || '';

    // Deduplication: if coordinates and selection haven't changed, suppress emit
    if (
      this.lastCursorPosition.sheetId === sheetId &&
      this.lastCursorPosition.row === row &&
      this.lastCursorPosition.col === col &&
      this.lastCursorPosition.selStart === selStart &&
      this.lastCursorPosition.selEnd === selEnd
    ) {
      return;
    }

    const resolvedColor = color || useSheetStore.getState().localUserColor || '#107c41';
    const now = performance.now();
    const elapsed = now - this.lastCursorEmitTime;

    this.pendingCursorPayload = { userName, sheetId, row, col, color: resolvedColor, selectionRange };

    const dispatch = () => {
      if (!this.pendingCursorPayload || !this.socket?.connected) return;
      const p = this.pendingCursorPayload;
      this.lastCursorPosition = {
        sheetId: p.sheetId,
        row: p.row,
        col: p.col,
        selStart: p.selectionRange?.start || '',
        selEnd: p.selectionRange?.end || '',
      };
      this.lastCursorEmitTime = performance.now();
      this.socket.emit(SocketEvent.CURSOR_MOVE, {
        workbookId: this.getWorkbookId(),
        userName: p.userName,
        sheetId: p.sheetId,
        row: p.row,
        col: p.col,
        color: p.color,
        selectionRange: p.selectionRange || undefined,
      });
      this.pendingCursorPayload = null;
      this.cursorThrottleTimer = null;
    };

    // Leading-edge instant emit (0ms latency for clicks and new moves)
    // Micro-throttle subsequent rapid movements at 16ms (~60 updates/sec display refresh rate)
    if (elapsed >= 16) {
      if (this.cursorThrottleTimer) {
        clearTimeout(this.cursorThrottleTimer);
        this.cursorThrottleTimer = null;
      }
      dispatch();
    } else if (!this.cursorThrottleTimer) {
      this.cursorThrottleTimer = setTimeout(dispatch, 16 - elapsed);
    }
  }

  public emitCellLock(cellKey: string, action: 'lock' | 'unlock') {
    this.socket?.emit(SocketEvent.CELL_LOCK, { 
      workbookId: this.getWorkbookId(), 
      cellKey, 
      action 
    });
  }

  public emitChatMessage(message: string, userName: string) {
    const id = Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    this.socket?.emit(SocketEvent.CHAT_MESSAGE, { 
      id,
      workbookId: this.getWorkbookId(), 
      message, 
      userName 
    });
    useSheetStore.getState().addTeamMessage({ id, userName, message, timestamp: new Date().toISOString() });
  }

  public emitToggleRoomLock(workbookId: string, locked: boolean) {
    // Always update local state immediately (optimistic)
    useSheetStore.getState().setRoomLocked(locked);
    // Try to sync with server if connected
    if (this.socket?.connected) {
      this.socket.emit(SocketEvent.TOGGLE_LOCK, { workbookId, locked });
    }
  }

  public requestToJoin(targetRoomId: string, userInfo: { name: string, socketId: string }) {
    this.socket?.emit(SocketEvent.REQUEST_JOIN, { targetRoomId, userInfo });
  }

  public respondToJoinRequest(requesterSocketId: string, requesterUserId: string, approved: boolean, targetRoomId: string) {
    this.socket?.emit(SocketEvent.RESPOND_JOIN, { requesterSocketId, requesterUserId, approved, targetRoomId });
  }

  public emitSheetAction(sheetId: string, action: string, payload: unknown) {
    const data = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : { data: payload };
    this.socket?.emit(SocketEvent.SHEET_ACTION, { 
      workbookId: this.getWorkbookId(), 
      sheetId, 
      action, 
      ...data,
      payload: data 
    });
  }

  public updateName(name: string) {
    this.socket?.emit(SocketEvent.UPDATE_NAME, {
      workbookId: this.getWorkbookId(),
      name
    });
  }

  public emitCallStarted(callerName: string, video: boolean, audio: boolean) {
    this.socket?.emit(SocketEvent.START_CALL, {
      workbookId: this.getWorkbookId(),
      callerName,
      video,
      audio
    });
  }

  public isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = SocketService.getInstance();
