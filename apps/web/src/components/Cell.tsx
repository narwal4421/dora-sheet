import { memo, useState, useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useSheetStore } from '../store/useSheetStore';
import { Lock } from 'lucide-react';
import { socketService } from '../services/socket.service';

interface CellProps {
  r: number;
  c: number;
  style: CSSProperties;
  onCellSelect: (ref: string) => void;
  onCommitChange: (r: number, c: number, value: string) => void;
  onCellKeydown: (e: KeyboardEvent, r: number, c: number, ref: string) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  isMultiSelected?: boolean;
  children?: ReactNode;
}

export const Cell = memo(({ 
  r, c, style, onCellSelect, onCommitChange, onCellKeydown, onMouseDown, onMouseEnter, isMultiSelected, children 
}: CellProps) => {
  const ref = `r_${r}_c_${c}`;
  
  // Use granular selectors to minimize re-renders
  const cellData = useSheetStore(state => state.data[ref]);
  const isActive = useSheetStore(state => state.activeCell === ref);
  const isEditing = useSheetStore(state => state.editingCell === ref);
  const lockedBy = useSheetStore(state => state.lockedCells[ref]);
  const showGridlines = useSheetStore(state => state.showGridlines);
  const formatPainterActive = useSheetStore(state => state.formatPainter.active);
  
  // Internal input state when editing
  const [inputValue, setInputValue] = useState('');
  // Track if user explicitly cancelled (Escape) to suppress onBlur commit
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      cancelledRef.current = false;
      setInputValue(cellData?.f ?? cellData?.v?.toString() ?? '');
    }
  }, [isEditing, cellData]);

  // Only subscribe to the relevant remote cursor
  const remoteCursor = useSheetStore(state => {
    const cursors = state.cursors;
    for (const userId in cursors) {
      const cur = cursors[userId];
      if (cur.row === r && cur.col === c && (Date.now() - cur.timestamp < 30000)) {
        return cur;
      }
    }
    return null;
  });

  const borderClass = showGridlines ? "border-b border-r border-border/80" : "border-b border-r border-transparent";
  
  const cellClassName = [
    "absolute select-none overflow-hidden",
    formatPainterActive ? "cursor-copy" : "cursor-cell",
    borderClass,
    cellData?.fmt?.border === 'all' ? "!border-2 !border-textMain" : "",
    isActive && !isEditing ? "z-20 ring-2 ring-accent ring-inset shadow-[0_0_12px_rgba(99,102,241,0.3)] bg-accent/5" : "",
    !isActive && isMultiSelected ? "z-10 bg-accent/[0.12] ring-1 ring-accent/40 ring-inset" : (!isActive ? "bg-background/50" : ""),
    isActive && isEditing ? "z-30 shadow-2xl" : "",
    !isActive && !isMultiSelected ? "hover:bg-surfaceHover/40" : ""
  ].filter(Boolean).join(" ");

  // Formatted value display
  const formattedValue = (() => {
    if (cellData?.v === undefined || cellData?.v === null) return '';
    const numFmt = cellData?.fmt?.numFmt;
    const decimals = cellData?.fmt?.decimals ?? 2;
    const val = cellData.v;

    if (typeof val === 'number' || (!isNaN(Number(val)) && val !== '')) {
      const num = Number(val);
      if (numFmt === 'currency') {
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
      }
      if (numFmt === 'percent') {
        return `${(num * 100).toFixed(decimals)}%`;
      }
      if (numFmt === 'number') {
        return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      }
    }
    return String(val);
  })();

  const contentStyle: React.CSSProperties = {
    fontWeight: cellData?.fmt?.bold ? 'bold' : 'normal',
    fontStyle: cellData?.fmt?.italic ? 'italic' : 'normal',
    textDecoration: [
      cellData?.fmt?.strikethrough ? 'line-through' : '',
      cellData?.fmt?.underline ? 'underline' : ''
    ].filter(Boolean).join(' ') || 'none',
    color: cellData?.fmt?.color || 'inherit',
    fontFamily: cellData?.fmt?.fontFamily || undefined,
    fontSize: cellData?.fmt?.fontSize ? `${cellData.fmt.fontSize}px` : undefined,
    justifyContent: cellData?.fmt?.align === 'center' ? 'center' : cellData?.fmt?.align === 'right' ? 'flex-end' : 'flex-start',
    alignItems: cellData?.fmt?.verticalAlign === 'top' ? 'flex-start' : cellData?.fmt?.verticalAlign === 'bottom' ? 'flex-end' : 'center',
    whiteSpace: cellData?.fmt?.wrapText ? 'pre-wrap' : 'nowrap',
  };

  return (
    <div
      className={cellClassName}
      style={{
        ...style,
        backgroundColor: cellData?.fmt?.backgroundColor || undefined,
        outline: remoteCursor && !isActive ? `2px solid ${remoteCursor.color}` : undefined,
        outlineOffset: '-2px',
        contain: 'layout paint style',
      }}
      onMouseDown={(e) => { if (e.button === 0) onMouseDown?.(e); }}
      onMouseEnter={onMouseEnter}
      onClick={(e) => {
        if (e.shiftKey) return;
        onCellSelect(ref);
        if (isEditing) {
          socketService.emitCellLock(ref, 'unlock');
          useSheetStore.getState().setEditingCell(null);
        }
      }}
      onDoubleClick={() => {
        onCellSelect(ref);
        if (!lockedBy) {
          socketService.emitCellLock(ref, 'lock');
          useSheetStore.getState().setEditingCell(ref);
        }
      }}
    >
      {remoteCursor && !isActive && (
        <div 
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" 
          style={{ boxShadow: `inset 0 0 0 2px ${remoteCursor.color}` }}
        >
          <div 
            className="absolute top-[-18px] left-[-2px] text-[9px] text-white px-1 py-0.5 rounded-t shadow-sm whitespace-nowrap font-bold"
            style={{ backgroundColor: remoteCursor.color }}
          >
            {remoteCursor.userName}
          </div>
        </div>
      )}

      {lockedBy && !isEditing && (
        <div className="absolute top-0 right-0 p-[2px] opacity-40 text-accent z-10">
          <Lock size={10} />
        </div>
      )}

      {isEditing ? (
        <input
          autoFocus
          className="w-full h-full outline-none border-2 border-accent px-1 text-xs font-sans absolute top-0 left-0 bg-surface text-textMain z-40 shadow-inner"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => {
            if (cancelledRef.current) {
              cancelledRef.current = false;
              return;
            }
            onCommitChange(r, c, inputValue);
            socketService.emitCellLock(ref, 'unlock');
            useSheetStore.getState().setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              cancelledRef.current = true;
              socketService.emitCellLock(ref, 'unlock');
              useSheetStore.getState().setEditingCell(null);
            } else {
              onCellKeydown(e, r, c, ref);
            }
          }}
        />
      ) : (
        <div className="w-full h-full px-1.5 flex pointer-events-none text-xs truncate" style={contentStyle}>
          {formattedValue}
        </div>
      )}
      {children}
    </div>
  );
});
