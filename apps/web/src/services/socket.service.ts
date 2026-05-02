import { io, Socket } from 'socket.io-client';
import { authService } from './auth.service';
import { useSheetStore } from '../store/useSheetStore';
import type { CellUpdateEvent, CursorMoveEvent, CellLockEvent } from '../store/useSheetStore';

class SocketService {
  public socket: Socket | null = null;

  connect() {
    const token = localStorage.getItem('token') || 'dummy-token';

    const apiUrl = import.meta.env.VITE_API_URL || 
      (window.location.hostname.includes('vercel.app') 
        ? 'https://dora-sheet-api.onrender.com' 
        : 'http://localhost:3002');
    this.socket = io(apiUrl, {
      auth: { token },
      transports: ['websocket']
    });

    this.socket.on('connect_error', async (err) => {
      if (err.message === 'UNAUTHORIZED') {
        const refreshed = await authService.refreshToken();
        if (refreshed) {
          if (this.socket) {
            this.socket.auth = { token: refreshed.accessToken };
            this.socket.connect();
          }
        } else {
          window.location.href = '/login';
        }
      }
    });

    this.socket.on('cell_updated', (event: CellUpdateEvent) => {
      useSheetStore.getState().applyRemoteUpdate(event);
    });

    this.socket.on('cursor_moved', (event: CursorMoveEvent) => {
      useSheetStore.getState().updateRemoteCursor(event);
    });

    this.socket.on('cell_locked', (event: CellLockEvent) => {
      useSheetStore.getState().updateCellLock(event);
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
  }

  joinWorkbook(workbookId: string) {
    if (this.socket) this.socket.emit('join_workbook', { workbookId });
  }

  leaveWorkbook(workbookId: string) {
    if (this.socket) this.socket.emit('leave_workbook', { workbookId });
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

  emitCursorMove(userName: string, sheetId: string, row: number, col: number, color: string) {
    if (this.socket) this.socket.emit('cursor_move', { userName, sheetId, row, col, color });
  }

  emitCellLock(cellKey: string, action: 'lock' | 'unlock') {
    if (this.socket) this.socket.emit('cell_lock', { cellKey, action });
  }
}

export const socketService = new SocketService();
