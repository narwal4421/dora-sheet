import { create } from 'zustand';

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
  undo: () => void;
  redo: () => void;
  
  saveSnapshot: (label: string) => void;
  restoreSnapshot: (id: string) => void;
  
  applyRemoteUpdate: (event: CellUpdateEvent) => void;
  applyRemoteBulkUpdate: (updates: Record<string, Partial<CellData>>) => void;
  updateRemoteCursor: (event: CursorMoveEvent) => void;
  cleanupStaleCursors: () => void;
  updateCellLock: (event: CellLockEvent) => void;
  applyRemoteSheetAction: (payload: { action: string, index?: number, colIndex?: number }) => void;
  setConnectedUsers: (users: ConnectedUser[]) => void;
  isHost: boolean;
  setIsHost: (isHost: boolean) => void;
  localUserName: string;
  setLocalUserName: (name: string) => void;
  isLocked: boolean;
  setRoomLocked: (locked: boolean) => void;
  teamMessages: { userName: string, message: string, timestamp: string }[];
  addTeamMessage: (msg: { userName: string, message: string, timestamp: string }) => void;
}

const parseRef = (ref: string) => {
  const match = ref.match(/r_(\d+)_c_(\d+)/);
  if (!match) return { r: 0, c: 0 };
  return { r: parseInt(match[1]), c: parseInt(match[2]) };
};

