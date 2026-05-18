import { create } from 'zustand';
import { socketService } from '../services/socket.service';
import { getWorkbookIdFromUrl } from '../utils/workbookUrl';
import { toast } from './useToastStore';

export type CellFormat = {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  [key: string]: string | number | boolean | undefined;
};

export type CellData = {
  v?: string | number | boolean | null; // Evaluated value
  f?: string;          // Formula
  fmt?: CellFormat;    // Formatting
};

export type SheetData = Record<string, CellData>;

export type CellUpdateEvent = {
  sheetId: string;
  cellKey: string;
  cell: Partial<CellData>;
  userId: string;
};

export type CursorMoveEvent = {
  userId: string;
  userName: string;
  sheetId: string;
  row: number;
  col: number;
  color: string;
  timestamp: number;
};

export type CellLockEvent = {
  userId: string;
  cellKey: string;
  action: 'lock' | 'unlock';
};

export type ConnectedUser = {
  userId: string;
  name: string;
  color: string;
};

export type Snapshot = {
  id: string;
  label: string;
  createdAt: string;
  data: SheetData;
};

export type FindReplaceState = {
  isOpen: boolean;
  findText: string;
  replaceText: string;
  results: string[];
  currentIndex: number;
};

interface SheetState {
  data: SheetData;
  activeCell: string | null; // e.g. "r_0_c_0"
  editingCell: string | null;
  selectionRange: { start: string, end: string } | null;
  
  sheets: Array<{ id: string; name: string; data: SheetData }>;
  activeSheetId: string;
  addSheetTab: (name?: string, id?: string, remote?: boolean) => void;
  renameSheetTab: (id: string, newName: string, remote?: boolean) => void;
  deleteSheetTab: (id: string, remote?: boolean) => void;
  switchSheetTab: (id: string) => void;

  cursors: Record<string, CursorMoveEvent>;
  lockedCells: Record<string, string>;
  connectedUsers: ConnectedUser[];
  
  history: SheetData[];
  future: SheetData[];
  snapshots: Snapshot[];
  
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;

  findReplace: FindReplaceState;
  setFindReplace: (state: Partial<FindReplaceState>) => void;
  executeFind: () => void;
  nextFindResult: () => void;
  prevFindResult: () => void;
  replaceCurrent: () => void;
  replaceAll: () => void;

  hiddenRows: Set<number>;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  
  insertRowAbove: (rowIndex?: number) => void;
  insertColumnRight: (colIndex?: number) => void;
  deleteRow: (rowIndex?: number) => void;
  deleteColumn: (colIndex?: number) => void;
  sortAZ: (colIndex?: number) => void;
  toggleFilter: (colIndex?: number) => void;
  
  setColumnWidth: (index: number, width: number) => void;
  setRowHeight: (index: number, height: number) => void;

  setSelectionRange: (range: { start: string, end: string } | null) => void;
  setActiveCell: (ref: string) => void;
  setEditingCell: (ref: string | null) => void;
  setCellData: (ref: string, data: Partial<CellData>) => void;
  setCellFormat: (ref: string, format: Partial<CellFormat>) => void;
  bulkSetCellData: (updates: Record<string, Partial<CellData>>) => void;
  clearCell: (ref: string) => void;
  clearSheet: () => void;
  clearRange: (refs: string[]) => void;
  undo: () => void;
  redo: () => void;
  
  saveSnapshot: (label: string) => void;
  restoreSnapshot: (id: string) => void;
  
  applyRemoteUpdate: (event: CellUpdateEvent) => void;
  applyRemoteBulkUpdate: (updates: Record<string, Partial<CellData>>, sheetId?: string) => void;
  updateRemoteCursor: (event: CursorMoveEvent) => void;
  cleanupStaleCursors: () => void;
  updateCellLock: (event: CellLockEvent) => void;
  applyRemoteSheetAction: (payload: { action: string, index?: number, colIndex?: number, name?: string, data?: unknown, sender?: string }) => void;
  setConnectedUsers: (users: ConnectedUser[]) => void;
  isHost: boolean;
  setIsHost: (isHost: boolean) => void;
  localUserName: string;
  setLocalUserName: (name: string) => void;
  localUserId: string | null;
  setLocalUserId: (id: string) => void;
  workbookName: string;
  renameWorkbook: (name: string) => void;
  isLocked: boolean;
  setRoomLocked: (locked: boolean) => void;
  roomLockError: boolean;
  setRoomLockError: (val: boolean) => void;
  isWaitingForApproval: boolean;
  setIsWaitingForApproval: (val: boolean) => void;
  socketConnected: boolean;
  setSocketConnected: (val: boolean) => void;
  pendingJoinRequests: { requesterSocketId: string, requesterUserId: string, name: string }[];
  addJoinRequest: (req: { requesterSocketId: string, requesterUserId: string, name: string }) => void;
  removeJoinRequest: (socketId: string) => void;
  teamMessages: { id?: string, userName: string, message: string, timestamp: string }[];
  addTeamMessage: (msg: { id?: string, userName: string, message: string, timestamp: string }) => void;
}

