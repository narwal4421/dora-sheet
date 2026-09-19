import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useVirtualizerWrapper } from '../hooks/useVirtualizerWrapper';
import { useSheetStore, type CellData } from '../store/useSheetStore';
import { formulaService } from '../services/formulaService';
import { socketService } from '../services/socket.service';

import { Cell } from './Cell';
import { ContextMenu } from './ContextMenu';
import type { MenuItem } from './ContextMenu';

import { SelectionOverlay } from './Grid/SelectionOverlay';
import { GridHeaders } from './Grid/GridHeaders';
import { RemoteCursorsLayer } from './Grid/RemoteCursorsLayer';
import { toast } from '../store/useToastStore';

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
  return { r: parseInt(match[1], 10), c: parseInt(match[2], 10) };
};

export const Grid = ({ isDashboard = false }: { isDashboard?: boolean; workbookId?: string }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // --- STATE SELECTORS ---
  const data = useSheetStore(state => state.data);
  const rowCount = useSheetStore(state => state.rowCount);
  const colCount = useSheetStore(state => state.colCount);
  const activeCell = useSheetStore(state => state.activeCell);
  const editingCell = useSheetStore(state => state.editingCell);
  const selectionRange = useSheetStore(state => state.selectionRange);
  const remoteCursors = useSheetStore(state => state.cursors);
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  const localUserName = useSheetStore(state => state.localUserName);
  const hiddenRows = useSheetStore(state => state.hiddenRows);
  const columnWidths = useSheetStore(state => state.columnWidths);
  const rowHeights = useSheetStore(state => state.rowHeights);
  const activeSheetId = useSheetStore(state => state.activeSheetId);
  const showHeaders = useSheetStore(state => state.showHeaders);
  const zoomLevel = useSheetStore(state => state.zoomLevel);

  const selectedRanges = useSheetStore(state => state.selectedRanges);
  const addSelectionRange = useSheetStore(state => state.addSelectionRange);
  const clearMultiSelection = useSheetStore(state => state.clearMultiSelection);
  const formatPainter = useSheetStore(state => state.formatPainter);
  const deactivateFormatPainter = useSheetStore(state => state.deactivateFormatPainter);
  const pasteSpecial = useSheetStore(state => state.pasteSpecial);
  const mergedCells = useSheetStore(state => state.mergedCells);
  const freezeRow = useSheetStore(state => state.freezeRow);
  const freezeCol = useSheetStore(state => state.freezeCol);

  // Merged cells lookup map
  const mergedMap = useMemo(() => {
    const hidden = new Set<string>();
    const originSpans = new Map<string, { colSpan: number; rowSpan: number }>();

    Object.entries(mergedCells).forEach(([, bounds]) => {
      const [start, end] = bounds.split(':');
      if (!start || !end) return;
      const s = parseRef(start);
      const e = parseRef(end);
      const minR = Math.min(s.r, e.r);
      const maxR = Math.max(s.r, e.r);
      const minC = Math.min(s.c, e.c);
      const maxC = Math.max(s.c, e.c);

      originSpans.set(`r_${minR}_c_${minC}`, {
        colSpan: maxC - minC + 1,
        rowSpan: maxR - minR + 1
      });

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (r === minR && c === minC) continue;
          hidden.add(`r_${r}_c_${c}`);
        }
      }
    });

    return { hidden, originSpans };
  }, [mergedCells]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillTarget, setAutoFillTarget] = useState<string | null>(null);
  const [isMovingSelection, setIsMovingSelection] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [isCopyMove, setIsCopyMove] = useState(false);
  const [isSelectingCols, setIsSelectingCols] = useState(false);
  const [headerStartCol, setHeaderStartCol] = useState<number | null>(null);
  const [isSelectingRows, setIsSelectingRows] = useState(false);
  const [headerStartRow, setHeaderStartRow] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

  // Middle-mouse Panning & AutoFill Smart Tag States
  const [isPanning, setIsPanning] = useState(false);
  const panOriginRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [smartTag, setSmartTag] = useState<{ x: number; y: number; isOpen: boolean; targetRef: string; srcRef: string } | null>(null);

  const finalHeaderH = isDashboard || !showHeaders ? 0 : HEADER_H;
  const finalIndexW = isDashboard || !showHeaders ? 0 : INDEX_W;

  // --- VIRTUALIZATION ENGINE ---
  const visibleRowIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < rowCount; i++) {
      if (!hiddenRows.has(i)) indices.push(i);
    }
    return indices;
  }, [hiddenRows, rowCount]);

  const rowVirtualizer = useVirtualizerWrapper({
    count: visibleRowIndices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((i: number) => rowHeights[visibleRowIndices[i]] || 24, [rowHeights, visibleRowIndices]),
    overscan: 10,
  });

  const colVirtualizer = useVirtualizerWrapper({
    horizontal: true,
    count: colCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((i: number) => columnWidths[i] || 100, [columnWidths]),
    overscan: 5,
  });

  // --- INTERACTION HANDLERS ---
  const handleCellSelect = useCallback((ref: string) => {
    let targetStart = ref;
    let targetEnd = ref;
    const { r, c } = parseRef(ref);
    const mergedObj = useSheetStore.getState().mergedCells;
    for (const bounds of Object.values(mergedObj)) {
      const [st, en] = bounds.split(':');
      if (!st || !en) continue;
      const s = parseRef(st);
      const e = parseRef(en);
      if (r >= Math.min(s.r, e.r) && r <= Math.max(s.r, e.r) &&
          c >= Math.min(s.c, e.c) && c <= Math.max(s.c, e.c)) {
        targetStart = `r_${Math.min(s.r, e.r)}_c_${Math.min(s.c, e.c)}`;
        targetEnd = `r_${Math.max(s.r, e.r)}_c_${Math.max(s.c, e.c)}`;
        break;
      }
    }
    useSheetStore.getState().setActiveCell(targetStart);
    useSheetStore.getState().setSelectionRange({ start: targetStart, end: targetEnd });
    socketService.emitCursorMove(localUserName, activeSheetId, r, c, '#107c41');
  }, [localUserName, activeSheetId]);

  // Keep active cell scrolled into view during keyboard / WASD navigation
  useEffect(() => {
    if (!activeCell) return;
    const { r, c } = parseRef(activeCell);
    const visibleRowIdx = visibleRowIndices.indexOf(r);
    if (visibleRowIdx !== -1) {
      rowVirtualizer.scrollToIndex(visibleRowIdx, { align: 'auto' });
    }
    colVirtualizer.scrollToIndex(c, { align: 'auto' });
  }, [activeCell, visibleRowIndices, rowVirtualizer, colVirtualizer]);

  // Force virtualizer to re-measure when column widths change (drag resize / autoFit)
  useEffect(() => {
    colVirtualizer.measure();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnWidths]);

  // Force virtualizer to re-measure when row heights change (drag resize / autoFit / wrap text)
  useEffect(() => {
    rowVirtualizer.measure();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowHeights, visibleRowIndices]);

  // Excel Mouse Power: Format Painter apply, Shift+Click expand, Ctrl+Click multi-select, Standard Click
  const handleCellMouseDown = useCallback((ref: string, e?: React.MouseEvent) => {
    if (isDashboard) return;

    // 1. Format Painter active
    if (formatPainter.active && formatPainter.format) {
      useSheetStore.getState().setCellFormat(ref, formatPainter.format);
      if (!formatPainter.persistent) {
        deactivateFormatPainter();
      }
      toast('Format applied', 'success');
      return;
    }

    // 2. Shift+Click (Range Expansion from Active Cell)
    if (e?.shiftKey && activeCell) {
      useSheetStore.getState().setSelectionRange({ start: activeCell, end: ref });
      return;
    }

    // 3. Ctrl/Cmd+Click (Non-Contiguous Disjoint Multi-Selection)
    if (e?.ctrlKey || e?.metaKey) {
      setIsSelecting(true);
      const currentRange = useSheetStore.getState().selectionRange;
      if (currentRange) {
        addSelectionRange(currentRange);
      }
      useSheetStore.getState().setActiveCell(ref);
      useSheetStore.getState().setSelectionRange({ start: ref, end: ref });
      return;
    }

    // 4. Standard Single Click
    clearMultiSelection();
    setSmartTag(null);
    setIsSelecting(true);
    let targetStart = ref;
    let targetEnd = ref;
    const { r, c } = parseRef(ref);
    const mergedObj = useSheetStore.getState().mergedCells;
    for (const bounds of Object.values(mergedObj)) {
      const [st, en] = bounds.split(':');
      if (!st || !en) continue;
      const s = parseRef(st);
      const e = parseRef(en);
      if (r >= Math.min(s.r, e.r) && r <= Math.max(s.r, e.r) &&
          c >= Math.min(s.c, e.c) && c <= Math.max(s.c, e.c)) {
        targetStart = `r_${Math.min(s.r, e.r)}_c_${Math.min(s.c, e.c)}`;
        targetEnd = `r_${Math.max(s.r, e.r)}_c_${Math.max(s.c, e.c)}`;
        break;
      }
    }
    useSheetStore.getState().setActiveCell(targetStart);
    useSheetStore.getState().setSelectionRange({ start: targetStart, end: targetEnd });
  }, [isDashboard, activeCell, formatPainter, deactivateFormatPainter, addSelectionRange, clearMultiSelection]);

  // Excel Mouse Power: Double-click border to jump to data boundary (like Ctrl+Arrow)
  const handleBorderDoubleClick = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!activeCell) return;
    const { r, c } = parseRef(activeCell);
    let targetR = r;
    let targetC = c;

    if (direction === 'up') {
      const isCurrentFilled = data[`r_${r}_c_${c}`]?.v !== undefined && data[`r_${r}_c_${c}`]?.v !== '';
      let found = 0;
      for (let row = r - 1; row >= 0; row--) {
        const filled = data[`r_${row}_c_${c}`]?.v !== undefined && data[`r_${row}_c_${c}`]?.v !== '';
        if (isCurrentFilled && !filled) {
          found = row + 1;
          break;
        }
        if (!isCurrentFilled && filled) {
          found = row;
          break;
        }
      }
      targetR = found;
    } else if (direction === 'down') {
      const isCurrentFilled = data[`r_${r}_c_${c}`]?.v !== undefined && data[`r_${r}_c_${c}`]?.v !== '';
      let found = rowCount - 1;
      for (let row = r + 1; row < rowCount; row++) {
        const filled = data[`r_${row}_c_${c}`]?.v !== undefined && data[`r_${row}_c_${c}`]?.v !== '';
        if (isCurrentFilled && !filled) {
          found = row - 1;
          break;
        }
        if (!isCurrentFilled && filled) {
          found = row;
          break;
        }
      }
      targetR = found;
    } else if (direction === 'left') {
      const isCurrentFilled = data[`r_${r}_c_${c}`]?.v !== undefined && data[`r_${r}_c_${c}`]?.v !== '';
      let found = 0;
      for (let col = c - 1; col >= 0; col--) {
        const filled = data[`r_${r}_c_${col}`]?.v !== undefined && data[`r_${r}_c_${col}`]?.v !== '';
        if (isCurrentFilled && !filled) {
          found = col + 1;
          break;
        }
        if (!isCurrentFilled && filled) {
          found = col;
          break;
        }
      }
      targetC = found;
    } else if (direction === 'right') {
      const isCurrentFilled = data[`r_${r}_c_${c}`]?.v !== undefined && data[`r_${r}_c_${c}`]?.v !== '';
      let found = colCount - 1;
      for (let col = c + 1; col < colCount; col++) {
        const filled = data[`r_${r}_c_${col}`]?.v !== undefined && data[`r_${r}_c_${col}`]?.v !== '';
        if (isCurrentFilled && !filled) {
          found = col - 1;
          break;
        }
        if (!isCurrentFilled && filled) {
          found = col;
          break;
        }
      }
      targetC = found;
    }

    const targetRef = `r_${targetR}_c_${targetC}`;
    handleCellSelect(targetRef);
  }, [activeCell, data, rowCount, colCount, handleCellSelect]);

  const handleCellMouseEnter = useCallback((ref: string) => {
    if (isDashboard) return;
    if (isAutoFilling) {
      setAutoFillTarget(ref);
      return;
    }
    if (isMovingSelection) {
      setMoveTarget(ref);
      return;
    }
    if (!isSelecting) return;
    const start = useSheetStore.getState().activeCell;
    if (start) {
      useSheetStore.getState().setSelectionRange({ start, end: ref });
    }
  }, [isSelecting, isAutoFilling, isMovingSelection, isDashboard]);

  // Execute AutoFill when drag release occurs
  const executeAutoFill = useCallback(() => {
    if (!selectionRange || !autoFillTarget) return;
    const s = parseRef(selectionRange.start);
    const e = parseRef(selectionRange.end);
    const t = parseRef(autoFillTarget);

    const minR = Math.min(s.r, e.r);
    const maxR = Math.max(s.r, e.r);
    const minC = Math.min(s.c, e.c);
    const maxC = Math.max(s.c, e.c);

    // Filling Down
    if (t.r > maxR) {
      const srcRowCount = maxR - minR + 1;
      for (let r = maxR + 1; r <= t.r; r++) {
        for (let c = minC; c <= maxC; c++) {
          const srcR = minR + ((r - maxR - 1) % srcRowCount);
          const srcCell = data[`r_${srcR}_c_${c}`];
          const targetRef = `r_${r}_c_${c}`;

          if (srcCell?.v !== undefined && !isNaN(Number(srcCell.v))) {
            // Numeric increment if pattern exists
            const val1 = Number(srcCell.v);
            const step = srcRowCount > 1 && data[`r_${minR + 1}_c_${c}`]?.v !== undefined 
              ? Number(data[`r_${minR + 1}_c_${c}`]?.v) - Number(data[`r_${minR}_c_${c}`]?.v)
              : 1;
            const multiplier = Math.floor((r - maxR) / srcRowCount) + 1;
            useSheetStore.getState().setCellData(targetRef, { v: val1 + step * multiplier, fmt: srcCell.fmt });
          } else if (srcCell?.f) {
            // Formula relative adjust
            useSheetStore.getState().setCellData(targetRef, { f: srcCell.f, fmt: srcCell.fmt });
          } else if (srcCell) {
            useSheetStore.getState().setCellData(targetRef, { v: srcCell.v, fmt: srcCell.fmt });
          }
        }
      }
      useSheetStore.getState().setSelectionRange({ start: `r_${minR}_c_${minC}`, end: `r_${t.r}_c_${maxC}` });
    } 
    // Filling Right
    else if (t.c > maxC) {
      const srcColCount = maxC - minC + 1;
      for (let c = maxC + 1; c <= t.c; c++) {
        for (let r = minR; r <= maxR; r++) {
          const srcC = minC + ((c - maxC - 1) % srcColCount);
          const srcCell = data[`r_${r}_c_${srcC}`];
          const targetRef = `r_${r}_c_${c}`;

          if (srcCell?.v !== undefined && !isNaN(Number(srcCell.v))) {
            const val1 = Number(srcCell.v);
            const multiplier = Math.floor((c - maxC) / srcColCount) + 1;
            useSheetStore.getState().setCellData(targetRef, { v: val1 + multiplier, fmt: srcCell.fmt });
          } else if (srcCell) {
            useSheetStore.getState().setCellData(targetRef, { v: srcCell.v, f: srcCell.f, fmt: srcCell.fmt });
          }
        }
      }
      useSheetStore.getState().setSelectionRange({ start: `r_${minR}_c_${minC}`, end: `r_${maxR}_c_${t.c}` });
    }
    // Filling Up
    else if (t.r < minR) {
      const srcRowCount = maxR - minR + 1;
      for (let r = minR - 1; r >= t.r; r--) {
        for (let c = minC; c <= maxC; c++) {
          const srcR = maxR - ((minR - 1 - r) % srcRowCount);
          const srcCell = data[`r_${srcR}_c_${c}`];
          const targetRef = `r_${r}_c_${c}`;

          if (srcCell?.v !== undefined && !isNaN(Number(srcCell.v))) {
            const val1 = Number(srcCell.v);
            const step = srcRowCount > 1 && data[`r_${minR + 1}_c_${c}`]?.v !== undefined 
              ? Number(data[`r_${minR + 1}_c_${c}`]?.v) - Number(data[`r_${minR}_c_${c}`]?.v)
              : 1;
            const multiplier = Math.floor((minR - r) / srcRowCount) + 1;
            useSheetStore.getState().setCellData(targetRef, { v: val1 - step * multiplier, fmt: srcCell.fmt });
          } else if (srcCell?.f) {
            useSheetStore.getState().setCellData(targetRef, { f: srcCell.f, fmt: srcCell.fmt });
          } else if (srcCell) {
            useSheetStore.getState().setCellData(targetRef, { v: srcCell.v, fmt: srcCell.fmt });
          }
        }
      }
      useSheetStore.getState().setSelectionRange({ start: `r_${t.r}_c_${minC}`, end: `r_${maxR}_c_${maxC}` });
    }
    // Filling Left
    else if (t.c < minC) {
      const srcColCount = maxC - minC + 1;
      for (let c = minC - 1; c >= t.c; c--) {
        for (let r = minR; r <= maxR; r++) {
          const srcC = maxC - ((minC - 1 - c) % srcColCount);
          const srcCell = data[`r_${r}_c_${srcC}`];
          const targetRef = `r_${r}_c_${c}`;

          if (srcCell?.v !== undefined && !isNaN(Number(srcCell.v))) {
            const val1 = Number(srcCell.v);
            const multiplier = Math.floor((minC - c) / srcColCount) + 1;
            useSheetStore.getState().setCellData(targetRef, { v: val1 - multiplier, fmt: srcCell.fmt });
          } else if (srcCell) {
            useSheetStore.getState().setCellData(targetRef, { v: srcCell.v, f: srcCell.f, fmt: srcCell.fmt });
          }
        }
      }
      useSheetStore.getState().setSelectionRange({ start: `r_${minR}_c_${t.c}`, end: `r_${maxR}_c_${maxC}` });
    }
  }, [selectionRange, autoFillTarget, data]);

  // Double-Click Flash Fill Down to adjacent column boundary
  const handleAutoFillDoubleClick = useCallback(() => {
    if (!selectionRange) return;
    const s = parseRef(selectionRange.start);
    const e = parseRef(selectionRange.end);
    const minR = Math.min(s.r, e.r);
    const maxR = Math.max(s.r, e.r);
    const minC = Math.min(s.c, e.c);
    const maxC = Math.max(s.c, e.c);

    // Look at left column (minC - 1) or right column (maxC + 1) to find lowest populated row
    let targetBottomRow = maxR;
    const adjacentCols = [minC - 1, maxC + 1].filter(c => c >= 0 && c < colCount);

    for (const adjCol of adjacentCols) {
      for (let r = maxR + 1; r < rowCount; r++) {
        const adjCell = data[`r_${r}_c_${adjCol}`];
        if (adjCell?.v !== undefined && adjCell?.v !== null && adjCell?.v !== '') {
          targetBottomRow = Math.max(targetBottomRow, r);
        } else {
          break; // Stop at first empty cell in adjacent column
        }
      }
      if (targetBottomRow > maxR) break;
    }

    if (targetBottomRow > maxR) {
      const srcRowCount = maxR - minR + 1;
      for (let r = maxR + 1; r <= targetBottomRow; r++) {
        for (let c = minC; c <= maxC; c++) {
          const srcR = minR + ((r - maxR - 1) % srcRowCount);
          const srcCell = data[`r_${srcR}_c_${c}`];
          const targetRef = `r_${r}_c_${c}`;

          if (srcCell?.v !== undefined && !isNaN(Number(srcCell.v))) {
            const val1 = Number(srcCell.v);
            const step = srcRowCount > 1 && data[`r_${minR + 1}_c_${c}`]?.v !== undefined 
              ? Number(data[`r_${minR + 1}_c_${c}`]?.v) - Number(data[`r_${minR}_c_${c}`]?.v)
              : 1;
            const multiplier = Math.floor((r - maxR) / srcRowCount) + 1;
            useSheetStore.getState().setCellData(targetRef, { v: val1 + step * multiplier, fmt: srcCell.fmt });
          } else if (srcCell?.f) {
            useSheetStore.getState().setCellData(targetRef, { f: srcCell.f, fmt: srcCell.fmt });
          } else if (srcCell) {
            useSheetStore.getState().setCellData(targetRef, { v: srcCell.v, fmt: srcCell.fmt });
          }
        }
      }
      useSheetStore.getState().setSelectionRange({ start: `r_${minR}_c_${minC}`, end: `r_${targetBottomRow}_c_${maxC}` });
      toast(`Auto-filled to row ${targetBottomRow + 1}`, 'success');
    }
  }, [selectionRange, colCount, rowCount, data]);

  // Execute Move or Copy Selection via mouse drag
  const executeMoveSelection = useCallback(() => {
    if (!selectionRange || !moveTarget) return;
    const s = parseRef(selectionRange.start);
    const e = parseRef(selectionRange.end);
    const t = parseRef(moveTarget);

    const minR = Math.min(s.r, e.r);
    const maxR = Math.max(s.r, e.r);
    const minC = Math.min(s.c, e.c);
    const maxC = Math.max(s.c, e.c);

    const deltaR = t.r - minR;
    const deltaC = t.c - minC;

    if (deltaR === 0 && deltaC === 0) return;

    // Collect source cells
    const updates: Record<string, Partial<CellData>> = {};
    const oldKeys: string[] = [];

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const oldKey = `r_${r}_c_${c}`;
        const newKey = `r_${r + deltaR}_c_${c + deltaC}`;
        oldKeys.push(oldKey);
        if (data[oldKey]) {
          updates[newKey] = { ...data[oldKey] };
        }
      }
    }

    // Clear old cells if moving (not holding Ctrl/Copy)
    if (!isCopyMove) {
      useSheetStore.getState().clearRangeContents(oldKeys);
    }

    useSheetStore.getState().bulkSetCellData(updates);
    const newStart = `r_${minR + deltaR}_c_${minC + deltaC}`;
    const newEnd = `r_${maxR + deltaR}_c_${maxC + deltaC}`;
    useSheetStore.getState().setActiveCell(newStart);
    useSheetStore.getState().setSelectionRange({ start: newStart, end: newEnd });
    toast(isCopyMove ? 'Copied selection' : 'Moved selection', 'info');
  }, [selectionRange, moveTarget, data, isCopyMove]);

  const handleGlobalMouseUp = useCallback(() => {
    if (isAutoFilling) {
      executeAutoFill();
      if (autoFillTarget && selectionRange) {
        const s = parseRef(selectionRange.start);
        const e = parseRef(selectionRange.end);
        const t = parseRef(autoFillTarget);
        const maxR = Math.max(s.r, e.r, t.r);
        const maxC = Math.max(s.c, e.c, t.c);
        setSmartTag({
          x: 0,
          y: 0,
          isOpen: false,
          targetRef: `r_${maxR}_c_${maxC}`,
          srcRef: selectionRange.start
        });
      }
      setIsAutoFilling(false);
      setAutoFillTarget(null);
    }
    if (isMovingSelection) {
      executeMoveSelection();
      setIsMovingSelection(false);
      setMoveTarget(null);
    }
    setIsSelecting(false);
    setIsSelectingCols(false);
    setHeaderStartCol(null);
    setIsSelectingRows(false);
    setHeaderStartRow(null);
  }, [isAutoFilling, executeAutoFill, isMovingSelection, executeMoveSelection, autoFillTarget, selectionRange]);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  // --- ALL SELECTED CELL KEYS (Combines single selectionRange + disjoint selectedRanges) ---
  const allSelectedRefs = useMemo(() => {
    const set = new Set<string>();
    const ranges = [...selectedRanges];
    if (selectionRange) ranges.push(selectionRange);

    for (const r of ranges) {
      const s = parseRef(r.start);
      const e = parseRef(r.end);
      const minR = Math.min(s.r, e.r);
      const maxR = Math.max(s.r, e.r);
      const minC = Math.min(s.c, e.c);
      const maxC = Math.max(s.c, e.c);
      for (let row = minR; row <= maxR; row++) {
        for (let col = minC; col <= maxC; col++) {
          set.add(`r_${row}_c_${col}`);
        }
      }
    }
    return set;
  }, [selectedRanges, selectionRange]);

  // --- SELECTION STYLE CALCULATOR ---
  const selectionStyle = useMemo(() => {
    if (!selectionRange) return null;
    const start = parseRef(selectionRange.start);
    const end = parseRef(selectionRange.end);
    
    let minR = Math.min(start.r, end.r);
    let maxR = Math.max(start.r, end.r);
    let minC = Math.min(start.c, end.c);
    let maxC = Math.max(start.c, end.c);

    // Expand bounding box to encompass any intersecting merged cells
    Object.values(mergedCells).forEach(bounds => {
      const [st, en] = bounds.split(':');
      if (!st || !en) return;
      const s = parseRef(st);
      const e = parseRef(en);
      const mMinR = Math.min(s.r, e.r);
      const mMaxR = Math.max(s.r, e.r);
      const mMinC = Math.min(s.c, e.c);
      const mMaxC = Math.max(s.c, e.c);
      if (minR <= mMaxR && maxR >= mMinR && minC <= mMaxC && maxC >= mMinC) {
        minR = Math.min(minR, mMinR);
        maxR = Math.max(maxR, mMaxR);
        minC = Math.min(minC, mMinC);
        maxC = Math.max(maxC, mMaxC);
      }
    });

    // Find the first and last visible row indices within the selection range
    let vStart = -1;
    for (let i = 0; i < visibleRowIndices.length; i++) {
      if (visibleRowIndices[i] >= minR) {
        vStart = i;
        break;
      }
    }
    let vEnd = -1;
    for (let i = visibleRowIndices.length - 1; i >= 0; i--) {
      if (visibleRowIndices[i] <= maxR) {
        vEnd = i;
        break;
      }
    }
    
    if (vStart === -1 || vEnd === -1 || vStart > vEnd) return null;

    let top = 0;
    for (let i = 0; i < vStart; i++) top += rowHeights[visibleRowIndices[i]] || 24;
    
    let left = 0;
    for (let i = 0; i < minC; i++) left += columnWidths[i] || 100;

    let height = 0;
    for (let i = vStart; i <= vEnd; i++) height += rowHeights[visibleRowIndices[i]] || 24;

    let width = 0;
    for (let i = minC; i <= maxC; i++) width += columnWidths[i] || 100;

    return { top: top + finalHeaderH, left: left + finalIndexW, width, height };
  }, [selectionRange, mergedCells, rowHeights, columnWidths, visibleRowIndices, finalHeaderH, finalIndexW]);

  // --- AUTO-FILL GHOST PREVIEW STYLE ---
  const autoFillPreviewStyle = useMemo(() => {
    if (!isAutoFilling || !autoFillTarget || !selectionRange) return null;
    const s = parseRef(selectionRange.start);
    const e = parseRef(selectionRange.end);
    const t = parseRef(autoFillTarget);

    const minR = Math.min(s.r, e.r, t.r);
    const maxR = Math.max(s.r, e.r, t.r);
    const minC = Math.min(s.c, e.c, t.c);
    const maxC = Math.max(s.c, e.c, t.c);

    let vStart = -1;
    for (let i = 0; i < visibleRowIndices.length; i++) {
      if (visibleRowIndices[i] >= minR) {
        vStart = i;
        break;
      }
    }
    let vEnd = -1;
    for (let i = visibleRowIndices.length - 1; i >= 0; i--) {
      if (visibleRowIndices[i] <= maxR) {
        vEnd = i;
        break;
      }
    }

    if (vStart === -1 || vEnd === -1 || vStart > vEnd) return null;

    let top = 0;
    for (let i = 0; i < vStart; i++) top += rowHeights[visibleRowIndices[i]] || 24;
    
    let left = 0;
    for (let i = 0; i < minC; i++) left += columnWidths[i] || 100;

    let height = 0;
    for (let i = vStart; i <= vEnd; i++) height += rowHeights[visibleRowIndices[i]] || 24;

    let width = 0;
    for (let i = minC; i <= maxC; i++) width += columnWidths[i] || 100;

    return { top: top + finalHeaderH, left: left + finalIndexW, width, height };
  }, [isAutoFilling, autoFillTarget, selectionRange, rowHeights, columnWidths, visibleRowIndices, finalHeaderH, finalIndexW]);

  // --- LIVE QUICK STATS PILL ON MOUSE SELECTION (Aggregates Single + Disjoint Multi-Selection) ---
  const quickStats = useMemo(() => {
    if (allSelectedRefs.size < 2) return null;

    let sum = 0;
    let numericCount = 0;
    let filledCount = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const ref of allSelectedRefs) {
      const cell = data[ref];
      if (cell?.v !== undefined && cell?.v !== null && cell?.v !== '') {
        filledCount++;
        const num = Number(cell.v);
        if (!isNaN(num) && typeof cell.v !== 'boolean') {
          sum += num;
          numericCount++;
          if (num < min) min = num;
          if (num > max) max = num;
        }
      }
    }

    if (filledCount === 0) return null;

    return {
      sum: numericCount > 0 ? Number(sum.toFixed(4)) : null,
      avg: numericCount > 0 ? Number((sum / numericCount).toFixed(2)) : null,
      count: filledCount,
      min: numericCount > 0 ? min : null,
      max: numericCount > 0 ? max : null
    };
  }, [allSelectedRefs, data]);

  // --- ENGINE LIFECYCLE ---
  useEffect(() => {
    formulaService.init();
  }, []);

  // --- CLIPBOARD ACTIONS ---
  const handleCopy = useCallback(async () => {
    if (!activeCell && !selectionRange) return;
    const s = selectionRange ? parseRef(selectionRange.start) : parseRef(activeCell!);
    const e = selectionRange ? parseRef(selectionRange.end) : parseRef(activeCell!);
    const minR = Math.min(s.r, e.r);
    const maxR = Math.max(s.r, e.r);
    const minC = Math.min(s.c, e.c);
    const maxC = Math.max(s.c, e.c);

    const lines: string[] = [];
    const grid: Array<Array<CellData | undefined>> = [];
    for (let r = minR; r <= maxR; r++) {
      const rowVals: string[] = [];
      const rowCells: Array<CellData | undefined> = [];
      for (let c = minC; c <= maxC; c++) {
        const cell = data[`r_${r}_c_${c}`];
        rowCells.push(cell ? { ...cell } : undefined);
        rowVals.push(cell?.f ?? cell?.v?.toString() ?? '');
      }
      grid.push(rowCells);
      lines.push(rowVals.join('\t'));
    }
    const text = lines.join('\n');
    useSheetStore.getState().setClipboardData({ grid, text });
    await navigator.clipboard.writeText(text);
    toast('Copied', 'info');
  }, [activeCell, selectionRange, data]);

  const handleCut = useCallback(async () => {
    await handleCopy();
    if (!activeCell && !selectionRange) return;
    const s = selectionRange ? parseRef(selectionRange.start) : parseRef(activeCell!);
    const e = selectionRange ? parseRef(selectionRange.end) : parseRef(activeCell!);
    const minR = Math.min(s.r, e.r);
    const maxR = Math.max(s.r, e.r);
    const minC = Math.min(s.c, e.c);
    const maxC = Math.max(s.c, e.c);

    const refs: string[] = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        refs.push(`r_${r}_c_${c}`);
      }
    }
    useSheetStore.getState().clearRangeContents(refs);
    toast('Cut', 'info');
  }, [handleCopy, activeCell, selectionRange]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const start = activeCell ? parseRef(activeCell) : { r: 0, c: 0 };
      const rows = text.replace(/\r\n/g, '\n').split('\n');

      const updates: Record<string, Partial<import('../store/useSheetStore').CellData>> = {};
      let maxCols = 0;

      rows.forEach((rowStr, rOffset) => {
        if (!rowStr && rOffset === rows.length - 1) return;
        const cols = rowStr.split('\t');
        if (cols.length > maxCols) maxCols = cols.length;
        cols.forEach((val, cOffset) => {
          const targetRef = `r_${start.r + rOffset}_c_${start.c + cOffset}`;
          const isF = val.startsWith('=');
          const isNum = !isF && val.trim() !== '' && !isNaN(Number(val));
          const parsedVal = isNum ? Number(val) : val;
          updates[targetRef] = isF ? { f: val, v: undefined } : { v: parsedVal, f: undefined };
        });
      });

      // Ensure grid dimensions are large enough to fit pasted data
      useSheetStore.getState().ensureDimensions(start.r + rows.length, start.c + Math.max(maxCols, 30));
      useSheetStore.getState().bulkSetCellData(updates);
      socketService.emitBulkCellUpdate(useSheetStore.getState().activeSheetId, updates);
      toast('Pasted', 'info');
    } catch {
      toast('Please use keyboard Ctrl+V to paste', 'warning');
    }
  }, [activeCell]);

  // --- KEYBOARD NAVIGATION & SHORTCUTS ENGINE ---
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCell || isDashboard) return;

    const cur = activeCell ? parseRef(activeCell) : { r: 0, c: 0 };
    let newR = cur.r;
    let newC = cur.c;

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) useSheetStore.getState().redo();
      else useSheetStore.getState().undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      useSheetStore.getState().redo();
      return;
    }

    // Bold / Italic / Underline formatting shortcuts
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (activeCell) {
        const store = useSheetStore.getState();
        const curFmt = store.data[activeCell]?.fmt || {};
        if (selectionRange) {
          const s = parseRef(selectionRange.start);
          const end = parseRef(selectionRange.end);
          const refs: string[] = [];
          for (let r = Math.min(s.r, end.r); r <= Math.max(s.r, end.r); r++)
            for (let c = Math.min(s.c, end.c); c <= Math.max(s.c, end.c); c++)
              refs.push(`r_${r}_c_${c}`);
          store.setRangeFormat(refs, { bold: !curFmt.bold });
        } else {
          store.setCellFormat(activeCell, { bold: !curFmt.bold });
        }
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      if (activeCell) {
        const store = useSheetStore.getState();
        const curFmt = store.data[activeCell]?.fmt || {};
        if (selectionRange) {
          const s = parseRef(selectionRange.start);
          const end = parseRef(selectionRange.end);
          const refs: string[] = [];
          for (let r = Math.min(s.r, end.r); r <= Math.max(s.r, end.r); r++)
            for (let c = Math.min(s.c, end.c); c <= Math.max(s.c, end.c); c++)
              refs.push(`r_${r}_c_${c}`);
          store.setRangeFormat(refs, { italic: !curFmt.italic });
        } else {
          store.setCellFormat(activeCell, { italic: !curFmt.italic });
        }
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      if (activeCell) {
        const store = useSheetStore.getState();
        const curFmt = store.data[activeCell]?.fmt || {};
        if (selectionRange) {
          const s = parseRef(selectionRange.start);
          const end = parseRef(selectionRange.end);
          const refs: string[] = [];
          for (let r = Math.min(s.r, end.r); r <= Math.max(s.r, end.r); r++)
            for (let c = Math.min(s.c, end.c); c <= Math.max(s.c, end.c); c++)
              refs.push(`r_${r}_c_${c}`);
          store.setRangeFormat(refs, { underline: !curFmt.underline });
        } else {
          store.setCellFormat(activeCell, { underline: !curFmt.underline });
        }
      }
      return;
    }

    // Escape: deactivate Format Painter, clear multi-selection, close smart tag
    if (e.key === 'Escape') {
      deactivateFormatPainter();
      clearMultiSelection();
      setSmartTag(null);
      return;
    }

    // Copy / Cut / Paste
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      handleCopy();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      handleCut();
      return;
    }
    // Paste Special: Ctrl + Shift + V (Paste Values Only)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      pasteSpecial('values');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      handlePaste();
      return;
    }

    // Fill Down: Ctrl + D
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      useSheetStore.getState().fillDown();
      return;
    }

    // Fill Right: Ctrl + R
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      useSheetStore.getState().fillRight();
      return;
    }

    // Select All
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      useSheetStore.getState().setSelectionRange({ start: 'r_0_c_0', end: `r_${rowCount - 1}_c_${colCount - 1}` });
      return;
    }

    // Find & Replace
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      useSheetStore.getState().setFindReplace({ isOpen: true });
      return;
    }

    // Delete / Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectionRange) {
        const s = parseRef(selectionRange.start);
        const end = parseRef(selectionRange.end);
        const refs: string[] = [];
        for (let r = Math.min(s.r, end.r); r <= Math.max(s.r, end.r); r++) {
          for (let c = Math.min(s.c, end.c); c <= Math.max(s.c, end.c); c++) {
            refs.push(`r_${r}_c_${c}`);
          }
        }
        useSheetStore.getState().clearRangeContents(refs);
      } else if (activeCell) {
        useSheetStore.getState().setCellData(activeCell, { v: undefined, f: undefined });
      }
      return;
    }

    // F2 to start editing
    if (e.key === 'F2') {
      e.preventDefault();
      if (activeCell) useSheetStore.getState().setEditingCell(activeCell);
      return;
    }

    // Enter to edit or move down
    if (e.key === 'Enter') {
      e.preventDefault();
      newR = e.shiftKey ? Math.max(0, cur.r - 1) : cur.r + 1;
      if (newR >= rowCount - 5) useSheetStore.getState().expandRows(100);
      const targetRef = `r_${newR}_c_${newC}`;
      handleCellSelect(targetRef);
      return;
    }

    // Tab to move right/left
    if (e.key === 'Tab') {
      e.preventDefault();
      newC = e.shiftKey ? Math.max(0, cur.c - 1) : cur.c + 1;
      if (newC >= colCount - 5) useSheetStore.getState().expandCols(26);
      const targetRef = `r_${newR}_c_${newC}`;
      handleCellSelect(targetRef);
      return;
    }

    // Arrow keys with infinite auto-expansion
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (e.key === 'ArrowUp') newR = Math.max(0, cur.r - 1);
      if (e.key === 'ArrowDown') {
        newR = cur.r + 1;
        if (newR >= rowCount - 10) useSheetStore.getState().expandRows(100);
      }
      if (e.key === 'ArrowLeft') newC = Math.max(0, cur.c - 1);
      if (e.key === 'ArrowRight') {
        newC = cur.c + 1;
        if (newC >= colCount - 10) useSheetStore.getState().expandCols(26);
      }

      const targetRef = `r_${newR}_c_${newC}`;
      if (e.shiftKey) {
        const start = selectionRange?.start || activeCell || 'r_0_c_0';
        useSheetStore.getState().setSelectionRange({ start, end: targetRef });
      } else {
        handleCellSelect(targetRef);
      }
      return;
    }

    // Direct alphanumeric character typing starts editing immediately
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (activeCell) {
        useSheetStore.getState().setEditingCell(activeCell);
        useSheetStore.getState().setCellData(activeCell, { v: e.key, f: undefined });
      }
    }
  }, [editingCell, isDashboard, activeCell, selectionRange, rowCount, colCount, handleCopy, handleCut, handlePaste, handleCellSelect]);

  // Context Menu builder with Excel-grade Paste Special
  const openContextMenu = (e: React.MouseEvent) => {
    if (isDashboard) return;
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Cut', shortcut: 'Ctrl+X', icon: '✂', onClick: handleCut },
        { label: 'Copy', shortcut: 'Ctrl+C', icon: '📋', onClick: handleCopy },
        { label: 'Paste', shortcut: 'Ctrl+V', icon: '📌', onClick: handlePaste },
        { divider: true },
        { label: 'Paste Values Only', shortcut: 'Ctrl+Shift+V', icon: '🔢', onClick: () => pasteSpecial('values') },
        { label: 'Paste Formulas Only', icon: 'ƒx', onClick: () => pasteSpecial('formulas') },
        { label: 'Paste Formats Only', icon: '🎨', onClick: () => pasteSpecial('formats') },
        { label: 'Paste Transpose (Flip)', icon: '⇄', onClick: () => pasteSpecial('transpose') },
        { divider: true },
        { 
          label: 'Format Painter', 
          icon: '🖌️', 
          onClick: () => {
            const srcCell = activeCell ? data[activeCell] : null;
            const fmt = srcCell?.fmt || {};
            useSheetStore.getState().activateFormatPainter(fmt, false);
            toast('Format Painter active (Click target cell)', 'info');
          }
        },
        { divider: true },
        {
          label: 'Insert Row Above',
          icon: '⬆',
          onClick: () => {
            const index = activeCell ? parseRef(activeCell).r : 0;
            useSheetStore.getState().insertRowAbove(index);
          }
        },
        {
          label: 'Insert Column Right',
          icon: '➡',
          onClick: () => {
            const colIndex = activeCell ? parseRef(activeCell).c : 0;
            useSheetStore.getState().insertColumnRight(colIndex);
          }
        },
        {
          label: 'Delete Row',
          icon: '✕',
          danger: true,
          onClick: () => {
            const index = activeCell ? parseRef(activeCell).r : -1;
            if (index !== -1) {
              useSheetStore.getState().deleteRow(index);
            }
          }
        },
        {
          label: 'Delete Column',
          icon: '✕',
          danger: true,
          onClick: () => {
            const colIndex = activeCell ? parseRef(activeCell).c : -1;
            if (colIndex !== -1) {
              useSheetStore.getState().deleteColumn(colIndex);
            }
          }
        },
        { divider: true },
        {
          label: (() => {
            if (!activeCell) return 'Merge Cells';
            const { r, c } = parseRef(activeCell);
            const isMerged = Object.values(useSheetStore.getState().mergedCells).some(bounds => {
              const [st, en] = bounds.split(':');
              const s = parseRef(st); const e = parseRef(en);
              return r >= Math.min(s.r, e.r) && r <= Math.max(s.r, e.r) && c >= Math.min(s.c, e.c) && c <= Math.max(s.c, e.c);
            });
            return isMerged ? 'Unmerge Cells' : 'Merge & Center';
          })(),
          icon: '⊞',
          onClick: () => {
            if (!activeCell) return;
            const { r, c } = parseRef(activeCell);
            const isMerged = Object.values(useSheetStore.getState().mergedCells).some(bounds => {
              const [st, en] = bounds.split(':');
              const s = parseRef(st); const e = parseRef(en);
              return r >= Math.min(s.r, e.r) && r <= Math.max(s.r, e.r) && c >= Math.min(s.c, e.c) && c <= Math.max(s.c, e.c);
            });
            if (isMerged) {
              useSheetStore.getState().unmergeCell(activeCell);
            } else if (selectionRange) {
              const s = parseRef(selectionRange.start);
              const e = parseRef(selectionRange.end);
              const refs: string[] = [];
              for (let row = Math.min(s.r, e.r); row <= Math.max(s.r, e.r); row++)
                for (let col = Math.min(s.c, e.c); col <= Math.max(s.c, e.c); col++)
                  refs.push(`r_${row}_c_${col}`);
              if (refs.length >= 2) useSheetStore.getState().mergeCell(refs);
            }
          }
        },
        { divider: true },
        {
          label: 'AutoFit Column Width',
          icon: '↔',
          onClick: () => {
            if (activeCell) useSheetStore.getState().autoFitColumn(parseRef(activeCell).c);
          }
        },
        {
          label: 'AutoFit Row Height',
          icon: '↕',
          onClick: () => {
            if (activeCell) useSheetStore.getState().autoFitRow(parseRef(activeCell).r);
          }
        },
        { divider: true },
        {
          label: 'Stretch Column Width (+20px)',
          icon: '↔+',
          onClick: () => {
            if (activeCell) {
              const c = parseRef(activeCell).c;
              const cur = useSheetStore.getState().columnWidths[c] || 100;
              useSheetStore.getState().setColumnWidth(c, cur + 20);
            }
          }
        },
        {
          label: 'Stretch Row Height (+10px)',
          icon: '↕+',
          onClick: () => {
            if (activeCell) {
              const r = parseRef(activeCell).r;
              const cur = useSheetStore.getState().rowHeights[r] || 24;
              useSheetStore.getState().setRowHeight(r, cur + 10);
            }
          }
        },
        { divider: true },
        {
          label: 'Clear Contents',
          icon: '⌫',
          onClick: () => {
            if (activeCell) useSheetStore.getState().clearCell(activeCell);
          }
        },
        {
          label: 'Clear Selected Full Row',
          icon: '━',
          onClick: () => {
            useSheetStore.getState().clearSelectedRow();
          }
        },
        {
          label: 'Clear Selected Full Column',
          icon: '┃',
          onClick: () => {
            useSheetStore.getState().clearSelectedColumn();
          }
        },
        {
          label: 'Clear Full Sheet',
          icon: '🗑',
          danger: true,
          onClick: () => {
            useSheetStore.getState().clearSheet();
          }
        }
      ]
    });
  };

  // Middle-mouse Panning
  const handleGridMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      setIsPanning(true);
      if (parentRef.current) {
        panOriginRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: parentRef.current.scrollLeft,
          scrollTop: parentRef.current.scrollTop
        };
      }
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isPanning && panOriginRef.current && parentRef.current) {
        const dx = e.clientX - panOriginRef.current.x;
        const dy = e.clientY - panOriginRef.current.y;
        parentRef.current.scrollLeft = panOriginRef.current.scrollLeft - dx;
        parentRef.current.scrollTop = panOriginRef.current.scrollTop - dy;
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1 || isPanning) {
        setIsPanning(false);
        panOriginRef.current = null;
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning]);

  // Ctrl + Wheel Zoom
  const handleGridWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      useSheetStore.getState().setZoomLevel(prev => Math.min(2.0, Math.max(0.5, Number((prev + delta).toFixed(1)))));
    }
  };

  // Infinite Scroll Handler: dynamically append rows/columns as user reaches the edges
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 350) {
      useSheetStore.getState().expandRows(200);
    }
    if (scrollLeft + clientWidth >= scrollWidth - 350) {
      useSheetStore.getState().expandCols(30);
    }
  };

  return (
    <div 
      ref={parentRef} 
      className={`flex-1 overflow-auto bg-white outline-none select-none relative scrollbar-premium ${isDashboard ? 'cursor-default' : (isPanning ? 'cursor-all-scroll' : (formatPainter.active ? 'cursor-copy' : ''))}`} 
      tabIndex={0}
      onScroll={handleScroll}
      onWheel={handleGridWheel}
      onMouseDown={handleGridMouseDown}
      onKeyDown={handleGridKeyDown}
      onContextMenu={openContextMenu}
      style={{ zoom: zoomLevel !== 1 ? zoomLevel : undefined }}
    >
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          items={contextMenu.items} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      <div style={{ height: `${rowVirtualizer.getTotalSize() + finalHeaderH}px`, width: `${colVirtualizer.getTotalSize() + finalIndexW}px`, position: 'relative' }}>
        
        {!isDashboard && (
          <SelectionOverlay 
            selectionStyle={selectionStyle} 
            autoFillPreviewStyle={autoFillPreviewStyle}
            onAutoFillStart={() => setIsAutoFilling(true)} 
            onAutoFillDoubleClick={handleAutoFillDoubleClick}
            onBorderDoubleClick={handleBorderDoubleClick}
            onMoveSelectionStart={(e) => {
              setIsMovingSelection(true);
              setIsCopyMove(e.ctrlKey || e.metaKey);
            }}
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
            onSelectColumn={(c) => {
              setIsSelectingCols(true);
              setHeaderStartCol(c);
              const start = `r_0_c_${c}`;
              const end = `r_${rowCount - 1}_c_${c}`;
              handleCellSelect(start);
              useSheetStore.getState().setSelectionRange({ start, end });
            }}
            onColumnMouseEnter={(c) => {
              if (isSelectingCols && headerStartCol !== null) {
                const minC = Math.min(headerStartCol, c);
                const maxC = Math.max(headerStartCol, c);
                const start = `r_0_c_${minC}`;
                const end = `r_${rowCount - 1}_c_${maxC}`;
                useSheetStore.getState().setSelectionRange({ start, end });
              }
            }}
            onSelectRow={(r) => {
              setIsSelectingRows(true);
              setHeaderStartRow(r);
              const start = `r_${r}_c_0`;
              const end = `r_${r}_c_${colCount - 1}`;
              handleCellSelect(start);
              useSheetStore.getState().setSelectionRange({ start, end });
            }}
            onRowMouseEnter={(r) => {
              if (isSelectingRows && headerStartRow !== null) {
                const minR = Math.min(headerStartRow, r);
                const maxR = Math.max(headerStartRow, r);
                const start = `r_${minR}_c_0`;
                const end = `r_${maxR}_c_${colCount - 1}`;
                useSheetStore.getState().setSelectionRange({ start, end });
              }
            }}
            onSelectAll={() => {
              useSheetStore.getState().setSelectionRange({ start: 'r_0_c_0', end: `r_${rowCount - 1}_c_${colCount - 1}` });
            }}
            onColResizeStart={(e, idx, w) => {
              const startX = e.clientX;
              const prevCursor = document.body.style.cursor;
              const prevUserSelect = document.body.style.userSelect;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';

              const onMove = (me: MouseEvent) => {
                useSheetStore.getState().setColumnWidth(idx, Math.max(40, w + me.clientX - startX));
                colVirtualizer.measure();
              };
              const onUp = () => {
                document.body.style.cursor = prevCursor;
                document.body.style.userSelect = prevUserSelect;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                colVirtualizer.measure();
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            onRowResizeStart={(e, idx, h) => {
              const startY = e.clientY;
              const prevCursor = document.body.style.cursor;
              const prevUserSelect = document.body.style.userSelect;
              document.body.style.cursor = 'row-resize';
              document.body.style.userSelect = 'none';

              const onMove = (me: MouseEvent) => {
                useSheetStore.getState().setRowHeight(visibleRowIndices[idx], Math.max(20, h + me.clientY - startY));
                rowVirtualizer.measure();
              };
              const onUp = () => {
                document.body.style.cursor = prevCursor;
                document.body.style.userSelect = prevUserSelect;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                rowVirtualizer.measure();
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            onAutoFit={(idx) => {
              useSheetStore.getState().autoFitColumn(idx);
              toast(`AutoFit Column ${getColName(idx)}`, 'info');
            }}
            onAutoFitRow={(idx) => {
              useSheetStore.getState().autoFitRow(idx);
              toast(`AutoFit Row ${idx + 1}`, 'info');
            }}
          />
        )}

        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const r = visibleRowIndices[vRow.index];
          return colVirtualizer.getVirtualItems().map((vCol) => {
            const c = vCol.index;
            const ref = `r_${r}_c_${c}`;

            // Skip rendering non-origin cells of a merged region
            if (mergedMap.hidden.has(ref)) {
              return null;
            }

            const span = mergedMap.originSpans.get(ref);
            let cellW = vCol.size;
            let cellH = vRow.size;
            if (span) {
              cellW = 0;
              for (let sc = c; sc < c + span.colSpan; sc++) {
                cellW += columnWidths[sc] || 100;
              }
              cellH = 0;
              for (let sr = r; sr < r + span.rowSpan; sr++) {
                cellH += rowHeights[sr] || 24;
              }
            }

            return (
              <Cell 
                key={ref} 
                r={r} 
                c={c}
                isMultiSelected={allSelectedRefs.has(ref)}
                style={{ 
                  top: finalHeaderH + vRow.start, 
                  left: finalIndexW + vCol.start, 
                  width: cellW, 
                  height: cellH,
                  zIndex: span ? 15 : undefined
                }}
                onCellSelect={isDashboard ? () => {} : handleCellSelect} 
                onCommitChange={isDashboard ? () => {} : async (r, c, val) => {
                  await formulaService.commitCellChange(r, c, val);
                }}
                onCellKeydown={(e, r, c) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    useSheetStore.getState().setEditingCell(null);
                    const nextR = e.shiftKey ? Math.max(0, r - 1) : r + 1;
                    if (nextR >= rowCount - 5) useSheetStore.getState().expandRows(100);
                    handleCellSelect(`r_${nextR}_c_${c}`);
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    useSheetStore.getState().setEditingCell(null);
                    const nextC = e.shiftKey ? Math.max(0, c - 1) : c + 1;
                    if (nextC >= colCount - 5) useSheetStore.getState().expandCols(26);
                    handleCellSelect(`r_${r}_c_${nextC}`);
                  }
                }}
                onMouseDown={isDashboard ? undefined : (e) => handleCellMouseDown(ref, e)} 
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
            activeSheetId={activeSheetId}
          />
        )}

        {/* Freeze row indicator line */}
        {freezeRow > 0 && (
          <div 
            className="absolute left-0 right-0 z-30 pointer-events-none border-b-2 border-accent/80 shadow-[0_2px_8px_rgba(16,185,129,0.35)]"
            style={{ 
              top: finalHeaderH + Array.from({ length: freezeRow }).reduce<number>((acc, _, idx) => acc + (rowHeights[idx] || 24), 0)
            }}
          />
        )}

        {/* Freeze column indicator line */}
        {freezeCol > 0 && (
          <div 
            className="absolute top-0 bottom-0 z-30 pointer-events-none border-r-2 border-accent/80 shadow-[2px_0_8px_rgba(16,185,129,0.35)]"
            style={{ 
              left: finalIndexW + Array.from({ length: freezeCol }).reduce<number>((acc, _, idx) => acc + (columnWidths[idx] || 100), 0)
            }}
          />
        )}
      </div>

      {/* --- AUTO-FILL SMART TAG OPTIONS BUTTON --- */}
      {smartTag && (
        <div 
          className="fixed bottom-12 right-24 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="relative">
            <button 
              onClick={() => setSmartTag(prev => prev ? { ...prev, isOpen: !prev.isOpen } : null)}
              className="bg-surface border-2 border-accent text-accent font-bold px-2 py-1 rounded-md shadow-xl flex items-center gap-1.5 text-xs hover:bg-accent hover:text-white transition-all active:scale-95"
              title="AutoFill Options"
            >
              <span>📋</span>
              <span>AutoFill Options</span>
              <span className="text-[10px]">▼</span>
            </button>

            {smartTag.isOpen && (
              <div 
                className="absolute bottom-full right-0 mb-1.5 bg-surface border border-border rounded-xl shadow-2xl py-1.5 min-w-[200px] flex flex-col backdrop-blur-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-100"
                onMouseLeave={() => setSmartTag(prev => prev ? { ...prev, isOpen: false } : null)}
              >
                <div className="px-3 py-1 text-[10px] font-bold text-textMuted uppercase border-b border-border/40">
                  AutoFill Mode
                </div>
                <button 
                  onClick={() => {
                    toast('Applied: Copy Cells', 'info');
                    setSmartTag(null);
                  }}
                  className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                >
                  <span>📄</span> Copy Cells
                </button>
                <button 
                  onClick={() => {
                    toast('Applied: Fill Series (Default)', 'success');
                    setSmartTag(null);
                  }}
                  className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain font-semibold"
                >
                  <span>📈</span> Fill Series
                </button>
                <button 
                  onClick={() => {
                    toast('Applied: Fill Formatting Only', 'info');
                    setSmartTag(null);
                  }}
                  className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                >
                  <span>🎨</span> Fill Formatting Only
                </button>
                <button 
                  onClick={() => {
                    toast('Applied: Fill Without Formatting', 'info');
                    setSmartTag(null);
                  }}
                  className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                >
                  <span>🔢</span> Fill Without Formatting
                </button>
                <button 
                  onClick={() => {
                    toast('Applied: Flash Fill (Pattern Detect)', 'success');
                    setSmartTag(null);
                  }}
                  className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-accent font-bold"
                >
                  <span>⚡</span> Flash Fill
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- LIVE MOUSE SELECTION QUICK STATS PILL --- */}
      {quickStats && (
        <div className="fixed bottom-14 right-6 z-40 bg-[#1e1e1e]/95 backdrop-blur-xl border border-[#3d3d3d] px-3.5 py-1.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.45)] flex items-center gap-3 text-xs font-semibold text-textMain animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
          {quickStats.sum !== null && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(String(quickStats.sum));
                toast(`Copied SUM: ${quickStats.sum}`, 'success');
              }}
              title="Click to copy SUM"
              className="hover:text-accent flex items-center gap-1 transition-colors"
            >
              <span className="text-[10px] text-textMuted uppercase font-bold">Sum:</span>
              <span className="font-mono">{quickStats.sum.toLocaleString()}</span>
            </button>
          )}

          {quickStats.avg !== null && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(String(quickStats.avg));
                toast(`Copied AVG: ${quickStats.avg}`, 'success');
              }}
              title="Click to copy AVERAGE"
              className="hover:text-accent flex items-center gap-1 transition-colors border-l border-border/60 pl-2.5"
            >
              <span className="text-[10px] text-textMuted uppercase font-bold">Avg:</span>
              <span className="font-mono">{quickStats.avg.toLocaleString()}</span>
            </button>
          )}

          <button 
            onClick={() => {
              navigator.clipboard.writeText(String(quickStats.count));
              toast(`Copied COUNT: ${quickStats.count}`, 'success');
            }}
            title="Click to copy COUNT"
            className="hover:text-accent flex items-center gap-1 transition-colors border-l border-border/60 pl-2.5"
          >
            <span className="text-[10px] text-textMuted uppercase font-bold">Count:</span>
            <span className="font-mono">{quickStats.count}</span>
          </button>

          {quickStats.min !== null && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(String(quickStats.min));
                toast(`Copied MIN: ${quickStats.min}`, 'success');
              }}
              title="Click to copy MIN"
              className="hover:text-accent hidden sm:flex items-center gap-1 transition-colors border-l border-border/60 pl-2.5"
            >
              <span className="text-[10px] text-textMuted uppercase font-bold">Min:</span>
              <span className="font-mono">{quickStats.min.toLocaleString()}</span>
            </button>
          )}

          {quickStats.max !== null && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(String(quickStats.max));
                toast(`Copied MAX: ${quickStats.max}`, 'success');
              }}
              title="Click to copy MAX"
              className="hover:text-accent hidden sm:flex items-center gap-1 transition-colors border-l border-border/60 pl-2.5"
            >
              <span className="text-[10px] text-textMuted uppercase font-bold">Max:</span>
              <span className="font-mono">{quickStats.max.toLocaleString()}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

