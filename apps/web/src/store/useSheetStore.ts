import { create } from 'zustand';
import { socketService } from '../services/socket.service';
import { toast } from './useToastStore';

export type CellFormat = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  numFmt?: 'general' | 'currency' | 'percent' | 'number' | 'date';
  decimals?: number;
  border?: 'all' | 'outer' | 'bottom' | 'top' | 'none';
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

export type RibbonTab = 'home' | 'insert' | 'formulas' | 'data' | 'view' | 'ai';

export type SheetTab = {
  id: string;
  name: string;
  data: SheetData;
  columnWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  mergedCells?: Record<string, string>;
  hiddenRows?: Set<number>;
  freezeRow?: number;
  freezeCol?: number;
};

interface SheetState {
  data: SheetData;
  activeCell: string | null; // e.g. "r_0_c_0"
  editingCell: string | null;
  selectionRange: { start: string, end: string } | null;
  selectedRanges: Array<{ start: string, end: string }>;
  setSelectedRanges: (ranges: Array<{ start: string, end: string }>) => void;
  addSelectionRange: (range: { start: string, end: string }) => void;
  clearMultiSelection: () => void;

  formatPainter: { active: boolean; persistent: boolean; format: CellFormat | null };
  activateFormatPainter: (format: CellFormat, persistent?: boolean) => void;
  deactivateFormatPainter: () => void;

  clipboardData: { grid: Array<Array<CellData | undefined>>; text: string } | null;
  setClipboardData: (data: { grid: Array<Array<CellData | undefined>>; text: string } | null) => void;
  pasteSpecial: (type: 'values' | 'formulas' | 'formats' | 'transpose' | 'add' | 'subtract') => void;
  
  sheets: SheetTab[];
  activeSheetId: string;
  addSheetTab: (name?: string, id?: string, remote?: boolean) => void;
  renameSheetTab: (id: string, newName: string, remote?: boolean) => void;
  deleteSheetTab: (id: string, remote?: boolean) => void;
  switchSheetTab: (id: string) => void;
  importWorkbook: (sheets: SheetTab[], workbookName?: string, remote?: boolean) => void;

  cursors: Record<string, CursorMoveEvent>;
  lockedCells: Record<string, string>;
  connectedUsers: ConnectedUser[];
  
  history: SheetData[];
  future: SheetData[];
  snapshots: Snapshot[];
  
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;

  // View toggles
  activeRibbonTab: RibbonTab;
  setActiveRibbonTab: (tab: RibbonTab) => void;
  showGridlines: boolean;
  setShowGridlines: (val: boolean) => void;
  showHeaders: boolean;
  setShowHeaders: (val: boolean) => void;
  showFormulaBar: boolean;
  setShowFormulaBar: (val: boolean) => void;
  zoomLevel: number;
  setZoomLevel: (val: number | ((prev: number) => number)) => void;

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
  rowCount: number;
  colCount: number;
  expandRows: (count?: number) => void;
  expandCols: (count?: number) => void;
  ensureDimensions: (r: number, c: number) => void;
  
  insertRowAbove: (rowIndex?: number, remote?: boolean) => void;
  insertColumnRight: (colIndex?: number, remote?: boolean) => void;
  deleteRow: (rowIndex?: number, remote?: boolean) => void;
  deleteColumn: (colIndex?: number, remote?: boolean) => void;
  sortAZ: (colIndex?: number, remote?: boolean) => void;
  sortZA: (colIndex?: number, remote?: boolean) => void;
  toggleFilter: (colIndex?: number, remote?: boolean) => void;
  jumpToCell: (coord: string) => boolean;
  
  setColumnWidth: (index: number, width: number) => void;
  setRowHeight: (index: number, height: number) => void;
  autoFitColumn: (colIndex?: number) => void;
  autoFitRow: (rowIndex?: number) => void;

  setSelectionRange: (range: { start: string, end: string } | null) => void;
  setActiveCell: (ref: string) => void;
  setEditingCell: (ref: string | null) => void;
  setCellData: (ref: string, data: Partial<CellData>) => void;
  setCellFormat: (ref: string, format: Partial<CellFormat>) => void;
  setRangeFormat: (refs: string[], formatPatch: Partial<CellFormat>) => void;
  bulkSetCellData: (updates: Record<string, Partial<CellData>>) => void;
  clearCell: (ref: string) => void;
  clearCellFormats: (ref: string) => void;
  clearSheet: () => void;
  clearRange: (refs: string[]) => void;
  clearRangeFormats: (refs: string[]) => void;
  clearRangeContents: (refs: string[]) => void;
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

  // Merged cells & Freeze panes
  mergedCells: Record<string, string>;
  mergeCell: (refs: string[]) => void;
  unmergeCell: (ref: string) => void;
  freezeRow: number;
  freezeCol: number;
  setFreezeRow: (r: number) => void;
  setFreezeCol: (c: number) => void;
  fillDown: () => void;
  fillRight: () => void;
  removeDuplicates: () => void;
}

const parseRef = (ref: string) => {
  const match = ref.match(/r_(\d+)_c_(\d+)/);
  if (!match) return { r: 0, c: 0 };
  return { r: parseInt(match[1]), c: parseInt(match[2]) };
};

const shiftMergedCellsRow = (mergedCells: Record<string, string>, target: number, delta: number): Record<string, string> => {
  const result: Record<string, string> = {};
  Object.entries(mergedCells).forEach(([_topKey, bounds]) => {
    const [startRef, endRef] = bounds.split(':');
    if (!startRef || !endRef) return;
    const start = parseRef(startRef);
    const end = parseRef(endRef);

    if (delta < 0 && target >= start.r && target <= end.r && start.r === end.r) {
      return;
    }

    let newStartR = start.r;
    let newEndR = end.r;

    if (delta > 0) {
      if (start.r >= target) newStartR += delta;
      if (end.r >= target) newEndR += delta;
    } else {
      if (start.r > target) newStartR += delta;
      if (end.r >= target) newEndR += delta;
    }

    if (newStartR <= newEndR) {
      const newTopKey = `r_${newStartR}_c_${start.c}`;
      result[newTopKey] = `r_${newStartR}_c_${start.c}:r_${newEndR}_c_${end.c}`;
    }
  });
  return result;
};

