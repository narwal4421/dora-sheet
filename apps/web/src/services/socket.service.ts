import { io, Socket } from 'socket.io-client';
import { useSheetStore } from '../store/useSheetStore';
import type { CellUpdateEvent, CursorMoveEvent, CellLockEvent, CellData } from '../store/useSheetStore';

class SocketService {
  public socket: Socket | null = null;

  connect() {

    const apiUrl = import.meta.env.VITE_API_URL || 
      (window.location.hostname.includes('vercel.app') 
        ? 'https://dora-sheet-api.onrender.com' 
        : 'http://localhost:3002');
    this.socket = io(apiUrl, {
      auth: (cb) => {
        cb({ token: localStorage.getItem('token') || 'dummy-token' });
      },
      transports: ['websocket']
    });

    // Cleanup stale cursors every 5 seconds
    setInterval(() => {
      useSheetStore.getState().cleanupStaleCursors();
    }, 5000);

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connection error, falling back to guest mode:', err.message);
    });

    this.socket.on('cell_updated', (event: CellUpdateEvent) => {
      useSheetStore.getState().applyRemoteUpdate(event);
    });
    
    this.socket.on('bulk_cell_updated', (event: { updates: Record<string, Partial<CellData>> }) => {
      useSheetStore.getState().applyRemoteBulkUpdate(event.updates);
    });

    this.socket.on('cursor_moved', (event: CursorMoveEvent) => {
      useSheetStore.getState().updateRemoteCursor(event);
    });

    this.socket.on('cell_locked', (event: CellLockEvent) => {
      useSheetStore.getState().updateCellLock(event);
    });

    this.socket.on('sheet_action_received', (payload: unknown) => {
      // @ts-expect-error - applyRemoteSheetAction exists in store but TS is slow
      useSheetStore.getState().applyRemoteSheetAction(payload);
    });

    this.socket.on('user_joined', (user: { userId: string, name: string, color: string }) => {
      const state = useSheetStore.getState();
      state.setConnectedUsers([...state.connectedUsers.filter(u => u.userId !== user.userId), user]);
    });

    this.socket.on('user_left', (payload: { userId: string }) => {
      const state = useSheetStore.getState();
      state.setConnectedUsers(state.connectedUsers.filter(u => u.userId !== payload.userId));
      
      // Cleanup cursor and locks for this user
      const newCursors = { ...state.cursors };
      delete newCursors[payload.userId];
      useSheetStore.setState({ cursors: newCursors });
    });

    this.socket.on('chat_message_received', (payload: { userName: string, message: string, timestamp: string }) => {
      useSheetStore.getState().addTeamMessage(payload);
    });

    this.socket.on('room_lock_status', (payload: { locked: boolean }) => {
      useSheetStore.getState().setRoomLocked(payload.locked);
    });

    this.socket.on('join_request_denied', (payload: { reason: string }) => {
      if (payload.reason === 'ROOM_LOCKED') {
        alert('This room is currently locked by the host.');
        window.location.href = '/';
      }
    });
  }

  joinWorkbook(workbookId: string) {
    const name = localStorage.getItem('userName') || 'Guest User';
    if (this.socket) {
      this.socket.emit('join_workbook', { workbookId, name }, (response: { success: boolean, isHost: boolean }) => {
        if (response.success) {
          useSheetStore.getState().setIsHost(response.isHost);
        }
      });
    }
  }

  leaveWorkbook(workbookId: string) {
    if (this.socket) this.socket.emit('leave_workbook', { workbookId });
  }

  emitChatMessage(message: string, userName: string) {
    const workbookId = this.getWorkbookId();
    this.socket?.emit('chat_message', { workbookId, message, userName });
    // Add local message to store immediately
    useSheetStore.getState().addTeamMessage({ userName, message, timestamp: new Date().toISOString() });
  }

  emitToggleRoomLock(workbookId: string, locked: boolean) {
    this.socket?.emit('toggle_room_lock', { workbookId, locked });
  }

  private getWorkbookId() {
    const path = window.location.pathname;
    const match = path.match(/\/workbook\/([^/]+)/);
    return match ? match[1] : 'default-workbook-id';
  }

  requestToJoin(targetRoomId: string, userInfo: { name: string, socketId: string }) {
    if (this.socket) this.socket.emit('request_to_join', { targetRoomId, userInfo });
  }

  respondToJoinRequest(requesterSocketId: string, approved: boolean, targetRoomId: string) {
    if (this.socket) this.socket.emit('respond_to_join', { requesterSocketId, approved, targetRoomId });
  }

  emitCellUpdate(sheetId: string, cellKey: string, cell: unknown) {
    if (this.socket) this.socket.emit('cell_update', { sheetId, cellKey, cell });
  }
  
  emitBulkCellUpdate(sheetId: string, updates: Record<string, Partial<CellData>>) {
    if (this.socket) this.socket.emit('bulk_cell_update', { sheetId, updates });
  }

  emitCursorMove(userName: string, sheetId: string, row: number, col: number, color: string) {
    if (this.socket) this.socket.emit('cursor_move', { userName, sheetId, row, col, color });
  }

  emitCellLock(cellKey: string, action: 'lock' | 'unlock') {
    if (this.socket) this.socket.emit('cell_lock', { cellKey, action });
  }

  emitSheetAction(sheetId: string, action: string, payload: unknown) {
    if (this.socket) this.socket.emit('sheet_action', { sheetId, action, ...(payload as object) });
  }
}

export const socketService = new SocketService();
