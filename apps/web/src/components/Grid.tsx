import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSheetStore } from '../store/useSheetStore';
import { EngineWrapper } from '@smartsheet-ai/formula-engine';
import { socketService } from '../services/socket.service';

import { Cell } from './Cell';

const ROWS = 1000;
const COLS = 26;
const SHEET_ID = 'default-sheet-id';

const getColName = (c: number) => {
  let name = '';
  let temp = c;
  while (temp >= 0) {
    name = String.fromCharCode(65 + (temp % 26)) + name;
    temp = Math.floor(temp / 26) - 1;
  }
  return name;
};

export const Grid = () => {
  'use no memo';
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Only grab the static updater functions, NO reactive state arrays!
  const { setActiveCell, setCellData } = useSheetStore();
  const [engine, setEngine] = useState<EngineWrapper | null>(null);

  const cursorMoveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('@smartsheet-ai/formula-engine/dist/formula.worker.js', import.meta.url), { type: 'module' });
    const wrapper = new EngineWrapper(worker);
    wrapper.init().then(() => {
      setEngine(wrapper);
    });
    return () => worker.terminate();
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: ROWS,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 10,
  });

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: COLS,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  const parseRef = (ref: string) => {
    const match = ref.match(/r_(\d+)_c_(\d+)/);
    if (!match) return { r: 0, c: 0 };
    return { r: parseInt(match[1]), c: parseInt(match[2]) };
  };

  const emitCursorMove = (r: number, c: number) => {
    if (cursorMoveTimeout.current) clearTimeout(cursorMoveTimeout.current);
    cursorMoveTimeout.current = setTimeout(() => {
      socketService.emitCursorMove('Me', SHEET_ID, r, c, '#000000'); 
    }, 100);
  };

  const handleCellSelect = (ref: string) => {
    setActiveCell(ref);
    const { r, c } = parseRef(ref);
    emitCursorMove(r, c);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Read state dynamically so Grid doesn't re-render on keystrokes
    const state = useSheetStore.getState();
    const activeCell = state.activeCell;
    const editingCell = state.editingCell;
    const lockedCells = state.lockedCells;

    if (!activeCell) return;
    const { r, c } = parseRef(activeCell);

    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        // The blur handler on the input will commit the value
      } else if (e.key === 'Tab') {
        e.preventDefault();
      } else if (e.key === 'Escape') {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (r < ROWS - 1) handleCellSelect(`r_${r + 1}_c_${c}`);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (r > 0) handleCellSelect(`r_${r - 1}_c_${c}`);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (c < COLS - 1) handleCellSelect(`r_${r}_c_${c + 1}`);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (c > 0) handleCellSelect(`r_${r}_c_${c - 1}`);
        break;
      case 'Enter':
        e.preventDefault();
        if (!lockedCells[activeCell]) {
          socketService.emitCellLock(activeCell, 'lock');
          state.setEditingCell(activeCell);
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (!lockedCells[activeCell]) {
           state.clearCell(activeCell);
           socketService.emitCellUpdate(SHEET_ID, activeCell, { v: undefined, f: undefined });
        }
        break;
    }
  };

  const commitCellChange = async (r: number, c: number, value: string) => {
    const ref = `r_${r}_c_${c}`;
    const isFormula = value.startsWith('=');
    
    const newCellData = { [isFormula ? 'f' : 'v']: value, ...(!isFormula && { f: undefined }) };
    setCellData(ref, newCellData);
    socketService.emitCellUpdate(SHEET_ID, ref, newCellData);

    if (engine) {
      try {
        const result = await engine.setData(r, c, value);
        const finalCellData = { v: result.v };
        setCellData(ref, finalCellData);
        socketService.emitCellUpdate(SHEET_ID, ref, finalCellData);
      } catch (e) {
        console.error("Engine calculation error:", e);
      }
    }
  };

  const handleCellKeydown = (e: React.KeyboardEvent, r: number, c: number, ref: string) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      commitCellChange(r, c, (e.target as HTMLInputElement).value);
      socketService.emitCellLock(ref, 'unlock');
      useSheetStore.getState().setEditingCell(null);
      if (r < ROWS - 1) handleCellSelect(`r_${r + 1}_c_${c}`);
      parentRef.current?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitCellChange(r, c, (e.target as HTMLInputElement).value);
      socketService.emitCellLock(ref, 'unlock');
      useSheetStore.getState().setEditingCell(null);
      if (c < COLS - 1) handleCellSelect(`r_${r}_c_${c + 1}`);
      parentRef.current?.focus();
    } else if (e.key === 'Escape') {
      socketService.emitCellLock(ref, 'unlock');
      useSheetStore.getState().setEditingCell(null);
      parentRef.current?.focus();
    }
  };

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-auto bg-background outline-none select-none relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize() + 24}px`,
          width: `${colVirtualizer.getTotalSize() + 40}px`,
          position: 'relative',
        }}
      >
        {/* Column Headers */}
        {colVirtualizer.getVirtualItems().map((virtualCol) => (
          <div
            key={`header-col-${virtualCol.index}`}
            className="absolute top-0 flex items-center justify-center border-b border-r border-border bg-surface text-xs text-textMuted font-semibold z-20 hover:bg-surfaceHover transition-colors"
            style={{
              left: 40 + virtualCol.start,
              width: virtualCol.size,
              height: 24,
            }}
          >
            {getColName(virtualCol.index)}
          </div>
        ))}

        {/* Row Headers */}
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={`header-row-${virtualRow.index}`}
            className="absolute left-0 flex items-center justify-center border-b border-r border-border bg-surface text-xs text-textMuted font-semibold z-20 hover:bg-surfaceHover transition-colors"
            style={{
              top: 24 + virtualRow.start,
              width: 40,
              height: virtualRow.size,
            }}
          >
            {virtualRow.index + 1}
          </div>
        ))}

        {/* Corner cell */}
        <div 
          className="absolute top-0 left-0 border-b border-r border-border bg-surface z-30" 
          style={{ width: 40, height: 24 }} 
        />

        {/* Grid Cells */}
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div key={`row-${virtualRow.index}`}>
            {colVirtualizer.getVirtualItems().map((virtualCol) => {
              const r = virtualRow.index;
              const c = virtualCol.index;
              return (
                <Cell 
                  key={`r_${r}_c_${c}`}
                  r={r}
                  c={c}
                  style={{
                    top: 24 + virtualRow.start,
                    left: 40 + virtualCol.start,
                    width: virtualCol.size,
                    height: virtualRow.size,
                  }}
                  onCellSelect={handleCellSelect}
                  onCommitChange={commitCellChange}
                  onCellKeydown={handleCellKeydown}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