const shiftMergedCellsCol = (mergedCells: Record<string, string>, target: number, delta: number): Record<string, string> => {
  const result: Record<string, string> = {};
  Object.entries(mergedCells).forEach(([_topKey, bounds]) => {
    const [startRef, endRef] = bounds.split(':');
    if (!startRef || !endRef) return;
    const start = parseRef(startRef);
    const end = parseRef(endRef);

    if (delta < 0 && target >= start.c && target <= end.c && start.c === end.c) {
      return;
    }

    let newStartC = start.c;
    let newEndC = end.c;

    if (delta > 0) {
      if (start.c > target) newStartC += delta;
      if (end.c > target) newEndC += delta;
    } else {
      if (start.c > target) newStartC += delta;
      if (end.c >= target) newEndC += delta;
    }

    if (newStartC <= newEndC) {
      const newTopKey = `r_${start.r}_c_${newStartC}`;
      result[newTopKey] = `r_${start.r}_c_${newStartC}:r_${end.r}_c_${newEndC}`;
    }
  });
  return result;
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
  selectedRanges: [],
  setSelectedRanges: (ranges) => set({ selectedRanges: ranges }),
  addSelectionRange: (range) => set(state => ({ selectedRanges: [...state.selectedRanges, range] })),
  clearMultiSelection: () => set({ selectedRanges: [] }),

  formatPainter: { active: false, persistent: false, format: null },
  activateFormatPainter: (format, persistent = false) => set({ formatPainter: { active: true, persistent, format } }),
  deactivateFormatPainter: () => set({ formatPainter: { active: false, persistent: false, format: null } }),

  clipboardData: null,
  setClipboardData: (clip) => set({ clipboardData: clip }),

  sheets: [{ id: 'sheet-1', name: 'Sheet1', data: {} }],
  activeSheetId: 'sheet-1',
  mergedCells: {},
  freezeRow: 0,
  freezeCol: 0,
  setFreezeRow: (r) => set(state => {
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, freezeRow: r } : s);
    return { freezeRow: r, sheets: updatedSheets };
  }),
  setFreezeCol: (c) => set(state => {
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, freezeCol: c } : s);
    return { freezeCol: c, sheets: updatedSheets };
  }),
  
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
  activeRibbonTab: 'home',
  setActiveRibbonTab: (tab) => set({ activeRibbonTab: tab }),
  showGridlines: true,
  setShowGridlines: (val) => set({ showGridlines: val }),
  showHeaders: true,
  setShowHeaders: (val) => set({ showHeaders: val }),
  showFormulaBar: true,
  setShowFormulaBar: (val) => set({ showFormulaBar: val }),
  zoomLevel: 1,
  setZoomLevel: (val) => set(state => ({
    zoomLevel: typeof val === 'function' ? Math.max(0.5, Math.min(2, val(state.zoomLevel))) : Math.max(0.5, Math.min(2, val))
  })),
  hiddenRows: new Set(),
  columnWidths: {},
  rowHeights: {},
  rowCount: 1000,
  colCount: 100,
  expandRows: (count = 500) => set(state => ({ rowCount: state.rowCount + count })),
  expandCols: (count = 50) => set(state => ({ colCount: state.colCount + count })),
  ensureDimensions: (r: number, c: number) => set(state => ({
    rowCount: Math.max(state.rowCount, r + 50),
    colCount: Math.max(state.colCount, c + 20)
  })),
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
    const mergeCellData = (prevCell: CellData | undefined, update: Partial<CellData>): CellData | undefined => {
      // null v and f means a clear operation — delete the cell
      if (update.v === null && update.f === null) return undefined;
      const merged = { ...prevCell, ...update };
      // Clean up null/undefined fields
      if (merged.v === null || merged.v === undefined) delete merged.v;
      if (merged.f === null || merged.f === undefined) delete merged.f;
      if (update.v !== undefined && update.f === undefined) {
        delete merged.f;
      }
      return merged as CellData;
    };

    const updatedSheets = state.sheets.map(s => {
      if (s.id === event.sheetId) {
        const newData = { ...s.data };
        const result = mergeCellData(s.data[event.cellKey], event.cell);
        if (result === undefined) delete newData[event.cellKey];
        else newData[event.cellKey] = result;
        return { ...s, data: newData };
      }
      return s;
    });

    if (event.sheetId === state.activeSheetId) {
      const newData = { ...state.data };
      const result = mergeCellData(state.data[event.cellKey], event.cell);
      if (result === undefined) delete newData[event.cellKey];
      else newData[event.cellKey] = result;
      return { sheets: updatedSheets, data: newData };
    }

    return { sheets: updatedSheets };
  }),

  applyRemoteBulkUpdate: (updates, sheetId) => set(state => {
    const targetSheetId = sheetId || state.activeSheetId;
    const applyUpdates = (existingData: SheetData): SheetData => {
      const newData = { ...existingData };
      Object.entries(updates).forEach(([key, update]) => {
        // null v and null f means a clear — delete the cell
        if (update.v === null && update.f === null) {
          delete newData[key];
        } else {
          const merged = { ...newData[key], ...update };
          if (merged.v === null || merged.v === undefined) delete merged.v;
          if (merged.f === null || merged.f === undefined) delete merged.f;
          newData[key] = merged;
        }
      });
      return newData;
    };

    const updatedSheets = state.sheets.map(s => {
      if (s.id === targetSheetId) {
        return { ...s, data: applyUpdates(s.data) };
      }
      return s;
    });

    if (targetSheetId === state.activeSheetId) {
      return { sheets: updatedSheets, data: applyUpdates(state.data) };
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

  applyRemoteSheetAction: (rawPayload: any) => {
    const action = rawPayload.action;
    const subPayload = rawPayload.payload || {};
    const index = rawPayload.index ?? subPayload.index;
    const colIndex = rawPayload.colIndex ?? subPayload.colIndex ?? rawPayload.columnIndex ?? subPayload.columnIndex;
    const name = rawPayload.name ?? subPayload.name;
    const data = rawPayload.data ?? subPayload.data ?? rawPayload.payload;
    const sender = rawPayload.sender ?? subPayload.sender;

    const store = get();
    if (action === 'insertRow') store.insertRowAbove(index, true);
    else if (action === 'insertCol') store.insertColumnRight(colIndex, true);
    else if (action === 'deleteRow') store.deleteRow(index, true);
    else if (action === 'deleteCol') store.deleteColumn(colIndex, true);
    else if (action === 'sort') store.sortAZ(colIndex, true);
    else if (action === 'sortZA') store.sortZA(colIndex, true);
    else if (action === 'toggleFilter') store.toggleFilter(colIndex, true);
    else if (action === 'clearSheet') store.clearSheet();
    else if (action === 'rename_sheet') store.renameWorkbook(name || 'Untitled Workbook');
    else if (action === 'import_workbook') {
      const p = data as { sheets: SheetTab[]; workbookName?: string };
      if (p?.sheets) store.importWorkbook(p.sheets, p.workbookName, true);
    }
    else if (action === 'share_dashboard') {
      window.dispatchEvent(new CustomEvent('show-dashboard', { detail: data }));
      toast(`${sender || 'A collaborator'} shared a Cinematic Dashboard!`, 'success');
    }
    else if (action === 'add_sheet_tab') {
      const p = (data || subPayload) as { id: string; name: string };
      if (p?.id) store.addSheetTab(p.name, p.id, true);
    }
    else if (action === 'rename_sheet_tab') {
      const p = (data || subPayload) as { id: string; name: string };
      if (p?.id) store.renameSheetTab(p.id, p.name, true);
    }
    else if (action === 'delete_sheet_tab') {
      const p = (data || subPayload) as { id: string };
      if (p?.id) store.deleteSheetTab(p.id, true);
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
        return {
          ...s,
          data: store.data,
          columnWidths: store.columnWidths,
          rowHeights: store.rowHeights,
          mergedCells: store.mergedCells,
          hiddenRows: store.hiddenRows,
          freezeRow: store.freezeRow,
          freezeCol: store.freezeCol,
        };
      }
      return s;
    });

    const targetSheet = updatedSheets.find(s => s.id === id);
    if (!targetSheet) return;

    // Guard: hiddenRows may arrive as a plain array after JSON deserialization (socket payloads)
    // A plain [] is truthy so `|| new Set()` won't fix it — we must explicitly coerce.
    const safeHiddenRows = (raw: unknown): Set<number> => {
      if (raw instanceof Set) return raw;
      if (Array.isArray(raw)) return new Set<number>(raw as number[]);
      return new Set<number>();
    };

    set({
      sheets: updatedSheets,
      activeSheetId: id,
      data: targetSheet.data,
      columnWidths: targetSheet.columnWidths || {},
      rowHeights: targetSheet.rowHeights || {},
      mergedCells: targetSheet.mergedCells || {},
      hiddenRows: safeHiddenRows(targetSheet.hiddenRows),
      freezeRow: targetSheet.freezeRow ?? 0,
      freezeCol: targetSheet.freezeCol ?? 0,
      activeCell: 'r_0_c_0',
      editingCell: null,
      selectionRange: null,
      selectedRanges: [],
      history: [],
      future: [],
      lockedCells: {}
    });

    const { r, c } = parseRef('r_0_c_0');
    socketService.emitCursorMove(store.localUserName, id, r, c, '#6366f1');
  },

  importWorkbook: (newSheets, name, remote = false) => {
    if (!newSheets || newSheets.length === 0) return;

    // Guard: hiddenRows may be a plain array after JSON deserialization over socket
    const safeHiddenRows = (raw: unknown): Set<number> => {
      if (raw instanceof Set) return raw;
      if (Array.isArray(raw)) return new Set<number>(raw as number[]);
      return new Set<number>();
    };

    // Coerce all sheets' hiddenRows to proper Sets
    const sanitizedSheets: SheetTab[] = newSheets.map(s => ({
      ...s,
      hiddenRows: safeHiddenRows(s.hiddenRows)
    }));

    const firstSheet = sanitizedSheets[0];

    // Find max rows and cols in the first sheet to adjust initial grid dimensions
    let maxR = 50;
    let maxC = 26;
    Object.keys(firstSheet.data).forEach(ref => {
      const match = ref.match(/r_(\d+)_c_(\d+)/);
      if (match) {
        maxR = Math.max(maxR, parseInt(match[1], 10) + 15);
        maxC = Math.max(maxC, parseInt(match[2], 10) + 10);
      }
    });

    set({
      sheets: sanitizedSheets,
      activeSheetId: firstSheet.id,
      data: firstSheet.data,
      columnWidths: firstSheet.columnWidths || {},
      rowHeights: firstSheet.rowHeights || {},
      mergedCells: firstSheet.mergedCells || {},
      hiddenRows: safeHiddenRows(firstSheet.hiddenRows),
      freezeRow: firstSheet.freezeRow ?? 0,
      freezeCol: firstSheet.freezeCol ?? 0,
      rowCount: Math.max(100, maxR),
      colCount: Math.max(26, maxC),
      activeCell: 'r_0_c_0',
      editingCell: null,
      selectionRange: null,
      selectedRanges: [],
      history: [],
      future: [],
      workbookName: name || 'Imported Workbook'
    });

    if (!remote) {
      socketService.emitSheetAction('default', 'import_workbook', { sheets: newSheets, workbookName: name });
    }
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
      socketService.emitCellUpdate(get().activeSheetId, ref, { fmt: currentFmt });
    }
  },

  setRangeFormat: (refs, formatPatch) => {
    if (refs.length === 0) return;
    const updatesForSocket: Record<string, Partial<CellData>> = {};

    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const newData = { ...state.data };

      refs.forEach(ref => {
        const existing = newData[ref]?.fmt || {};
        const newFmt = { ...existing, ...formatPatch };
        newData[ref] = { ...newData[ref], fmt: newFmt };
        updatesForSocket[ref] = { fmt: newFmt };
      });

      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });

    socketService.emitBulkCellUpdate(get().activeSheetId, updatesForSocket);
  },

  bulkSetCellData: (updates) => set(state => {
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data, ...updates };
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
    return { data: newData, sheets: updatedSheets, history, future: [] };
  }),

  clearCell: (ref) => {
    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const newData = { ...state.data };
      delete newData[ref];
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });
    // Use null instead of undefined so JSON serialization preserves the clear signal
    socketService.emitCellUpdate(get().activeSheetId, ref, { v: null, f: null });
  },

  clearSheet: () => set(state => {
    const history = [...state.history, state.data].slice(-50);
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: {} } : s);
    return { data: {}, sheets: updatedSheets, history, future: [] };
  }),

  clearRange: (refs) => {
    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const newData = { ...state.data };
      refs.forEach(ref => delete newData[ref]);
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });
    // Use null instead of undefined so JSON serialization preserves the clear signal
    const updates: Record<string, Partial<CellData>> = {};
    refs.forEach(ref => { updates[ref] = { v: null, f: null }; });
    socketService.emitBulkCellUpdate(get().activeSheetId, updates);
  },

  // --- ACTIONS: HISTORY & SNAPSHOTS ---
  undo: () => set(state => {
    if (state.history.length === 0) return {};
    const previous = state.history[state.history.length - 1];
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: previous } : s);
    return {
      data: previous,
      sheets: updatedSheets,
      history: state.history.slice(0, -1),
      future: [state.data, ...state.future]
    };
  }),

  redo: () => set(state => {
    if (state.future.length === 0) return {};
    const next = state.future[0];
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: next } : s);
    return {
      data: next,
      sheets: updatedSheets,
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
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: snap.data } : s);
    return { data: snap.data, sheets: updatedSheets, history: [...state.history, state.data], future: [] };
  }),

  // --- ACTIONS: LAYOUT & SEARCH ---
  setIsLightMode: (val) => set({ isLightMode: val }),
  setColumnWidth: (idx, w) => set(state => {
    const columnWidths = { ...state.columnWidths, [idx]: w };
    const sheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, columnWidths } : s);
    return { columnWidths, sheets };
  }),
  setRowHeight: (idx, h) => set(state => {
    const rowHeights = { ...state.rowHeights, [idx]: h };
    const sheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, rowHeights } : s);
    return { rowHeights, sheets };
  }),
  
  autoFitColumn: (colIndex) => set(state => {
    const targetC = colIndex ?? (state.activeCell ? parseRef(state.activeCell).c : 0);
    let maxPx = 60;
    Object.entries(state.data).forEach(([ref, cell]) => {
      const match = ref.match(/r_(\d+)_c_(\d+)/);
      if (!match || parseInt(match[2], 10) !== targetC) return;
      const text = cell.v !== undefined && cell.v !== null ? String(cell.v) : (cell.f || '');
      if (!text) return;
      const fontSize = cell.fmt?.fontSize || 13;
      const isBold = !!cell.fmt?.bold;
      const charWidth = (fontSize * 0.6) * (isBold ? 1.15 : 1.0);
      const lines = text.split('\n');
      lines.forEach(l => {
        const px = l.length * charWidth + 28;
        if (px > maxPx) maxPx = px;
      });
    });
    const finalW = Math.min(600, Math.max(50, Math.ceil(maxPx)));
    const columnWidths = { ...state.columnWidths, [targetC]: finalW };
    // Persist into sheets[] so column width survives tab switches
    const sheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, columnWidths } : s);
    return { columnWidths, sheets };
  }),

  autoFitRow: (rowIndex) => set(state => {
    const targetR = rowIndex ?? (state.activeCell ? parseRef(state.activeCell).r : 0);
    let maxH = 24;
    Object.entries(state.data).forEach(([ref, cell]) => {
      const match = ref.match(/r_(\d+)_c_(\d+)/);
      if (!match || parseInt(match[1], 10) !== targetR) return;
      const c = parseInt(match[2], 10);
      const colW = state.columnWidths[c] || 100;
      const text = cell.v !== undefined && cell.v !== null ? String(cell.v) : (cell.f || '');
      if (!text) return;
      const fontSize = cell.fmt?.fontSize || 13;
      const lineHeight = fontSize * 1.35;
      const charWidth = fontSize * 0.6;
      if (cell.fmt?.wrapText) {
        const charsPerLine = Math.max(1, Math.floor((colW - 16) / charWidth));
        const lines = text.split('\n');
        let totalLines = 0;
        lines.forEach(l => {
          totalLines += Math.max(1, Math.ceil(l.length / charsPerLine));
        });
        const h = Math.ceil(totalLines * lineHeight + 10);
        if (h > maxH) maxH = h;
      } else {
        const lines = text.split('\n');
        const h = Math.ceil(lines.length * lineHeight + 8);
        if (h > maxH) maxH = h;
      }
    });
    const finalH = Math.min(300, Math.max(24, maxH));
    const rowHeights = { ...state.rowHeights, [targetR]: finalH };
    // Persist into sheets[] so row height survives tab switches
    const sheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, rowHeights } : s);
    return { rowHeights, sheets };
  }),

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

  replaceCurrent: () => {
    const { results, currentIndex, replaceText } = get().findReplace;
    if (results.length === 0) return;
    const ref = results[currentIndex];
    const isFormula = replaceText.startsWith('=');
    const isNum = !isFormula && !isNaN(Number(replaceText)) && replaceText.trim() !== '';
    const newCell: Partial<CellData> = isFormula
      ? { f: replaceText }
      : { v: isNum ? Number(replaceText) : replaceText, f: undefined };

    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const newData = { ...state.data, [ref]: { ...state.data[ref], ...newCell } };
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });

    socketService.emitCellUpdate(get().activeSheetId, ref, newCell);
  },

  replaceAll: () => {
    const { results, replaceText } = get().findReplace;
    if (results.length === 0) return;
    const isFormula = replaceText.startsWith('=');
    const isNum = !isFormula && !isNaN(Number(replaceText)) && replaceText.trim() !== '';
    const newCell: Partial<CellData> = isFormula
      ? { f: replaceText }
      : { v: isNum ? Number(replaceText) : replaceText, f: undefined };

    const updatesForSocket: Record<string, Partial<CellData>> = {};

    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const newData = { ...state.data };
      results.forEach(ref => {
        newData[ref] = { ...newData[ref], ...newCell };
        updatesForSocket[ref] = newCell;
      });
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });

    socketService.emitBulkCellUpdate(get().activeSheetId, updatesForSocket);
  },

  // --- ACTIONS: COMPLEX SHEET MUTATIONS ---
  insertRowAbove: (rowIndex, remote = false) => {
    const target = rowIndex ?? (get().activeCell ? parseRef(get().activeCell!).r : 0);
    set(state => {
      const newData: SheetData = {};
      Object.entries(state.data).forEach(([ref, cell]) => {
        const { r, c } = parseRef(ref);
        newData[r >= target ? `r_${r + 1}_c_${c}` : ref] = cell;
      });

      const newRowHeights: Record<number, number> = {};
      Object.entries(state.rowHeights).forEach(([k, h]) => {
        const r = Number(k);
        newRowHeights[r >= target ? r + 1 : r] = h;
      });

      const newHiddenRows = new Set<number>();
      state.hiddenRows.forEach(r => {
        newHiddenRows.add(r >= target ? r + 1 : r);
      });

      const newMergedCells = shiftMergedCellsRow(state.mergedCells, target, 1);

      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? {
        ...s,
        data: newData,
        rowHeights: newRowHeights,
        hiddenRows: newHiddenRows,
        mergedCells: newMergedCells
      } : s);

      return {
        data: newData,
        rowHeights: newRowHeights,
        hiddenRows: newHiddenRows,
        mergedCells: newMergedCells,
        sheets: updatedSheets,
        history: [...state.history, state.data].slice(-50),
        future: []
      };
    });

    if (!remote) {
      socketService.emitSheetAction(get().activeSheetId, 'insertRow', { index: target });
    }
  },

  insertColumnRight: (colIndex, remote = false) => {
    const target = colIndex ?? (get().activeCell ? parseRef(get().activeCell!).c : 0);
    set(state => {
      const newData: SheetData = {};
      Object.entries(state.data).forEach(([ref, cell]) => {
        const { r, c } = parseRef(ref);
        newData[c > target ? `r_${r}_c_${c + 1}` : ref] = cell;
      });

      const newColumnWidths: Record<number, number> = {};
      Object.entries(state.columnWidths).forEach(([k, w]) => {
        const c = Number(k);
        newColumnWidths[c > target ? c + 1 : c] = w;
      });

      const newMergedCells = shiftMergedCellsCol(state.mergedCells, target, 1);

      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? {
        ...s,
        data: newData,
        columnWidths: newColumnWidths,
        mergedCells: newMergedCells
      } : s);

      return {
        data: newData,
        columnWidths: newColumnWidths,
        mergedCells: newMergedCells,
        sheets: updatedSheets,
        history: [...state.history, state.data].slice(-50),
        future: []
      };
    });

    if (!remote) {
      socketService.emitSheetAction(get().activeSheetId, 'insertCol', { colIndex: target });
    }
  },

  deleteRow: (rowIndex, remote = false) => {
    const target = rowIndex ?? (get().activeCell ? parseRef(get().activeCell!).r : -1);
    if (target === -1) return;
    set(state => {
      const newData: SheetData = {};
      Object.entries(state.data).forEach(([ref, cell]) => {
        const { r, c } = parseRef(ref);
        if (r === target) return;
        newData[r > target ? `r_${r - 1}_c_${c}` : ref] = cell;
      });

      const newRowHeights: Record<number, number> = {};
      Object.entries(state.rowHeights).forEach(([k, h]) => {
        const r = Number(k);
        if (r === target) return;
        newRowHeights[r > target ? r - 1 : r] = h;
      });

      const newHiddenRows = new Set<number>();
      state.hiddenRows.forEach(r => {
        if (r === target) return;
        newHiddenRows.add(r > target ? r - 1 : r);
      });

      const newMergedCells = shiftMergedCellsRow(state.mergedCells, target, -1);

      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? {
        ...s,
        data: newData,
        rowHeights: newRowHeights,
        hiddenRows: newHiddenRows,
        mergedCells: newMergedCells
      } : s);

      return {
        data: newData,
        rowHeights: newRowHeights,
        hiddenRows: newHiddenRows,
        mergedCells: newMergedCells,
        sheets: updatedSheets,
        history: [...state.history, state.data].slice(-50),
        future: []
      };
    });

    if (!remote) {
      socketService.emitSheetAction(get().activeSheetId, 'deleteRow', { index: target });
    }
  },

  deleteColumn: (colIndex, remote = false) => {
    const target = colIndex ?? (get().activeCell ? parseRef(get().activeCell!).c : -1);
    if (target === -1) return;
    set(state => {
      const newData: SheetData = {};
      Object.entries(state.data).forEach(([ref, cell]) => {
        const { r, c } = parseRef(ref);
        if (c === target) return;
        newData[c > target ? `r_${r}_c_${c - 1}` : ref] = cell;
      });

      const newColumnWidths: Record<number, number> = {};
      Object.entries(state.columnWidths).forEach(([k, w]) => {
        const c = Number(k);
        if (c === target) return;
        newColumnWidths[c > target ? c - 1 : c] = w;
      });

      const newMergedCells = shiftMergedCellsCol(state.mergedCells, target, -1);

      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? {
        ...s,
        data: newData,
        columnWidths: newColumnWidths,
        mergedCells: newMergedCells
      } : s);

      return {
        data: newData,
        columnWidths: newColumnWidths,
        mergedCells: newMergedCells,
        sheets: updatedSheets,
        history: [...state.history, state.data].slice(-50),
        future: []
      };
    });

    if (!remote) {
      socketService.emitSheetAction(get().activeSheetId, 'deleteCol', { colIndex: target });
    }
  },

  sortAZ: (colIndex, remote = false) => {
    const targetC = colIndex ?? (get().activeCell ? parseRef(get().activeCell!).c : 0);
    set(state => {
      let maxR = 0;
      Object.keys(state.data).forEach(ref => {
        const match = ref.match(/r_(\d+)_c_(\d+)/);
        if (match) maxR = Math.max(maxR, parseInt(match[1], 10));
      });
      const totalR = Math.max(maxR + 1, 100);

      const rows = Array.from({ length: totalR }, (_, r) => ({
        originalR: r,
        cells: Array.from({ length: state.colCount }, (_, c) => state.data[`r_${r}_c_${c}`])
      })).filter(row => row.cells.some(cell => !!cell));

      rows.sort((a, b) => String(a.cells[targetC]?.v || '').localeCompare(String(b.cells[targetC]?.v || ''), undefined, { sensitivity: 'base' }));

      const newData: SheetData = {};
      const newRowHeights: Record<number, number> = { ...state.rowHeights };
      rows.forEach((row, r) => {
        row.cells.forEach((cell, c) => {
          if (cell) newData[`r_${r}_c_${c}`] = cell;
        });
        if (state.rowHeights[row.originalR] !== undefined) {
          newRowHeights[r] = state.rowHeights[row.originalR];
        }
      });

      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData, rowHeights: newRowHeights } : s);
      return { data: newData, rowHeights: newRowHeights, sheets: updatedSheets, history: [...state.history, state.data].slice(-50), future: [] };
    });

    if (!remote) {
      socketService.emitSheetAction(get().activeSheetId, 'sort', { colIndex: targetC });
    }
  },

  clearCellFormats: (ref) => set(state => {
    if (!state.data[ref]) return {};
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data, [ref]: { ...state.data[ref], fmt: undefined } };
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
    return { data: newData, sheets: updatedSheets, history, future: [] };
  }),

  clearRangeFormats: (refs) => set(state => {
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data };
    refs.forEach(ref => {
      if (newData[ref]) {
        newData[ref] = { ...newData[ref], fmt: undefined };
      }
    });
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
    return { data: newData, sheets: updatedSheets, history, future: [] };
  }),

  clearRangeContents: (refs) => {
    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const newData = { ...state.data };
      refs.forEach(ref => {
        if (newData[ref]) {
          newData[ref] = { ...newData[ref], v: undefined, f: undefined };
        }
      });
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });
    // Use null instead of undefined so JSON serialization preserves the clear signal
    const updates: Record<string, Partial<CellData>> = {};
    refs.forEach(ref => { updates[ref] = { v: null, f: null }; });
    socketService.emitBulkCellUpdate(get().activeSheetId, updates);
  },

  sortZA: (colIndex, remote = false) => {
    const targetC = colIndex ?? (get().activeCell ? parseRef(get().activeCell!).c : 0);
    set(state => {
      let maxR = 0;
      Object.keys(state.data).forEach(ref => {
        const match = ref.match(/r_(\d+)_c_(\d+)/);
        if (match) maxR = Math.max(maxR, parseInt(match[1], 10));
      });
      const totalR = Math.max(maxR + 1, 100);

      const rows = Array.from({ length: totalR }, (_, r) => ({
        originalR: r,
        cells: Array.from({ length: state.colCount }, (_, c) => state.data[`r_${r}_c_${c}`])
      })).filter(row => row.cells.some(cell => !!cell));

      rows.sort((a, b) => String(b.cells[targetC]?.v || '').localeCompare(String(a.cells[targetC]?.v || ''), undefined, { sensitivity: 'base' }));

      const newData: SheetData = {};
      const newRowHeights: Record<number, number> = { ...state.rowHeights };
      rows.forEach((row, r) => {
        row.cells.forEach((cell, c) => {
          if (cell) newData[`r_${r}_c_${c}`] = cell;
        });
        if (state.rowHeights[row.originalR] !== undefined) {
          newRowHeights[r] = state.rowHeights[row.originalR];
        }
      });

      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData, rowHeights: newRowHeights } : s);
      return { data: newData, rowHeights: newRowHeights, sheets: updatedSheets, history: [...state.history, state.data].slice(-50), future: [] };
    });

    if (!remote) {
      socketService.emitSheetAction(get().activeSheetId, 'sortZA', { colIndex: targetC });
    }
  },

  pasteSpecial: (type) => {
    const store = get();
    const clip = store.clipboardData;
    const active = store.activeCell;
    if (!clip || !active || clip.grid.length === 0) {
      toast('Clipboard is empty. Copy cells first (Ctrl+C).', 'warning');
      return;
    }

    const start = parseRef(active);
    const updates: SheetData = {};

    if (type === 'transpose') {
      const rowCount = clip.grid.length;
      const colCount = clip.grid[0]?.length || 0;
      store.ensureDimensions(start.r + colCount, start.c + rowCount);

      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
          const srcCell = clip.grid[r][c];
          if (!srcCell) continue;
          const targetRef = `r_${start.r + c}_c_${start.c + r}`;
          updates[targetRef] = { ...srcCell };
        }
      }
    } else {
      const rowCount = clip.grid.length;
      const colCount = clip.grid[0]?.length || 0;
      store.ensureDimensions(start.r + rowCount, start.c + colCount);

      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
          const srcCell = clip.grid[r][c];
          if (!srcCell) continue;
          const targetRef = `r_${start.r + r}_c_${start.c + c}`;
          const existing = store.data[targetRef] || {};

          if (type === 'values') {
            updates[targetRef] = {
              ...existing,
              v: srcCell.v !== undefined ? srcCell.v : (srcCell.f || ''),
              f: undefined
            };
          } else if (type === 'formulas') {
            updates[targetRef] = {
              ...existing,
              v: srcCell.v,
              f: srcCell.f
            };
          } else if (type === 'formats') {
            if (srcCell.fmt) {
              updates[targetRef] = {
                ...existing,
                fmt: { ...srcCell.fmt }
              };
            }
          } else if (type === 'add' || type === 'subtract') {
            const existingVal = Number(existing.v) || 0;
            const srcVal = Number(srcCell.v) || 0;
            const result = type === 'add' ? existingVal + srcVal : existingVal - srcVal;
            updates[targetRef] = {
              ...existing,
              v: result,
              f: undefined
            };
          }
        }
      }
    }

    store.bulkSetCellData(updates);
    // Emit socket update so collaborators see the paste-special result
    if (Object.keys(updates).length > 0) {
      socketService.emitBulkCellUpdate(get().activeSheetId, updates);
    }
    toast(`Paste Special: ${type.toUpperCase()}`, 'success');
  },

  jumpToCell: (coord: string) => {
    const trimmed = coord.trim().toUpperCase();

    // Check range like A1:D20
    const rangeMatch = trimmed.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (rangeMatch) {
      const colStr1 = rangeMatch[1];
      const row1 = parseInt(rangeMatch[2], 10) - 1;
      const colStr2 = rangeMatch[3];
      const row2 = parseInt(rangeMatch[4], 10) - 1;

      let col1 = 0;
      for (let i = 0; i < colStr1.length; i++) col1 = col1 * 26 + (colStr1.charCodeAt(i) - 64);
      col1 -= 1;

      let col2 = 0;
      for (let i = 0; i < colStr2.length; i++) col2 = col2 * 26 + (colStr2.charCodeAt(i) - 64);
      col2 -= 1;

      if (row1 < 0 || row2 < 0 || col1 < 0 || col2 < 0) return false;

      get().ensureDimensions(Math.max(row1, row2), Math.max(col1, col2));
      const startRef = `r_${row1}_c_${col1}`;
      const endRef = `r_${row2}_c_${col2}`;
      get().setActiveCell(startRef);
      get().setSelectionRange({ start: startRef, end: endRef });
      return true;
    }

    // Single coordinate like A1
    const match = trimmed.match(/^([A-Z]+)(\d+)$/);
    if (!match) return false;
    const colStr = match[1];
    const rowNum = parseInt(match[2], 10) - 1;
    if (rowNum < 0) return false;

    let colNum = 0;
    for (let i = 0; i < colStr.length; i++) {
      colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
    }
    colNum -= 1;
    if (colNum < 0) return false;

    // Ensure sheet dimensions are expanded to contain target cell
    get().ensureDimensions(rowNum, colNum);

    const ref = `r_${rowNum}_c_${colNum}`;
    get().setActiveCell(ref);
    get().setSelectionRange({ start: ref, end: ref });
    return true;
  },

  toggleFilter: (colIndex, remote = false) => {
    const targetC = colIndex ?? (get().activeCell ? parseRef(get().activeCell!).c : 0);
    set(state => {
      if (state.hiddenRows.size > 0) {
        const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, hiddenRows: new Set<number>() } : s);
        return { hiddenRows: new Set<number>(), sheets: updatedSheets };
      }
      const newHidden = new Set<number>();
      Object.entries(state.data).forEach(([ref, cell]) => {
        const { r, c } = parseRef(ref);
        if (c === targetC && (!cell.v && !cell.f)) newHidden.add(r);
      });
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, hiddenRows: newHidden } : s);
      return { hiddenRows: newHidden, sheets: updatedSheets };
    });

    if (!remote) {
      socketService.emitSheetAction(get().activeSheetId, 'toggleFilter', { colIndex: targetC });
    }
  },

  mergeCell: (refs) => set(state => {
    if (!refs || refs.length < 2) return {};
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    refs.forEach(ref => {
      const { r, c } = parseRef(ref);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    });
    if (minR === Infinity) return {};
    const topLeftRef = `r_${minR}_c_${minC}`;
    const bounds = `r_${minR}_c_${minC}:r_${maxR}_c_${maxC}`;
    const newMerged = { ...state.mergedCells, [topLeftRef]: bounds };
    const history = [...state.history, state.data].slice(-50);
    const topLeftCell = state.data[topLeftRef] || {};
    const newData = {
      ...state.data,
      [topLeftRef]: {
        ...topLeftCell,
        fmt: { ...topLeftCell.fmt, align: topLeftCell.fmt?.align || 'center' }
      }
    };
    // Persist mergedCells into sheets[] so switching tabs and back preserves merges
    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData, mergedCells: newMerged } : s);
    toast('Cells merged & centered', 'success');
    return { mergedCells: newMerged, data: newData, sheets: updatedSheets, history, future: [] };
  }),

  unmergeCell: (ref) => set(state => {
    const newMerged = { ...state.mergedCells };
    let found = false;
    const { r: targetR, c: targetC } = parseRef(ref);
    Object.entries(newMerged).forEach(([key, bounds]) => {
      const [start, end] = bounds.split(':');
      const s = parseRef(start);
      const e = parseRef(end);
      if (targetR >= Math.min(s.r, e.r) && targetR <= Math.max(s.r, e.r) &&
          targetC >= Math.min(s.c, e.c) && targetC <= Math.max(s.c, e.c)) {
        delete newMerged[key];
        found = true;
      }
    });
    if (found) {
      // Persist unmerged state into sheets[] so switching tabs and back preserves the change
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, mergedCells: newMerged } : s);
      toast('Cells unmerged', 'info');
      return { mergedCells: newMerged, sheets: updatedSheets };
    }
    return {};
  }),

  fillDown: () => {
    const updatesForSocket: Record<string, Partial<CellData>> = {};
    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const newData = { ...state.data };
      if (state.selectionRange) {
        const s = parseRef(state.selectionRange.start);
        const e = parseRef(state.selectionRange.end);
        const minR = Math.min(s.r, e.r);
        const maxR = Math.max(s.r, e.r);
        const minC = Math.min(s.c, e.c);
        const maxC = Math.max(s.c, e.c);
        if (minR === maxR) {
          if (minR > 0) {
            for (let c = minC; c <= maxC; c++) {
              const src = state.data[`r_${minR - 1}_c_${c}`];
              const cellKey = `r_${minR}_c_${c}`;
              if (src) {
                newData[cellKey] = JSON.parse(JSON.stringify(src));
                updatesForSocket[cellKey] = newData[cellKey];
              } else {
                delete newData[cellKey];
                updatesForSocket[cellKey] = { v: undefined, f: undefined };
              }
            }
          }
        } else {
          for (let c = minC; c <= maxC; c++) {
            const src = state.data[`r_${minR}_c_${c}`];
            for (let r = minR + 1; r <= maxR; r++) {
              const cellKey = `r_${r}_c_${c}`;
              if (src) {
                newData[cellKey] = JSON.parse(JSON.stringify(src));
                updatesForSocket[cellKey] = newData[cellKey];
              } else {
                delete newData[cellKey];
                updatesForSocket[cellKey] = { v: undefined, f: undefined };
              }
            }
          }
        }
        toast('Filled down', 'success');
      } else if (state.activeCell) {
        const { r, c } = parseRef(state.activeCell);
        if (r > 0) {
          const src = state.data[`r_${r - 1}_c_${c}`];
          const cellKey = `r_${r}_c_${c}`;
          if (src) {
            newData[cellKey] = JSON.parse(JSON.stringify(src));
            updatesForSocket[cellKey] = newData[cellKey];
            toast('Filled down from cell above', 'success');
          }
        }
      }
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });

    if (Object.keys(updatesForSocket).length > 0) {
      socketService.emitBulkCellUpdate(get().activeSheetId, updatesForSocket);
    }
  },

  fillRight: () => {
    const updatesForSocket: Record<string, Partial<CellData>> = {};
    set(state => {
      const history = [...state.history, state.data].slice(-50);
      const newData = { ...state.data };
      if (state.selectionRange) {
        const s = parseRef(state.selectionRange.start);
        const e = parseRef(state.selectionRange.end);
        const minR = Math.min(s.r, e.r);
        const maxR = Math.max(s.r, e.r);
        const minC = Math.min(s.c, e.c);
        const maxC = Math.max(s.c, e.c);
        if (minC === maxC) {
          if (minC > 0) {
            for (let r = minR; r <= maxR; r++) {
              const src = state.data[`r_${r}_c_${minC - 1}`];
              const cellKey = `r_${r}_c_${minC}`;
              if (src) {
                newData[cellKey] = JSON.parse(JSON.stringify(src));
                updatesForSocket[cellKey] = newData[cellKey];
              } else {
                delete newData[cellKey];
                updatesForSocket[cellKey] = { v: undefined, f: undefined };
              }
            }
          }
        } else {
          for (let r = minR; r <= maxR; r++) {
            const src = state.data[`r_${r}_c_${minC}`];
            for (let c = minC + 1; c <= maxC; c++) {
              const cellKey = `r_${r}_c_${c}`;
              if (src) {
                newData[cellKey] = JSON.parse(JSON.stringify(src));
                updatesForSocket[cellKey] = newData[cellKey];
              } else {
                delete newData[cellKey];
                updatesForSocket[cellKey] = { v: undefined, f: undefined };
              }
            }
          }
        }
        toast('Filled right', 'success');
      } else if (state.activeCell) {
        const { r, c } = parseRef(state.activeCell);
        if (c > 0) {
          const src = state.data[`r_${r}_c_${c - 1}`];
          const cellKey = `r_${r}_c_${c}`;
          if (src) {
            newData[cellKey] = JSON.parse(JSON.stringify(src));
            updatesForSocket[cellKey] = newData[cellKey];
            toast('Filled right from cell left', 'success');
          }
        }
      }
      const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
      return { data: newData, sheets: updatedSheets, history, future: [] };
    });

    if (Object.keys(updatesForSocket).length > 0) {
      socketService.emitBulkCellUpdate(get().activeSheetId, updatesForSocket);
    }
  },

  removeDuplicates: () => set(state => {
    const history = [...state.history, state.data].slice(-50);
    let minR = 0, maxR = 0, minC = 0, maxC = state.colCount - 1;
    if (state.selectionRange) {
      const s = parseRef(state.selectionRange.start);
      const e = parseRef(state.selectionRange.end);
      minR = Math.min(s.r, e.r);
      maxR = Math.max(s.r, e.r);
      minC = Math.min(s.c, e.c);
      maxC = Math.max(s.c, e.c);
    } else {
      Object.keys(state.data).forEach(ref => {
        const { r, c } = parseRef(ref);
        if (r > maxR) maxR = r;
        if (c > maxC) maxC = c;
      });
    }

    const seenRows = new Set<string>();
    const duplicateRows = new Set<number>();

    for (let r = minR; r <= maxR; r++) {
      const rowKey = Array.from({ length: maxC - minC + 1 }, (_, i) => {
        const cell = state.data[`r_${r}_c_${minC + i}`];
        return String(cell?.v ?? cell?.f ?? '');
      }).join('|||');

      // Ignore purely empty lines unless repeated
      if (seenRows.has(rowKey)) {
        duplicateRows.add(r);
      } else {
        seenRows.add(rowKey);
      }
    }

    if (duplicateRows.size === 0) {
      toast('No duplicate rows found', 'info');
      return {};
    }

    const newData: SheetData = {};
    let targetRow = 0;
    // Bug fix: was `<= state.rowCount` (off-by-one), now `< state.rowCount`
    for (let r = 0; r < state.rowCount; r++) {
      if (duplicateRows.has(r)) continue;
      for (let c = 0; c < state.colCount; c++) {
        const cell = state.data[`r_${r}_c_${c}`];
        if (cell) newData[`r_${targetRow}_c_${c}`] = cell;
      }
      targetRow++;
    }

    const updatedSheets = state.sheets.map(s => s.id === state.activeSheetId ? { ...s, data: newData } : s);
    toast(`Removed ${duplicateRows.size} duplicate row${duplicateRows.size > 1 ? 's' : ''}`, 'success');
    return { data: newData, sheets: updatedSheets, history, future: [] };
  })
}));



