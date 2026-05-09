import React, { memo } from 'react';
import { useSheetStore } from '../store/useSheetStore';
import { Lock } from 'lucide-react';
import { socketService } from '../services/socket.service';

interface CellProps {
  r: number;
  c: number;
  style: React.CSSProperties;
  onCellSelect: (ref: string) => void;
  onCommitChange: (r: number, c: number, value: string) => void;
  onCellKeydown: (e: React.KeyboardEvent, r: number, c: number, ref: string) => void;
  onMouseDown?: () => void;
  onMouseEnter?: () => void;
  children?: React.ReactNode;
}

export const Cell = memo(({ 
  r, c, style, onCellSelect, onCommitChange, onCellKeydown, onMouseDown, onMouseEnter, children 
}: CellProps) => {
  const ref = `r_${r}_c_${c}`;
  
  // Use granular selectors to minimize re-renders
  const cellData = useSheetStore(state => state.data[ref]);
  const isActive = useSheetStore(state => state.activeCell === ref);
  const isEditing = useSheetStore(state => state.editingCell === ref);
  const lockedBy = useSheetStore(state => state.lockedCells[ref]);
  
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

  // Performance: Avoid transitions during layout-heavy states
  const cellClassName = [
    "absolute border-b border-r border-border select-none overflow-hidden",
    isActive && !isEditing ? "z-20 ring-2 ring-accent ring-inset shadow-[0_0_12px_rgba(99,102,241,0.3)] bg-accent/5" : "bg-background/50",
    isActive && isEditing ? "z-30 shadow-2xl" : "",
    !isActive ? "hover:bg-surfaceHover/40" : ""
  ].join(" ");

  const contentStyle: React.CSSProperties = {
    fontWeight: cellData?.fmt?.bold ? 'bold' : 'normal',
    fontStyle: cellData?.fmt?.italic ? 'italic' : 'normal',
    textDecoration: cellData?.fmt?.strikethrough ? 'line-through' : 'none',
    color: cellData?.fmt?.color || 'inherit',
    justifyContent: cellData?.fmt?.align === 'center' ? 'center' : cellData?.fmt?.align === 'right' ? 'flex-end' : 'flex-start'
  };

  return (
    <div
      className={cellClassName}
      style={{
        ...style,
        backgroundColor: cellData?.fmt?.backgroundColor || undefined,
        outline: remoteCursor && !isActive ? `2px solid ${remoteCursor.color}` : undefined,
        outlineOffset: '-2px',
        contain: 'layout paint style', // CSS Containment for extreme render perf
      }}
      onMouseDown={(e) => { if (e.button === 0) onMouseDown?.(); }}
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
          className="w-full h-full outline-none border-2 border-accent px-1 text-sm font-sans absolute top-0 left-0 bg-surface text-textMain z-40 shadow-inner"
          defaultValue={cellData?.f ?? cellData?.v?.toString() ?? ''}
          onBlur={(e) => {
            onCommitChange(r, c, e.target.value);
            socketService.emitCellLock(ref, 'unlock');
            useSheetStore.getState().setEditingCell(null);
          }}
          onKeyDown={(e) => onCellKeydown(e, r, c, ref)}
        />
      ) : (
        <div className="w-full h-full px-1 flex items-center pointer-events-none text-sm truncate" style={contentStyle}>
          {cellData?.v ?? ''}
        </div>
      )}
      {children}
    </div>
  );
}, (prev, next) => {
  // Ultra-strict comparison to avoid any unnecessary re-renders
  return (
    prev.r === next.r &&
    prev.c === next.c &&
    prev.style.width === next.style.width &&
    prev.style.height === next.style.height &&
    prev.style.top === next.style.top &&
    prev.style.left === next.style.left
  );
});