export const useSheetStore = create<SheetState>((set) => ({
  data: {},
  activeCell: 'r_0_c_0',
  editingCell: null,
  selectionRange: null,
  
  cursors: {},
  lockedCells: {},
  connectedUsers: [],
  isHost: false,
  setIsHost: (val: boolean) => set({ isHost: val }),
  localUserName: localStorage.getItem('userName') || 'Guest User',
  setLocalUserName: (name: string) => {
    localStorage.setItem('userName', name);
    set({ localUserName: name });
  },
  teamMessages: [],
  addTeamMessage: (msg) => set(state => ({ teamMessages: [...state.teamMessages, msg] })),
  isLocked: false,
  setRoomLocked: (locked) => set({ isLocked: locked }),

  history: [],
  future: [],
  snapshots: [
    {
      id: 'initial',
      label: 'Initial Empty State',
      createdAt: new Date().toISOString(),
      data: {}
    }
  ],
  
  isLightMode: false,
  setIsLightMode: (val) => set({ isLightMode: val }),

  findReplace: {
    isOpen: false,
    findText: '',
    replaceText: '',
    results: [],
    currentIndex: 0
  },

  setFindReplace: (partial) => set((state) => {
    const newState = { ...state.findReplace, ...partial };
    return { findReplace: newState };
  }),

  executeFind: () => set((state) => {
    const { findText } = state.findReplace;
    if (!findText) return { findReplace: { ...state.findReplace, results: [], currentIndex: 0 } };

    const results: string[] = [];
    
    // Highly optimized search using pre-compiled case-insensitive regex
    // This avoids creating thousands of intermediate lowercase strings in memory
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    const keys = Object.keys(state.data);
    const len = keys.length;
    
    for (let i = 0; i < len; i++) {
      const ref = keys[i];
      const cellData = state.data[ref];
      
      if (cellData.v !== undefined && regex.test(String(cellData.v))) {
        results.push(ref);
        continue;
      }
      
      if (cellData.f !== undefined && regex.test(cellData.f)) {
        results.push(ref);
      }
    }

    return {
      findReplace: { ...state.findReplace, results, currentIndex: 0 },
      activeCell: results.length > 0 ? results[0] : state.activeCell
    };
  }),

  nextFindResult: () => set((state) => {
    const { results, currentIndex } = state.findReplace;
    if (results.length === 0) return {};
    const nextIdx = (currentIndex + 1) % results.length;
    return {
      findReplace: { ...state.findReplace, currentIndex: nextIdx },
      activeCell: results[nextIdx]
    };
  }),

  prevFindResult: () => set((state) => {
    const { results, currentIndex } = state.findReplace;
    if (results.length === 0) return {};
    const prevIdx = (currentIndex - 1 + results.length) % results.length;
    return {
      findReplace: { ...state.findReplace, currentIndex: prevIdx },
      activeCell: results[prevIdx]
    };
  }),

  replaceCurrent: () => set((state) => {
    const { results, currentIndex, replaceText } = state.findReplace;
    if (results.length === 0) return {};
    
    const targetRef = results[currentIndex];
    const history = [...state.history, state.data].slice(-50);
    
    // We only replace the static value if it doesn't have a formula
    // For simplicity of Find&Replace in this MVP, we replace the `v` property.
    return {
      data: {
        ...state.data,
        [targetRef]: { ...state.data[targetRef], v: replaceText, f: undefined }
      },
      history,
      future: []
    };
  }),

  replaceAll: () => set((state) => {
    const { results, replaceText } = state.findReplace;
    if (results.length === 0) return {};

    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data };

    for (const ref of results) {
      newData[ref] = { ...newData[ref], v: replaceText, f: undefined };
    }

    return {
      data: newData,
      history,
      future: []
    };
  }),

  setActiveCell: (ref) => set({ activeCell: ref }),
  setEditingCell: (ref) => set({ editingCell: ref }),
  
  setCellData: (ref, cellData) => set((state) => {
    const history = [...state.history, state.data].slice(-50); // Keep last 50 states
    return {
      data: {
        ...state.data,
        [ref]: { ...state.data[ref], ...cellData }
      },
      history,
      future: []
    };
  }),
  
  setCellFormat: (ref, format) => set((state) => {
    const history = [...state.history, state.data].slice(-50);
    const existingFmt = state.data[ref]?.fmt || {};
    return {
      data: {
        ...state.data,
        [ref]: { ...state.data[ref], fmt: { ...existingFmt, ...format } }
      },
      history,
      future: []
    };
  }),

  bulkSetCellData: (updates) => set((state) => {
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data };
    for (const [ref, update] of Object.entries(updates)) {
      newData[ref] = { ...newData[ref], ...update };
    }
    return { data: newData, history, future: [] };
  }),

  applyRemoteBulkUpdate: (updates) => set((state) => {
    const newData = { ...state.data };
    for (const [ref, update] of Object.entries(updates)) {
      newData[ref] = { ...newData[ref], ...update };
    }
    return { data: newData };
  }),
  
  clearCell: (ref) => set((state) => {
    const history = [...state.history, state.data].slice(-50);
    const newData = { ...state.data };
    delete newData[ref];
    return { data: newData, history, future: [] };
  }),
  
  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    const previous = state.history[state.history.length - 1];
    const newHistory = state.history.slice(0, -1);
    return {
      data: previous,
      history: newHistory,
      future: [state.data, ...state.future]
    };
  }),
  
  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      data: next,
      history: [...state.history, state.data],
      future: newFuture
    };
  }),
  
  applyRemoteUpdate: (event) => set((state) => ({
    data: {
      ...state.data,
      [event.cellKey]: { ...state.data[event.cellKey], ...event.cell }
    }
  })),
  
  cleanupStaleCursors: () => set((state) => {
    const now = Date.now();
    const newCursors = { ...state.cursors };
    let changed = false;
    Object.entries(newCursors).forEach(([userId, cursor]) => {
      if (now - cursor.timestamp > 10000) {
        delete newCursors[userId];
        changed = true;
      }
    });
    return changed ? { cursors: newCursors } : {};
  }),

  updateRemoteCursor: (event) => set((state) => ({
    cursors: {
      ...state.cursors,
      [event.userId]: { ...event, timestamp: Date.now() }
    }
  })),
  
  updateCellLock: (event) => set((state) => {
    const newLocks = { ...state.lockedCells };
    if (event.action === 'lock') {
      newLocks[event.cellKey] = event.userId;
    } else {
      delete newLocks[event.cellKey];
    }
    return { lockedCells: newLocks };
  }),
  
  applyRemoteSheetAction: (payload) => {
    const { action, index, colIndex } = payload;
    const store = useSheetStore.getState();
    
    // We call the local actions but WITHOUT re-emitting to avoid loops
    // Since our local actions use 'set', they already trigger re-renders.
    if (action === 'insertRow') store.insertRowAbove(index);
    if (action === 'insertCol') store.insertColumnRight(colIndex);
    if (action === 'deleteRow') store.deleteRow(index);
    if (action === 'deleteCol') store.deleteColumn(colIndex);
    if (action === 'sort') store.sortAZ(colIndex);
    if (action === 'filter' || action === 'toggleFilter') store.toggleFilter(colIndex);
  },

  setConnectedUsers: (users) => set({ connectedUsers: users }),

  saveSnapshot: (label) => set((state) => ({
    snapshots: [
      { id: Date.now().toString(), label, createdAt: new Date().toISOString(), data: state.data },
      ...state.snapshots
    ]
  })),

  restoreSnapshot: (id) => set((state) => {
    const snap = state.snapshots.find(s => s.id === id);
    if (!snap) return state;
    return { data: snap.data, history: [...state.history, state.data], future: [] };
  }),

  hiddenRows: new Set(),
  columnWidths: {},
  rowHeights: {},

  setColumnWidth: (index, width) => set((state) => ({
    columnWidths: { ...state.columnWidths, [index]: width }
  })),

  setRowHeight: (index, height) => set((state) => ({
    rowHeights: { ...state.rowHeights, [index]: height }
  })),

  setSelectionRange: (range) => set({ selectionRange: range }),

  insertRowAbove: (rowIndex) => set((state) => {
    const targetR = rowIndex !== undefined ? rowIndex : (state.activeCell ? parseRef(state.activeCell).r : 0);
    const newData: SheetData = {};
    const history = [...state.history, state.data].slice(-50);

    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      if (r >= targetR) {
        newData[`r_${r + 1}_c_${c}`] = cell;
      } else {
        newData[ref] = cell;
      }
    });

    return { data: newData, history, future: [] };
  }),

  insertColumnRight: (colIndex) => set((state) => {
    const targetC = colIndex !== undefined ? colIndex : (state.activeCell ? parseRef(state.activeCell).c : 0);
    const newData: SheetData = {};
    const history = [...state.history, state.data].slice(-50);

    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      if (c > targetC) {
        newData[`r_${r}_c_${c + 1}`] = cell;
      } else {
        newData[ref] = cell;
      }
    });

    return { data: newData, history, future: [] };
  }),

  deleteRow: (rowIndex) => set((state) => {
    const targetR = rowIndex !== undefined ? rowIndex : (state.activeCell ? parseRef(state.activeCell).r : -1);
    if (targetR === -1) return {};
    const newData: SheetData = {};
    const history = [...state.history, state.data].slice(-50);

    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      if (r === targetR) return; 
      if (r > targetR) {
        newData[`r_${r - 1}_c_${c}`] = cell;
      } else {
        newData[ref] = cell;
      }
    });

    return { data: newData, history, future: [] };
  }),

  deleteColumn: (colIndex) => set((state) => {
    const targetC = colIndex !== undefined ? colIndex : (state.activeCell ? parseRef(state.activeCell).c : -1);
    if (targetC === -1) return {};
    const newData: SheetData = {};
    const history = [...state.history, state.data].slice(-50);

    Object.entries(state.data).forEach(([ref, cell]) => {
      const { r, c } = parseRef(ref);
      if (c === targetC) return;
      if (c > targetC) {
        newData[`r_${r}_c_${c - 1}`] = cell;
      } else {
        newData[ref] = cell;
      }
    });

    return { data: newData, history, future: [] };
  }),

  sortAZ: (colIndex) => set((state) => {
    const targetC = colIndex !== undefined ? colIndex : (state.activeCell ? parseRef(state.activeCell).c : 0);
    
    // Find used range
    let maxR = 0;
    Object.keys(state.data).forEach(ref => {
      const { r } = parseRef(ref);
      maxR = Math.max(maxR, r);
    });

    // Extract rows
    const rows: (CellData | undefined)[][] = [];
    for (let r = 0; r <= maxR; r++) {
      const row = [];
      for (let c = 0; c < 26; c++) { // Assuming 26 cols as in Grid.tsx
        row.push(state.data[`r_${r}_c_${c}`]);
      }
      rows.push(row);
    }

    // Sort
    rows.sort((a, b) => {
      const valA = String(a[targetC]?.v || '').toLowerCase();
      const valB = String(b[targetC]?.v || '').toLowerCase();
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    });

    // Reconstruct
    const newData: SheetData = {};
    rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) newData[`r_${r}_c_${c}`] = cell;
      });
    });

    const history = [...state.history, state.data].slice(-50);
    return { data: newData, history, future: [] };
  }),

  toggleFilter: (colIndex) => set((state) => {
    const targetC = colIndex !== undefined ? colIndex : (state.activeCell ? parseRef(state.activeCell).c : 0);
    
    if (state.hiddenRows.size > 0) {
      return { hiddenRows: new Set() };
    }

    const newHidden = new Set<number>();
    let maxR = 0;
    Object.keys(state.data).forEach(ref => {
      const { r } = parseRef(ref);
      maxR = Math.max(maxR, r);
    });

    for (let r = 0; r <= maxR; r++) {
      const cell = state.data[`r_${r}_c_${targetC}`];
      if (!cell?.v && !cell?.f) {
        newHidden.add(r);
      }
    }

    return { hiddenRows: newHidden };
  })
}));

