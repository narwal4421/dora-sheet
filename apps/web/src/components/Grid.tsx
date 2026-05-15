import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useVirtualizerWrapper } from '../hooks/useVirtualizerWrapper';
import { useSheetStore } from '../store/useSheetStore';
import { EngineWrapper } from '@smartsheet-ai/formula-engine';
import { socketService } from '../services/socket.service';

import { Cell } from './Cell';
import { ContextMenu } from './ContextMenu';
import type { MenuItem } from './ContextMenu';

import { SelectionOverlay } from './Grid/SelectionOverlay';
import { GridHeaders } from './Grid/GridHeaders';
import { RemoteCursorsLayer } from './Grid/RemoteCursorsLayer';

const ROWS = 1000;
const COLS = 26;

const HEADER_H = 26;
const INDEX_W = 46;

const getColName = (c: number) => {
  let name = '';
  let temp = c;
  while (temp >= 0) {
    name = String.fromCharCode(65 + (temp % 26)) + name;
    temp = Math.floor(temp / 26) - 1;
  }
  return name;
};

const parseRef = (ref: string) => {
  const match = ref.match(/r_(\d+)_c_(\d+)/);
  if (!match) return { r: 0, c: 0 };
  return { r: parseInt(match[1]), c: parseInt(match[2]) };
};

/**
 * GOD LEVEL GRID ENGINE
 * High-performance, collaborative spreadsheet core.
 * Features optimized DOM virtualization, sub-millisecond interaction feedback,
 * and high-fidelity collaborator tracking.
 */
