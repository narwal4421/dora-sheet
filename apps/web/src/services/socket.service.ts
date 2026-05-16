import { io, Socket } from 'socket.io-client';
import { useSheetStore } from '../store/useSheetStore';
import type { CellUpdateEvent, CursorMoveEvent, CellLockEvent } from '../store/useSheetStore';

/**
 * GOD LEVEL SOCKET SERVICE
 * High-resiliency communication layer with Promise-based orchestration,
 * automated event buffering, and real-time telemetry.
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

    console.log(`[GOD_SOCKET] Connecting to API: ${apiUrl}`);

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
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('🚀 [GOD_SOCKET] Connected | ID:', this.socket?.id);
      useSheetStore.getState().setSocketConnected(true);
      
      const hasBufferedJoin = this.eventBuffer.some(e => e.event === SocketEvent.JOIN_WORKBOOK);
      this.flushBuffer();
      
      const workbookId = this.getWorkbookId();
      console.log('📦 [GOD_SOCKET] Auto-joining room:', workbookId);
      if (!hasBufferedJoin && workbookId && workbookId !== 'default-workbook-id') {
        this.joinWorkbook();
      }
    });

    this.socket.on('disconnect', () => {
      console.warn('🔌 [GOD_SOCKET] Disconnected');
      useSheetStore.getState().setSocketConnected(false);
    });

    this.socket.on('connect_error', (err) => {
      this.isConnecting = false;
      console.warn('⚠️ [GOD_SOCKET] Connection failed:', err.message);
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('cell_updated', (event: CellUpdateEvent) => useSheetStore.getState().applyRemoteUpdate(event));
    this.socket.on('bulk_cell_updated', (event: { updates: Record<string, Partial<import('../store/useSheetStore').CellData>> }) => useSheetStore.getState().applyRemoteBulkUpdate(event.updates));
    this.socket.on('cursor_moved', (event: CursorMoveEvent) => useSheetStore.getState().updateRemoteCursor(event));
    this.socket.on('cell_locked', (event: CellLockEvent) => useSheetStore.getState().updateCellLock(event));
    this.socket.on('sheet_action_received', (payload: { action: string, index?: number, colIndex?: number }) => useSheetStore.getState().applyRemoteSheetAction(payload));
    this.socket.on('incoming_join_request', (payload: { requesterSocketId: string, requesterUserId: string, name: string }) => useSheetStore.getState().addJoinRequest(payload));
    this.socket.on('chat_message_received', (payload: { userName: string, message: string, timestamp: string }) => useSheetStore.getState().addTeamMessage(payload));
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
    console.log(`📦 [GOD_SOCKET] Flushing ${this.eventBuffer.length} buffered events`);
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

  // --- GOD LEVEL API ---

  public async joinWorkbook() {
    const name = localStorage.getItem('userName') || 'Guest User';
    const res = await this.emitAsync<SocketResponse>(SocketEvent.JOIN_WORKBOOK, { name });
    if (res.success) {
      const state = useSheetStore.getState();
      // Use server-confirmed host status; fallback to true if alone in room
      const members = res.members || [];
      const isHost = !!res.isHost || members.length <= 1;
      state.setIsHost(isHost);
      if (res.userId) state.setLocalUserId(res.userId);
      if (res.workbookName) state.renameWorkbook(res.workbookName);
      if (res.members) state.setConnectedUsers(res.members);
      console.log(`[GOD_SOCKET] Host status: ${isHost} | Members: ${members.length} | UserId: ${res.userId}`);
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

  public emitCursorMove(userName: string, sheetId: string, row: number, col: number, color: string) {
    this.socket?.emit(SocketEvent.CURSOR_MOVE, { 
      workbookId: this.getWorkbookId(), 
      userName, 
      sheetId, 
      row, 
      col, 
      color 
    });
  }

  public emitCellLock(cellKey: string, action: 'lock' | 'unlock') {
    this.socket?.emit(SocketEvent.CELL_LOCK, { 
      workbookId: this.getWorkbookId(), 
      cellKey, 
      action 
    });
  }

  public emitChatMessage(message: string, userName: string) {
    this.socket?.emit(SocketEvent.CHAT_MESSAGE, { 
      workbookId: this.getWorkbookId(), 
      message, 
      userName 
    });
    useSheetStore.getState().addTeamMessage({ userName, message, timestamp: new Date().toISOString() });
  }

  public emitToggleRoomLock(workbookId: string, locked: boolean) {
    // Always update local state immediately (optimistic)
    useSheetStore.getState().setRoomLocked(locked);
    // Try to sync with server if connected
    if (this.socket?.connected) {
      this.socket.emit(SocketEvent.TOGGLE_LOCK, { workbookId, locked });
    } else {
      console.warn('[GOD_SOCKET] Lock toggled offline — will sync when reconnected');
    }
  }

  public requestToJoin(targetRoomId: string, userInfo: { name: string, socketId: string }) {
    this.socket?.emit(SocketEvent.REQUEST_JOIN, { targetRoomId, userInfo });
  }

  public respondToJoinRequest(requesterSocketId: string, requesterUserId: string, approved: boolean, targetRoomId: string) {
    this.socket?.emit(SocketEvent.RESPOND_JOIN, { requesterSocketId, requesterUserId, approved, targetRoomId });
  }

  public emitSheetAction(sheetId: string, action: string, payload: unknown) {
    this.socket?.emit(SocketEvent.SHEET_ACTION, { 
      workbookId: this.getWorkbookId(), 
      sheetId, 
      action, 
      payload 
    });
  }

  public updateName(name: string) {
    this.socket?.emit(SocketEvent.UPDATE_NAME, {
      workbookId: this.getWorkbookId(),
      name
    });
  }

  public isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = SocketService.getInstance();
