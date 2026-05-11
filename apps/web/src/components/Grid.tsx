import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useVirtualizerWrapper } from '../hooks/useVirtualizerWrapper';
import { useSheetStore, type CellData } from '../store/useSheetStore';
import { EngineWrapper } from '@smartsheet-ai/formula-engine';
import { socketService } from '../services/socket.service';
import { toast } from '../store/useToastStore';

import { Cell } from './Cell';
import { ContextMenu } from './ContextMenu';
import type { MenuItem } from './ContextMenu';

const ROWS = 1000;
const COLS = 26;

const HEADER_H = 26;
const INDEX_W = 46;

// Dashboard specific sizes (0 if hidden)
const DASH_HEADER_H = 0;
const DASH_INDEX_W = 0;

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

export const Grid = ({ isDashboard = false, workbookId = 'default-workbook-id' }: { isDashboard?: boolean, workbookId?: string }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // 1. Store hooks
  const { setActiveCell, setCellData, setColumnWidth, setRowHeight, setSelectionRange, bulkSetCellData } = useSheetStore();
  const hiddenRows = useSheetStore(state => state.hiddenRows);
  const columnWidths = useSheetStore(state => state.columnWidths);
  const rowHeights = useSheetStore(state => state.rowHeights);
  const selectionRange = useSheetStore(state => state.selectionRange);
  const remoteCursors = useSheetStore(state => state.cursors);
  const connectedUsers = useSheetStore(state => state.connectedUsers);

  const finalHeaderH = isDashboard ? DASH_HEADER_H : HEADER_H;
  const finalIndexW = isDashboard ? DASH_INDEX_W : INDEX_W;

  // 2. State hooks
  const [engine, setEngine] = useState<EngineWrapper | null>(null);
  const [resizingCol, setResizingCol] = useState<{ index: number; startX: number; startWidth: number } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ index: number; startY: number; startHeight: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

  const rafId = useRef<number | null>(null);

  // 3. Memos
  const visibleRowIndices = useMemo(() => {
    const indices = [];
    for (let i = 0; i < ROWS; i++) {
      if (!hiddenRows.has(i)) indices.push(i);
    }
    return indices;
  }, [hiddenRows]);

  const selectionBounds = useMemo(() => {
    if (!selectionRange) return null;
    const start = parseRef(selectionRange.start);
    const end = parseRef(selectionRange.end);
    return {
      minR: Math.min(start.r, end.r),
      maxR: Math.max(start.r, end.r),
      minC: Math.min(start.c, end.c),
      maxC: Math.max(start.c, end.c),
    };
  }, [selectionRange]);

  // 4. Virtualizers
  const rowVirtualizer = useVirtualizerWrapper({
    count: visibleRowIndices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rowHeights[visibleRowIndices[index]] || 24,
    overscan: 10,
  });

  const colVirtualizer = useVirtualizerWrapper({
    horizontal: true,
    count: COLS,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => columnWidths[index] || 100,
    overscan: 5,
  });

  // Calculate pixel bounds for the selection overlay
  const selectionStyle = useMemo(() => {
    if (!selectionBounds) return null;
    
    // Find virtual positions for start/end
    let top = 0;
    for (let i = 0; i < visibleRowIndices.indexOf(selectionBounds.minR); i++) {
      top += rowHeights[visibleRowIndices[i]] || 24;
    }
    
    let left = 0;
    for (let i = 0; i < selectionBounds.minC; i++) {
      left += columnWidths[i] || 100;
    }

    let height = 0;
    for (let i = visibleRowIndices.indexOf(selectionBounds.minR); i <= visibleRowIndices.indexOf(selectionBounds.maxR); i++) {
      height += rowHeights[visibleRowIndices[i]] || 24;
    }

    let width = 0;
    for (let i = selectionBounds.minC; i <= selectionBounds.maxC; i++) {
      width += columnWidths[i] || 100;
    }

    return {
      top: top + finalHeaderH,
      left: left + finalIndexW,
      width,
      height,
    };
  }, [selectionBounds, rowHeights, columnWidths, visibleRowIndices, finalHeaderH, finalIndexW]);

  // 5. Effects
  useEffect(() => {
    const worker = new Worker(new URL('@smartsheet-ai/formula-engine/dist/formula.worker.js', import.meta.url), { type: 'module' });
    const wrapper = new EngineWrapper(worker);
    wrapper.init().then(() => setEngine(wrapper));
    return () => worker.terminate();
  }, []);

  useEffect(() => { rowVirtualizer.measure(); }, [rowHeights, rowVirtualizer]);
  useEffect(() => { colVirtualizer.measure(); }, [columnWidths, colVirtualizer]);

  useEffect(() => {
    const onUp = () => { setIsSelecting(false); setIsAutoFilling(false); };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const handleColResizeStart = (e: React.MouseEvent, index: number, width: number) => {
    e.preventDefault(); e.stopPropagation();
    setResizingCol({ index, startX: e.clientX, startWidth: width });
  };

  const handleRowResizeStart = (e: React.MouseEvent, index: number, height: number) => {
    e.preventDefault(); e.stopPropagation();
    setResizingRow({ index, startY: e.clientY, startHeight: height });
  };

  useEffect(() => {
    if (!resizingCol && !resizingRow) return;
    const onMove = (e: MouseEvent) => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (resizingCol) {
          const newWidth = Math.max(40, Math.min(800, resizingCol.startWidth + e.clientX - resizingCol.startX));
          setColumnWidth(resizingCol.index, newWidth);
        } else if (resizingRow) {
          const newHeight = Math.max(20, Math.min(400, resizingRow.startHeight + e.clientY - resizingRow.startY));
          setRowHeight(resizingRow.index, newHeight);
        }
      });
    };
    const onUp = () => { setResizingCol(null); setResizingRow(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizingCol, resizingRow, setColumnWidth, setRowHeight]);

  // ── AutoFill drag logic ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isAutoFilling || !selectionBounds || !parentRef.current) return;

    const onMove = (e: MouseEvent) => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (!parentRef.current) return;
        const rect = parentRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top + parentRef.current.scrollTop;
        const rows = rowVirtualizer.getVirtualItems();
        const hovered = rows.find(item =>
          y >= item.start + finalHeaderH && y < item.start + finalHeaderH + item.size
        );
        if (hovered) {
          const targetR = visibleRowIndices[hovered.index];
          setSelectionRange({
            start: selectionRange!.start,
            end: `r_${targetR}_c_${selectionBounds.maxC}`,
          });
        }
      });
    };

    const onUp = () => {
      if (!selectionRange || !selectionBounds) return;
      const endParsed = parseRef(selectionRange.end);
      const updates: Record<string, Partial<CellData>> = {};
      const data = useSheetStore.getState().data;
      const srcRows = selectionBounds.maxR - selectionBounds.minR + 1;

      for (let r = selectionBounds.minR; r <= endParsed.r; r++) {
        for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
          const srcR = selectionBounds.minR + ((r - selectionBounds.minR) % srcRows);
          const srcRef = `r_${srcR}_c_${c}`;
          if (data[srcRef]) updates[`r_${r}_c_${c}`] = { ...data[srcRef] };
        }
      }
      bulkSetCellData(updates);
      setIsAutoFilling(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isAutoFilling, selectionBounds, selectionRange, rowVirtualizer, visibleRowIndices, setSelectionRange, bulkSetCellData, finalHeaderH]);


  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCellSelect = useCallback((ref: string) => {
    setActiveCell(ref);
    setSelectionRange({ start: ref, end: ref });
    const { r, c } = parseRef(ref);
    socketService.emitCursorMove('Me', workbookId, r, c, '#000000');
  }, [setActiveCell, setSelectionRange, workbookId]);

  const handleCellMouseDown = useCallback((ref: string) => {
    setIsSelecting(true);
    setActiveCell(ref);
    setSelectionRange({ start: ref, end: ref });
  }, [setActiveCell, setSelectionRange]);

  const handleCellMouseEnter = useCallback((ref: string) => {
    if (isSelecting && selectionRange) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setSelectionRange({ start: selectionRange.start, end: ref });
      });
    }
  }, [isSelecting, selectionRange, setSelectionRange]);

  const handleAutoFit = useCallback((index: number) => {
    const data = useSheetStore.getState().data;
    let maxWidth = 80;
    Object.entries(data).forEach(([ref, cell]) => {
      const { c } = parseRef(ref);
      if (c === index && cell.v) {
        maxWidth = Math.max(maxWidth, String(cell.v).length * 8 + 32);
      }
    });
    setColumnWidth(index, Math.min(maxWidth, 600));
  }, [setColumnWidth]);

  // ── Context Menu & Navigation ─────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isDashboard) return;
    e.preventDefault();
    const state = useSheetStore.getState();
    const active = state.activeCell;
    if (!active) return;

    const items: MenuItem[] = [
      { label: 'Copy', icon: '📋', shortcut: 'Ctrl+C', onClick: () => {} },
      { label: 'Paste', icon: '📌', shortcut: 'Ctrl+V', onClick: () => {} },
      { divider: true },
      { label: 'Insert Row', icon: '⬆', onClick: () => state.insertRowAbove() },
      { label: 'Insert Col', icon: '➡', onClick: () => state.insertColumnRight() },
      { divider: true },
      { label: 'Clear Cells', icon: '✕', danger: true, onClick: () => state.clearCell(active) },
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [isDashboard]);

  const commitCellChange = useCallback(async (r: number, c: number, value: string) => {
    const ref = `r_${r}_c_${c}`;
    const isFormula = value.startsWith('=');
    const newData = { [isFormula ? 'f' : 'v']: value, ...(!isFormula && { f: undefined }) };
    setCellData(ref, newData);
    socketService.emitCellUpdate(workbookId, ref, newData);

    if (engine) {
      try {
        const result = await engine.setData(r, c, value);
        
        // Handle common formula errors with friendly messages
        if (result && typeof result.v === 'object' && result.v !== null && 'type' in result.v) {
          const errorType = result.v.type;
          const errorMsg = {
            '#DIV/0!': 'Cannot divide by zero',
            '#VALUE!': 'Wrong value type in formula',
            '#REF!': 'Reference not found',
            '#NAME?': 'Unknown function name',
            '#NUM!': 'Numeric problem in formula',
            '#N/A': 'Value not available'
          }[errorType as string] || 'Formula error';
          
          toast(`⚠️ ${errorMsg} at ${getColName(c)}${r + 1}`, 'warning');
        }

        const final = { v: result.v };
        setCellData(ref, final);
        socketService.emitCellUpdate(workbookId, ref, final);
      } catch (err) {
        console.error('Engine error:', err);
        toast('❌ Formula evaluation failed', 'error');
      }
    }
  }, [setCellData, engine, workbookId]);

  const handleCellKeydown = useCallback((e: React.KeyboardEvent, r: number, c: number, ref: string) => {
    e.stopPropagation();
    const state = useSheetStore.getState();
    if (e.key === 'Enter') {
      commitCellChange(r, c, (e.target as HTMLInputElement).value);
      socketService.emitCellLock(ref, 'unlock');
      state.setEditingCell(null);
      if (r < ROWS - 1) handleCellSelect(`r_${r + 1}_c_${c}`);
      parentRef.current?.focus();
    } else if (e.key === 'Escape') {
      socketService.emitCellLock(ref, 'unlock');
      state.setEditingCell(null);
      parentRef.current?.focus();
    }
  }, [commitCellChange, handleCellSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const state = useSheetStore.getState();
    const activeCell = state.activeCell;
    const editingCell = state.editingCell;
    if (!activeCell || editingCell) return;
    const { r, c } = parseRef(activeCell);

    const move = (nr: number, nc: number) => {
      const nextRef = `r_${nr}_c_${nc}`;
      if (e.shiftKey && selectionRange) {
        e.preventDefault();
        setSelectionRange({ start: selectionRange.start, end: nextRef });
        setActiveCell(nextRef);
      } else {
        e.preventDefault();
        handleCellSelect(nextRef);
      }
    };

    switch (e.key) {
      case 'ArrowDown':  if (r < ROWS - 1) move(r + 1, c); break;
      case 'ArrowUp':    if (r > 0)        move(r - 1, c); break;
      case 'ArrowRight': if (c < COLS - 1) move(r, c + 1); break;
      case 'ArrowLeft':  if (c > 0)        move(r, c - 1); break;
      case 'Enter':
        e.preventDefault();
        if (!state.lockedCells[activeCell]) {
          socketService.emitCellLock(activeCell, 'lock');
          state.setEditingCell(activeCell);
        }
        break;
    }
  }, [handleCellSelect, selectionRange, setSelectionRange, setActiveCell]);

  return (
    <div ref={parentRef} className={`flex-1 overflow-auto bg-background outline-none select-none relative scroll-smooth ${isDashboard ? 'cursor-default' : ''}`} tabIndex={0} onKeyDown={handleKeyDown} onContextMenu={handleContextMenu}>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}

      <div style={{ height: `${rowVirtualizer.getTotalSize() + finalHeaderH}px`, width: `${colVirtualizer.getTotalSize() + finalIndexW}px`, position: 'relative', willChange: 'transform' }}>
        
        {/* Selection Highlight Layer (THE SECRET TO ZERO LAG) */}
        {!isDashboard && selectionStyle && (
          <div 
            className="absolute z-10 pointer-events-none border-2 border-accent bg-accent/10 shadow-[0_0_20px_rgba(99,102,241,0.2)] mix-blend-multiply transition-none"
            style={{
              ...selectionStyle,
              willChange: 'top, left, width, height',
              boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.4)'
            }}
          >
            {/* AutoFill Handle */}
            <div 
              className="absolute bottom-[-5px] right-[-5px] w-2.5 h-2.5 bg-accent border-2 border-white rounded-sm cursor-crosshair pointer-events-auto"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsAutoFilling(true); }}
            />
          </div>
        )}

        {!isDashboard && (
          <div className="sticky top-0 left-0 border-b border-r border-border bg-surface z-50 flex items-center justify-center font-bold text-[10px] text-textMuted" style={{ width: finalIndexW, height: finalHeaderH }}>
            <div className="w-2 h-2 rounded-full bg-accent/20" />
          </div>
        )}

        {!isDashboard && colVirtualizer.getVirtualItems().map((virtualCol) => (
          <div key={`header-col-${virtualCol.index}`} className="sticky top-0 absolute flex items-center justify-center border-b border-r border-border bg-surface text-[10px] text-textMuted font-bold hover:bg-surfaceHover transition-none z-40" style={{ left: finalIndexW + virtualCol.start, width: virtualCol.size, height: finalHeaderH, position: 'absolute', top: 0 }}>
            <div className="sticky top-0 w-full h-full flex items-center justify-center bg-inherit">{getColName(virtualCol.index)}</div>
            <div className="absolute right-0 top-0 w-1 h-full cursor-col-resize z-50 group" onMouseDown={(e) => handleColResizeStart(e, virtualCol.index, virtualCol.size)} onDoubleClick={() => handleAutoFit(virtualCol.index)}>
              <div className="absolute right-0 top-0 w-[1px] h-full bg-border group-hover:bg-accent" />
            </div>
          </div>
        ))}

        {!isDashboard && rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowIndex = visibleRowIndices[virtualRow.index];
          return (
            <div key={`header-row-${virtualRow.index}`} className="sticky left-0 absolute flex items-center justify-center border-b border-r border-border bg-surface text-[10px] text-textMuted font-bold hover:bg-surfaceHover transition-none z-30" style={{ top: finalHeaderH + virtualRow.start, left: 0, width: finalIndexW, height: virtualRow.size, position: 'absolute' }}>
              <div className="sticky left-0 w-full h-full flex items-center justify-center bg-inherit">{rowIndex + 1}</div>
              <div className="absolute left-0 bottom-0 w-full h-1 cursor-row-resize z-50 group" onMouseDown={(e) => handleRowResizeStart(e, virtualRow.index, virtualRow.size)}>
                <div className="absolute left-0 bottom-0 w-full h-[1px] bg-border group-hover:bg-accent" />
              </div>
            </div>
          );
        })}

        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const r = visibleRowIndices[virtualRow.index];
          return colVirtualizer.getVirtualItems().map((virtualCol) => {
            const c = virtualCol.index;
            const ref = `r_${r}_c_${c}`;
            return (
              <Cell 
                key={ref} r={r} c={c}
                style={{ top: finalHeaderH + virtualRow.start, left: finalIndexW + virtualCol.start, width: virtualCol.size, height: virtualRow.size }}
                onCellSelect={isDashboard ? () => {} : handleCellSelect} 
                onCommitChange={isDashboard ? () => {} : commitCellChange} 
                onCellKeydown={isDashboard ? () => {} : handleCellKeydown}
                onMouseDown={isDashboard ? undefined : () => handleCellMouseDown(ref)} 
                onMouseEnter={isDashboard ? undefined : () => handleCellMouseEnter(ref)}
              />
            );
          });
        })}

        {/* Remote Cursors Layer */}
        {useMemo(() => {
          return Object.entries(remoteCursors).map(([userId, cursor]) => {
            const user = connectedUsers.find(u => u.userId === userId);
            const color = user?.color || '#6366f1';
            
            const top = rowVirtualizer.getVirtualItems().find(v => visibleRowIndices[v.index] === cursor.row)?.start;
            const left = colVirtualizer.getVirtualItems().find(v => v.index === cursor.col)?.start;
            
            if (top === undefined || left === undefined) return null;

            return (
              <div 
                key={userId}
                className="absolute z-20 pointer-events-none transition-all duration-150 ease-out flex flex-col items-start"
                style={{ top: top + finalHeaderH, left: left + finalIndexW }}
              >
                <div className="border-2 rounded-sm" style={{ borderColor: color, width: colVirtualizer.getVirtualItems().find(v => v.index === cursor.col)?.size, height: rowVirtualizer.getVirtualItems().find(v => visibleRowIndices[v.index] === cursor.row)?.size }} />
                <div className="px-1.5 py-0.5 rounded-br-md rounded-bl-md text-[9px] font-bold text-white whitespace-nowrap shadow-sm" style={{ backgroundColor: color }}>
                  {cursor.userName}
                </div>
              </div>
            );
          });
        }, [remoteCursors, connectedUsers, rowVirtualizer, colVirtualizer, visibleRowIndices, finalHeaderH, finalIndexW])}
      </div>
    </div>
  );
};