export const Grid = ({ isDashboard = false, workbookId = 'default' }: { isDashboard?: boolean, workbookId?: string }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  // --- STATE SELECTORS (ELITE PERFORMANCE) ---
  const data = useSheetStore(state => state.data);
  const selectionRange = useSheetStore(state => state.selectionRange);
  const remoteCursors = useSheetStore(state => state.cursors);
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  const localUserName = useSheetStore(state => state.localUserName);
  const hiddenRows = useSheetStore(state => state.hiddenRows);
  const columnWidths = useSheetStore(state => state.columnWidths);
  const rowHeights = useSheetStore(state => state.rowHeights);

  const [engine, setEngine] = useState<EngineWrapper | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

  const finalHeaderH = isDashboard ? 0 : HEADER_H;
  const finalIndexW = isDashboard ? 0 : INDEX_W;

  // --- VIRTUALIZATION ENGINE ---
  const visibleRowIndices = useMemo(() => {
    const indices = [];
    for (let i = 0; i < ROWS; i++) {
      if (!hiddenRows.has(i)) indices.push(i);
    }
    return indices;
  }, [hiddenRows]);

  const rowVirtualizer = useVirtualizerWrapper({
    count: visibleRowIndices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((i: number) => rowHeights[visibleRowIndices[i]] || 24, [rowHeights, visibleRowIndices]),
    overscan: 10,
  });

  const colVirtualizer = useVirtualizerWrapper({
    horizontal: true,
    count: COLS,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((i: number) => columnWidths[i] || 100, [columnWidths]),
    overscan: 5,
  });

  // --- INTERACTION HANDLERS ---
  const handleCellSelect = useCallback((ref: string) => {
    useSheetStore.getState().setActiveCell(ref);
    useSheetStore.getState().setSelectionRange({ start: ref, end: ref });
    const { r, c } = parseRef(ref);
    socketService.emitCursorMove(localUserName, workbookId, r, c, '#6366f1');
  }, [localUserName, workbookId]);

  const handleCellMouseDown = useCallback((ref: string) => {
    if (isDashboard) return;
    setIsSelecting(true);
    useSheetStore.getState().setActiveCell(ref);
    useSheetStore.getState().setSelectionRange({ start: ref, end: ref });
  }, [isDashboard]);

  const handleCellMouseEnter = useCallback((ref: string) => {
    if (!isSelecting || isDashboard) return;
    const start = useSheetStore.getState().activeCell;
    if (start) {
      useSheetStore.getState().setSelectionRange({ start, end: ref });
    }
  }, [isSelecting, isDashboard]);

  const handleGlobalMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  // --- SELECTION CALCULATOR (MISSION CRITICAL) ---
  const selectionStyle = useMemo(() => {
    if (!selectionRange) return null;
    const start = parseRef(selectionRange.start);
    const end = parseRef(selectionRange.end);
    
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);

    const vMinRIdx = visibleRowIndices.indexOf(minR);
    const vMaxRIdx = visibleRowIndices.indexOf(maxR);
    
    if (vMinRIdx === -1) return null;

    let top = 0;
    for (let i = 0; i < vMinRIdx; i++) top += rowHeights[visibleRowIndices[i]] || 24;
    
    let left = 0;
    for (let i = 0; i < minC; i++) left += columnWidths[i] || 100;

    let height = 0;
    for (let i = vMinRIdx; i <= vMaxRIdx; i++) height += rowHeights[visibleRowIndices[i]] || 24;

    let width = 0;
    for (let i = minC; i <= maxC; i++) width += columnWidths[i] || 100;

    return { top: top + finalHeaderH, left: left + finalIndexW, width, height };
  }, [selectionRange, rowHeights, columnWidths, visibleRowIndices, finalHeaderH, finalIndexW]);

  // --- ENGINE LIFECYCLE ---
  useEffect(() => {
    const worker = new Worker(new URL('@smartsheet-ai/formula-engine/dist/formula.worker.js', import.meta.url), { type: 'module' });
    const wrapper = new EngineWrapper(worker);
    wrapper.init().then(() => setEngine(wrapper));
    return () => worker.terminate();
  }, []);

  return (
    <div 
      ref={parentRef} 
      className={`flex-1 overflow-auto bg-background outline-none select-none relative scrollbar-premium ${isDashboard ? 'cursor-default' : ''}`} 
      tabIndex={0}
      onContextMenu={(e) => {
        if (isDashboard) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, items: [
          { label: 'Copy', icon: '📋', onClick: () => {} },
          { label: 'Paste', icon: '📌', onClick: () => {} },
          { divider: true },
          { label: 'Insert Row', icon: '⬆', onClick: () => useSheetStore.getState().insertRowAbove() },
          { label: 'Delete Row', icon: '✕', danger: true, onClick: () => useSheetStore.getState().deleteRow() }
        ]});
      }}
    >
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}

      <div style={{ height: `${rowVirtualizer.getTotalSize() + finalHeaderH}px`, width: `${colVirtualizer.getTotalSize() + finalIndexW}px`, position: 'relative' }}>
        
        {!isDashboard && (
          <SelectionOverlay 
            selectionStyle={selectionStyle} 
            onAutoFillStart={() => {}} 
          />
        )}

        {!isDashboard && (
          <GridHeaders 
            colVirtualizer={colVirtualizer}
            rowVirtualizer={rowVirtualizer}
            visibleRowIndices={visibleRowIndices}
            finalHeaderH={finalHeaderH}
            finalIndexW={finalIndexW}
            getColName={getColName}
            onColResizeStart={(e, idx, w) => {
              const startX = e.clientX;
              const onMove = (me: MouseEvent) => useSheetStore.getState().setColumnWidth(idx, Math.max(40, w + me.clientX - startX));
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            onRowResizeStart={(e, idx, h) => {
              const startY = e.clientY;
              const onMove = (me: MouseEvent) => useSheetStore.getState().setRowHeight(visibleRowIndices[idx], Math.max(20, h + me.clientY - startY));
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            onAutoFit={(idx) => {
              let maxLen = 4;
              Object.entries(data).forEach(([ref, cell]) => {
                const cVal = (cell as { v?: unknown })?.v;
                if (parseRef(ref).c === idx && cVal) maxLen = Math.max(maxLen, String(cVal).length);
              });
              useSheetStore.getState().setColumnWidth(idx, Math.max(50, maxLen * 9));
            }}
          />
        )}

        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const r = visibleRowIndices[vRow.index];
          return colVirtualizer.getVirtualItems().map((vCol) => {
            const c = vCol.index;
            const ref = `r_${r}_c_${c}`;
            return (
              <Cell 
                key={ref} r={r} c={c}
                style={{ top: finalHeaderH + vRow.start, left: finalIndexW + vCol.start, width: vCol.size, height: vRow.size }}
                onCellSelect={isDashboard ? () => {} : handleCellSelect} 
                onCommitChange={isDashboard ? () => {} : async (r, c, val) => {
                  const ref = `r_${r}_c_${c}`;
                  const isF = val.startsWith('=');
                  const update = { [isF ? 'f' : 'v']: val, ...(isF ? {} : { f: undefined }) };
                  useSheetStore.getState().setCellData(ref, update);
                  socketService.emitCellUpdate(workbookId, ref, update);

                  if (engine && isF) {
                    try {
                      const res = await engine.setData(r, c, val);
                      const final = { v: res.v };
                      useSheetStore.getState().setCellData(ref, final);
                      socketService.emitCellUpdate(workbookId, ref, final);
                    } catch (e) {
                      console.error('Formula error:', e);
                    }
                  }
                }}
                onCellKeydown={() => {}}
                onMouseDown={isDashboard ? undefined : () => handleCellMouseDown(ref)} 
                onMouseEnter={isDashboard ? undefined : () => handleCellMouseEnter(ref)}
              />
            );
          });
        })}

        {!isDashboard && (
          <RemoteCursorsLayer 
            remoteCursors={remoteCursors}
            connectedUsers={connectedUsers}
            rowVirtualizer={rowVirtualizer}
            colVirtualizer={colVirtualizer}
            visibleRowIndices={visibleRowIndices}
            finalHeaderH={finalHeaderH}
            finalIndexW={finalIndexW}
          />
        )}
      </div>
    </div>
  );
};