const parseRef = (ref: string) => {
  const match = ref.match(/r_(\d+)_c_(\d+)/);
  if (!match) return { r: 0, c: 0 };
  return { r: parseInt(match[1]), c: parseInt(match[2]) };
};

/**
 * GOD LEVEL SHEET STORE
 * High-performance state machine for complex spreadsheet orchestration.
 * Features optimized domain splitting, intelligent history snapshots, 
 * and ultra-low-latency collaboration handlers.
 */

export const useSheetStore = create<SheetState>((set, get) => ({
  // --- CORE DATA & STATE ---
  data: {},
  activeCell: 'r_0_c_0',
  editingCell: null,
  selectionRange: null,

  sheets: [{ id: 'sheet-1', name: 'Sheet1', data: {} }],
  activeSheetId: 'sheet-1',
  
  // --- COLLABORATION DOMAIN ---
  cursors: {},
  lockedCells: {},
  connectedUsers: [],
  isHost: true,
  localUserName: localStorage.getItem('userName') || 'Guest User',
  localUserId: null,
  workbookName: 'Untitled Workbook',
  isLocked: false,
  roomLockError: false,
  isWaitingForApproval: false,
  socketConnected: false,
  pendingJoinRequests: [],
  teamMessages: [],

  // --- UI & LAYOUT DOMAIN ---
  isLightMode: false,
  hiddenRows: new Set(),
  columnWidths: {},
  rowHeights: {},
  findReplace: {
    isOpen: false,
    findText: '',
    replaceText: '',
    results: [],
    currentIndex: 0
  },

  // --- HISTORY DOMAIN ---
  history: [],
  future: [],
  snapshots: [
    { id: 'initial', label: 'Session Start', createdAt: new Date().toISOString(), data: {} }
  ],

  // --- ACTIONS: COLLABORATION ---
  setIsHost: (val) => set({ isHost: val }),
  setLocalUserName: (name) => {
    localStorage.setItem('userName', name);
    set({ localUserName: name });
  },
  setLocalUserId: (id) => set({ localUserId: id }),
  renameWorkbook: (name) => set({ workbookName: name }),
  setConnectedUsers: (users) => set({ connectedUsers: users }),
  addTeamMessage: (msg) => set(state => {
    const exists = state.teamMessages.some(m => {
      if (msg.id && m.id && msg.id === m.id) return true;
      const timeDiff = Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime());
      return m.userName === msg.userName && m.message === msg.message && timeDiff < 3000;
    });
    if (exists) return state;
    return { teamMessages: [...state.teamMessages.slice(-100), msg] };
  }),
  setRoomLocked: (locked) => set({ isLocked: locked }),
  setRoomLockError: (val) => set({ roomLockError: val }),
  setIsWaitingForApproval: (val) => set({ isWaitingForApproval: val }),
  setSocketConnected: (val) => set({ socketConnected: val }),
  addJoinRequest: (req) => set(state => ({ 
    pendingJoinRequests: [...state.pendingJoinRequests.filter(r => r.requesterUserId !== req.requesterUserId), req] 
  })),
  removeJoinRequest: (socketId) => set(state => ({ 
    pendingJoinRequests: state.pendingJoinRequests.filter(r => r.requesterSocketId !== socketId) 
  })),

  // --- ACTIONS: REMOTE UPDATES (HIGH FREQUENCY) ---
  applyRemoteUpdate: (event) => set(state => {
    const updatedSheets = state.sheets.map(s => {
      if (s.id === event.sheetId) {
        return {
          ...s,
          data: { ...s.data, [event.cellKey]: { ...s.data[event.cellKey], ...event.cell } }
        };
      }
      return s;
    });

    if (event.sheetId === state.activeSheetId) {
      return {
        sheets: updatedSheets,
        data: { ...state.data, [event.cellKey]: { ...state.data[event.cellKey], ...event.cell } }
      };
    }

    return { sheets: updatedSheets };
  }),

  applyRemoteBulkUpdate: (updates, sheetId) => set(state => {
    const targetSheetId = sheetId || state.activeSheetId;
    const updatedSheets = state.sheets.map(s => {
      if (s.id === targetSheetId) {
        const newData = { ...s.data };
        Object.assign(newData, updates);
        return { ...s, data: newData };
      }
      return s;
    });

    if (targetSheetId === state.activeSheetId) {
      const newData = { ...state.data };
      Object.assign(newData, updates);
      return { sheets: updatedSheets, data: newData };
    }

    return { sheets: updatedSheets };
  }),

  updateRemoteCursor: (event) => set(state => ({
    cursors: { ...state.cursors, [event.userId]: { ...event, timestamp: Date.now() } }
  })),

  cleanupStaleCursors: () => set(state => {
    const now = Date.now();
    const newCursors = { ...state.cursors };
    let changed = false;
    Object.entries(newCursors).forEach(([id, c]) => {
      if (now - c.timestamp > 8000) { delete newCursors[id]; changed = true; }
    });
    return changed ? { cursors: newCursors } : {};
  }),

  updateCellLock: (event) => set(state => {
    const newLocks = { ...state.lockedCells };
    if (event.action === 'lock') newLocks[event.cellKey] = event.userId;
    else delete newLocks[event.cellKey];
    return { lockedCells: newLocks };
  }),

  applyRemoteSheetAction: (payload) => {
    const { action, index, colIndex } = payload;
    const store = get();
    if (action === 'insertRow') store.insertRowAbove(index);
    else if (action === 'insertCol') store.insertColumnRight(colIndex);
    else if (action === 'deleteRow') store.deleteRow(index);
    else if (action === 'deleteCol') store.deleteColumn(colIndex);
    else if (action === 'sort') store.sortAZ(colIndex);
    else if (action === 'toggleFilter') store.toggleFilter(colIndex);
    else if (action === 'clearSheet') store.clearSheet();
    else if (action === 'rename_sheet') store.renameWorkbook(payload.name || 'Untitled Workbook');
    else if (action === 'share_dashboard') {
      window.dispatchEvent(new CustomEvent('show-dashboard', { detail: payload.data }));
      toast(`${payload.sender || 'A collaborator'} shared a Cinematic Dashboard!`, 'success');
    }
    else if (action === 'add_sheet_tab') {
      const p = payload.data as { id: string; name: string };
      if (p) store.addSheetTab(p.name, p.id, true);
    }
    else if (action === 'rename_sheet_tab') {
      const p = payload.data as { id: string; name: string };
      if (p) store.renameSheetTab(p.id, p.name, true);
    }
    else if (action === 'delete_sheet_tab') {
      const p = payload.data as { id: string };
      if (p) store.deleteSheetTab(p.id, true);
    }
  },

  addSheetTab: (name, id, remote = false) => {
    const newId = id || `sheet-${Date.now()}`;
    const newName = name || `Sheet ${get().sheets.length + 1}`;
    
    set(state => {
      const newSheet = { id: newId, name: newName, data: {} };
      const updatedSheets = [...state.sheets, newSheet];
      return { sheets: updatedSheets };
    });

    if (!remote) {
      socketService.emitSheetAction('default', 'add_sheet_tab', { id: newId, name: newName });
      get().switchSheetTab(newId);
    }
  },

  renameSheetTab: (id, newName, remote = false) => {
    set(state => {
      const updatedSheets = state.sheets.map(s => s.id === id ? { ...s, name: newName } : s);
      return { sheets: updatedSheets };
    });

    if (!remote) {
      socketService.emitSheetAction('default', 'rename_sheet_tab', { id, name: newName });
    }
  },

  deleteSheetTab: (id, remote = false) => {
    const store = get();
    if (store.sheets.length <= 1) {
      toast("Cannot delete the last remaining sheet tab!", "warning");
      return;
    }

    if (store.activeSheetId === id) {
      const remainingSheets = store.sheets.filter(s => s.id !== id);
      const fallbackSheet = remainingSheets[0];
      store.switchSheetTab(fallbackSheet.id);
    }

    set(state => {
      const updatedSheets = state.sheets.filter(s => s.id !== id);
      return { sheets: updatedSheets };
    });

    if (!remote) {
      socketService.emitSheetAction('default', 'delete_sheet_tab', { id });
    }
  },

  switchSheetTab: (id) => {
    const store = get();
    if (store.activeSheetId === id) return;

    const updatedSheets = store.sheets.map(s => {
      if (s.id === store.activeSheetId) {
        return { ...s, data: store.data };
      }
      return s;
    });

    const targetSheet = updatedSheets.find(s => s.id === id);
    if (!targetSheet) return;

    set({
      sheets: updatedSheets,
      activeSheetId: id,
      data: targetSheet.data,
      activeCell: 'r_0_c_0',
      editingCell: null,
      selectionRange: null,
      history: [],
      future: [],
      lockedCells: {}
    });

    const { r, c } = parseRef('r_0_c_0');
    socketService.emitCursorMove(store.localUserName, id, r, c, '#6366f1');
  },

  // --- ACTIONS: GRID OPERATIONS ---
  setActiveCell: (ref) => set({ activeCell: ref }),
  setEditingCell: (ref) => set({ editingCell: ref }),
  setSelectionRange: (range) => set({ selectionRange: range }),
  
  setCellData: (ref, cellData) => set(state => {
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data, [ref]: { ...state.data[ref], ...cellData } };
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
    return {
      data: newData,
      sheets: updatedSheets,
      history,
      future: []
    };
  }),

  setCellFormat: (ref, formatPatch) => {
    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const existing = state.data[ref]?.fmt || {};
      const newData = { ...state.data, [ref]: { ...state.data[ref], fmt: { ...existing, ...formatPatch } } };
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });
    // Emit formatting update to other users
    const currentFmt = get().data[ref]?.fmt;
    if (currentFmt) {
      socketService.emitCellUpdate(getWorkbookIdFromUrl(), ref, { fmt: currentFmt });
    }
  },

  bulkSetCellData: (updates) => set(state => {
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data, ...updates };
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
    return { data: newData, sheets: updatedSheets, history, future: [] };
  }),

  clearCell: (ref) => set(state => {
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data };
    delete newData[ref];
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
    return { data: newData, sheets: updatedSheets, history, future: [] };
  }),

  clearSheet: () => set(state => {
    const history = [...state.history, state.data].slice(-50);
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: {} } : s);
    return { data: {}, sheets: updatedSheets, history, future: [] };
  }),

  clearRange: (refs) => set(state => {
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data };
    refs.forEach(ref => delete newData[ref]);
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
    return { data: newData, sheets: updatedSheets, history, future: [] };
  }),

  // --- ACTIONS: HISTORY & SNAPSHOTS ---
  undo: () => set(state => {
    if (state.history.length === 0) return {};
    const previous = state.history[state.history.length - 1];
    return {
      data: previous,
      history: state.history.slice(0, -1),
      future: [state.data, ...state.future]
    };
  }),

  redo: () => set(state => {
    if (state.future.length === 0) return {};
    const next = state.future[0];
    return {
      data: next,
      history: [...state.history, state.data],
      future: state.future.slice(1)
    };
  }),

  saveSnapshot: (label) => set(state => ({
    snapshots: [{ id: Date.now().toString(), label, createdAt: new Date().toISOString(), data: state.data }, ...state.snapshots]
  })),

  restoreSnapshot: (id) => set(state => {
    const snap = state.snapshots.find(s => s.id === id);
    if (!snap) return {};
    return { data: snap.data, history: [...state.history, state.data], future: [] };
  }),

  // --- ACTIONS: LAYOUT & SEARCH ---
  setIsLightMode: (val) => set({ isLightMode: val }),
  setColumnWidth: (idx, w) => set(state => ({ columnWidths: { ...state.columnWidths, [idx]: w } })),
  setRowHeight: (idx, h) => set(state => ({ rowHeights: { ...state.rowHeights, [idx]: h } })),
  setFindReplace: (partial) => set(state => ({ findReplace: { ...state.findReplace, ...partial } })),

  executeFind: () => set(state => {
    const { findText } = state.findReplace;
    if (!findText) return { findReplace: { ...state.findReplace, results: [], currentIndex: 0 } };
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = Object.entries(state.data)
      .filter(([, cell]) => (cell.v !== undefined && regex.test(String(cell.v))) || (cell.f && regex.test(cell.f)))
      .map(([ref]) => ref);
    return {
      findReplace: { ...state.findReplace, results, currentIndex: 0 },
      activeCell: results.length > 0 ? results[0] : state.activeCell
    };
  }),

  nextFindResult: () => set(state => {
    const { results, currentIndex } = state.findReplace;
    if (results.length === 0) return {};
    const nextIdx = (currentIndex + 1) % results.length;
    return { findReplace: { ...state.findReplace, currentIndex: nextIdx }, activeCell: results[nextIdx] };
  }),

  prevFindResult: () => set(state => {
    const { results, currentIndex } = state.findReplace;
    if (results.length === 0) return {};
    const prevIdx = (currentIndex - 1 + results.length) % results.length;
    return { findReplace: { ...state.findReplace, currentIndex: prevIdx }, activeCell: results[prevIdx] };
  }),

  replaceCurrent: () => set(state => {
    const { results, currentIndex, replaceText } = state.findReplace;
    if (results.length === 0) return {};
    const ref = results[currentIndex];
    return {
      data: { ...state.data, [ref]: { ...state.data[ref], v: replaceText, f: undefined } },
      history: [...state.history, state.data].slice(-50), future: []
    };
  }),

  replaceAll: () => set(state => {
    const { results, replaceText } = state.findReplace;
    if (results.length === 0) return {};
    const newData = { ...state.data };
    results.forEach(ref => { newData[ref] = { ...newData[ref], v: replaceText, f: undefined }; });
    return { data: newData, history: [...state.history, state.data].slice(-50), future: [] };
  }),

  // --- ACTIONS: COMPLEX SHEET MUTATIONS ---
  insertRowAbove: (rowIndex) => set(state => {
    const target = rowIndex ?? (state.activeCell ? parseRef(state.activeCell).r : 0);
    const newData: SheetData = {};
    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      newData[r >= target ? `r_${r + 1}_c_${c}` : ref] = cell;
    });
    return { data: newData, history: [...state.history, state.data].slice(-50), future: [] };
  }),

  insertColumnRight: (colIndex) => set(state => {
    const target = colIndex ?? (state.activeCell ? parseRef(state.activeCell).c : 0);
    const newData: SheetData = {};
    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      newData[c > target ? `r_${r}_c_${c + 1}` : ref] = cell;
    });
    return { data: newData, history: [...state.history, state.data].slice(-50), future: [] };
  }),

  deleteRow: (rowIndex) => set(state => {
    const target = rowIndex ?? (state.activeCell ? parseRef(state.activeCell).r : -1);
    if (target === -1) return {};
    const newData: SheetData = {};
    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      if (r === target) return;
      newData[r > target ? `r_${r - 1}_c_${c}` : ref] = cell;
    });
    return { data: newData, history: [...state.history, state.data].slice(-50), future: [] };
  }),

  deleteColumn: (colIndex) => set(state => {
    const target = colIndex ?? (state.activeCell ? parseRef(state.activeCell).c : -1);
    if (target === -1) return {};
    const newData: SheetData = {};
    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      if (c === target) return;
      newData[c > target ? `r_${r}_c_${c - 1}` : ref] = cell;
    });
    return { data: newData, history: [...state.history, state.data].slice(-50), future: [] };
  }),

  sortAZ: (colIndex) => set(state => {
    const targetC = colIndex ?? (state.activeCell ? parseRef(state.activeCell).c : 0);
    const rows = Array.from({ length: 1000 }, (_, r) => 
      Array.from({ length: 26 }, (_, c) => state.data[`r_${r}_c_${c}`])
    ).filter(row => row.some(cell => !!cell));

    rows.sort((a, b) => String(a[targetC]?.v || '').localeCompare(String(b[targetC]?.v || ''), undefined, { sensitivity: 'base' }));

    const newData: SheetData = {};
    rows.forEach((row, r) => row.forEach((cell, c) => { if (cell) newData[`r_${r}_c_${c}`] = cell; }));
    return { data: newData, history: [...state.history, state.data].slice(-50), future: [] };
  }),

  toggleFilter: (colIndex) => set(state => {
    const targetC = colIndex ?? (state.activeCell ? parseRef(state.activeCell).c : 0);
    if (state.hiddenRows.size > 0) return { hiddenRows: new Set() };
    const newHidden = new Set<number>();
    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      if (c === targetC && (!cell.v && !cell.f)) newHidden.add(r);
    });
    return { hiddenRows: newHidden };
  })
}));


