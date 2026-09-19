import React, { useMemo } from 'react';
import { useSheetStore } from '../../store/useSheetStore';
import type { Virtualizer, VirtualItem } from '@tanstack/react-virtual';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, User } from 'lucide-react';

interface RemoteCursorsLayerProps {
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  colVirtualizer: Virtualizer<HTMLDivElement, Element>;
  visibleRowIndices: number[];
  finalHeaderH: number;
  finalIndexW: number;
  activeSheetId: string;
}

export const RemoteCursorsLayer: React.FC<RemoteCursorsLayerProps> = React.memo(({
  rowVirtualizer,
  colVirtualizer,
  visibleRowIndices,
  finalHeaderH,
  finalIndexW,
  activeSheetId,
}) => {
  // Directly subscribe to store slice — isolated from Grid re-renders
  const cursors = useSheetStore(state => state.cursors);
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  const localUserId = useSheetStore(state => state.localUserId);

  const virtualRowItems = rowVirtualizer.getVirtualItems();
  const virtualColItems = colVirtualizer.getVirtualItems();

  // O(1) lookup map for visible rows
  const rowMap = useMemo(() => {
    const map = new Map<number, VirtualItem>();
    for (let i = 0; i < virtualRowItems.length; i++) {
      const v = virtualRowItems[i];
      const actualRow = visibleRowIndices[v.index];
      if (actualRow !== undefined) map.set(actualRow, v);
    }
    return map;
  }, [virtualRowItems, visibleRowIndices]);

  // O(1) lookup map for visible columns
  const colMap = useMemo(() => {
    const map = new Map<number, VirtualItem>();
    for (let i = 0; i < virtualColItems.length; i++) {
      const v = virtualColItems[i];
      map.set(v.index, v);
    }
    return map;
  }, [virtualColItems]);

  const minVisibleRow = virtualRowItems.length > 0 ? visibleRowIndices[virtualRowItems[0].index] : 0;
  const maxVisibleRow = virtualRowItems.length > 0 ? visibleRowIndices[virtualRowItems[virtualRowItems.length - 1].index] : 0;
  const minVisibleCol = virtualColItems.length > 0 ? virtualColItems[0].index : 0;
  const maxVisibleCol = virtualColItems.length > 0 ? virtualColItems[virtualColItems.length - 1].index : 0;

  const now = Date.now();

  const handleJumpToCollaborator = (r: number, c: number) => {
    const visibleIdx = visibleRowIndices.indexOf(r);
    if (visibleIdx !== -1) {
      rowVirtualizer.scrollToIndex(visibleIdx, { align: 'center' });
    }
    colVirtualizer.scrollToIndex(c, { align: 'center' });
  };

  const cursorEntries = Object.entries(cursors);

  return (
    <>
      {cursorEntries.map(([userId, cursor]) => {
        // Skip local user's own cursor or cursors on another sheet tab
        if (userId === localUserId || cursor.sheetId !== activeSheetId) return null;

        // Skip cursors older than 45 seconds
        const age = now - (cursor.timestamp || now);
        if (age > 45000) return null;

        const isStale = age > 15000;
        const user = connectedUsers.find(u => u.userId === userId);
        const color = cursor.color || user?.color || '#10b981';

        const rowItem = rowMap.get(cursor.row);
        const colItem = colMap.get(cursor.col);

        // If off-screen, render radar pill at viewport perimeter
        if (!rowItem || !colItem) {
          const isAbove = cursor.row < minVisibleRow;
          const isBelow = cursor.row > maxVisibleRow;
          const isLeft = cursor.col < minVisibleCol;
          const isRight = cursor.col > maxVisibleCol;

          return (
            <button
              key={`radar-${userId}`}
              type="button"
              onClick={() => handleJumpToCollaborator(cursor.row, cursor.col)}
              className="absolute z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow-lg pointer-events-auto cursor-pointer transition-all hover:scale-105 active:scale-95 duration-150 backdrop-blur-xs select-none"
              style={{
                backgroundColor: color,
                top: isAbove ? 32 : isBelow ? 'calc(100% - 38px)' : '50%',
                left: isLeft ? 48 : isRight ? 'calc(100% - 130px)' : '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 4px 14px ${color}66`,
              }}
              title={`Jump to ${cursor.userName} at Row ${cursor.row + 1}, Col ${String.fromCharCode(65 + (cursor.col % 26))}`}
            >
              <User size={12} className="opacity-90 shrink-0" />
              <span className="truncate max-w-[80px]">{cursor.userName}</span>
              {isAbove && <ChevronUp size={13} className="shrink-0 animate-bounce" />}
              {isBelow && <ChevronDown size={13} className="shrink-0 animate-bounce" />}
              {isLeft && !isAbove && !isBelow && <ChevronLeft size={13} className="shrink-0" />}
              {isRight && !isAbove && !isBelow && <ChevronRight size={13} className="shrink-0" />}
            </button>
          );
        }

        const x = colItem.start + finalIndexW;
        const y = rowItem.start + finalHeaderH;
        const width = colItem.size;
        const height = rowItem.size;
        const isTopEdge = cursor.row === 0 || y < 35;

        return (
          <div 
            key={userId}
            className="absolute top-0 left-0 z-30 pointer-events-none"
            style={{ 
              transform: `translate3d(${x}px, ${y}px, 0)`,
              width: `${width}px`,
              height: `${height}px`,
              willChange: 'transform, width, height',
              transition: 'transform 100ms cubic-bezier(0.16, 1, 0.3, 1), width 100ms ease, height 100ms ease, opacity 250ms ease-out',
              opacity: isStale ? 0.45 : 1,
            }}
          >
            {/* Cell border with subtle glow & soft accent fill */}
            <div 
              className="absolute inset-0 rounded-[2px]" 
              style={{ 
                border: `2px solid ${color}`,
                backgroundColor: `${color}14`,
                boxShadow: `0 0 0 1px ${color}33, 0 0 10px ${color}38`,
              }} 
            />

            {/* Collaborator name pill with SVG cursor pointer arrow */}
            <div 
              className={`absolute left-[-2px] flex items-center gap-1.5 px-2 py-0.5 rounded shadow-lg text-[10px] font-bold text-white whitespace-nowrap select-none ${
                isTopEdge ? 'top-full mt-0.5 rounded-b-md' : 'bottom-full mb-0.5 rounded-t-md'
              }`} 
              style={{ 
                backgroundColor: color,
                boxShadow: `0 2px 8px ${color}66`,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="1.2">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
              <span>{cursor.userName || 'Collaborator'}</span>
            </div>
          </div>
        );
      })}
    </>
  );
});

RemoteCursorsLayer.displayName = 'RemoteCursorsLayer';
