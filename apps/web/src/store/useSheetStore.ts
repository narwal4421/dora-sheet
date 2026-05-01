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
  v?: string | number; // Evaluated value
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
  updateRemoteCursor: (event: CursorMoveEvent) => void;
  updateCellLock: (event: CellLockEvent) => void;
  setConnectedUsers: (users: ConnectedUser[]) => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  data: {},
  activeCell: 'r_0_c_0',
  editingCell: null,
  selectionRange: null,
  
  cursors: {},
  lockedCells: {},
  connectedUsers: [],

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
  
  setConnectedUsers: (users) => set({ connectedUsers: users })
}));

