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
}

export const Cell = memo(({ r, c, style, onCellSelect, onCommitChange, onCellKeydown }: CellProps) => {
  const ref = `r_${r}_c_${c}`;
  
  const cell = useSheetStore(state => state.data[ref]);
  const isActive = useSheetStore(state => state.activeCell === ref);
  const isEditing = useSheetStore(state => state.editingCell === ref);
  const lockedBy = useSheetStore(state => state.lockedCells[ref]);
  
  const remoteCursor = useSheetStore(state => {
    const now = Date.now();
    return Object.values(state.cursors).find(cur => cur.row === r && cur.col === c && (now - cur.timestamp < 30000));
  });

  return (
    <div
      className={`absolute border-b border-r border-border/60 bg-background/50 backdrop-blur-sm cursor-cell transition-all duration-75
        ${isActive && !isEditing ? 'border-2 border-accent shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2),0_0_12px_rgba(99,102,241,0.4)] z-10 bg-accent/5' : 'hover:bg-surfaceHover/50'}
        ${isActive && isEditing ? 'z-20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]' : ''}
      `}
      style={{
        ...style,
        backgroundColor: cell?.fmt?.backgroundColor || undefined,
        ...(remoteCursor && !isActive && { border: `2px solid ${remoteCursor.color}`, boxShadow: `0 0 8px ${remoteCursor.color}40`, zIndex: 5 })
      }}
      onClick={() => {
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
      title={lockedBy ? `Locked by ${lockedBy}` : undefined}
    >
      {remoteCursor && !isActive && (
        <div className="absolute top-[-20px] left-[-2px] text-xs text-white px-1.5 py-0.5 rounded shadow-md whitespace-nowrap z-20 font-medium" style={{ backgroundColor: remoteCursor.color }}>
          {remoteCursor.userName}
        </div>
      )}

      {lockedBy && !isEditing && (
        <div className="absolute top-0 right-0 p-[2px] opacity-60 text-accent z-10">
          <Lock size={12} />
        </div>
      )}

      {isEditing ? (
        <input
          autoFocus
          className="w-full h-full outline-none border-2 border-accent px-2 text-sm font-sans absolute top-0 left-0 bg-surface/90 backdrop-blur-md text-textMain shadow-[0_4px_20px_rgba(99,102,241,0.3)] rounded-sm"
          defaultValue={cell?.f ?? cell?.v?.toString() ?? ''}
          onBlur={(e) => {
            onCommitChange(r, c, e.target.value);
            socketService.emitCellLock(ref, 'unlock');
            useSheetStore.getState().setEditingCell(null);
          }}
          onKeyDown={(e) => onCellKeydown(e, r, c, ref)}
        />
      ) : (
        <div 
          className="w-full h-full px-1 overflow-hidden whitespace-nowrap text-sm flex items-center"
          style={{
            fontWeight: cell?.fmt?.bold ? 'bold' : 'normal',
            fontStyle: cell?.fmt?.italic ? 'italic' : 'normal',
            textDecoration: cell?.fmt?.strikethrough ? 'line-through' : 'none',
            color: cell?.fmt?.color || 'inherit',
            justifyContent: cell?.fmt?.align === 'center' ? 'center' : cell?.fmt?.align === 'right' ? 'flex-end' : 'flex-start'
          }}
        >
          {cell?.v ?? ''}
        </div>
      )}
    </div>
  );
});
