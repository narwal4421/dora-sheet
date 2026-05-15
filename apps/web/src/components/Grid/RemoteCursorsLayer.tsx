import React from 'react';
import type { CursorMoveEvent, ConnectedUser } from '../../store/useSheetStore';

interface RemoteCursorsLayerProps {
  remoteCursors: Record<string, CursorMoveEvent>;
  connectedUsers: ConnectedUser[];
  rowVirtualizer: any;
  colVirtualizer: any;
  visibleRowIndices: number[];
  finalHeaderH: number;
  finalIndexW: number;
}

export const RemoteCursorsLayer: React.FC<RemoteCursorsLayerProps> = ({
  remoteCursors,
  connectedUsers,
  rowVirtualizer,
  colVirtualizer,
  visibleRowIndices,
  finalHeaderH,
  finalIndexW,
}) => {
  return (
    <>
      {Object.entries(remoteCursors).map(([userId, cursor]) => {
        const user = connectedUsers.find(u => u.userId === userId);
        const color = user?.color || '#6366f1';
        
        const rowItem = rowVirtualizer.getVirtualItems().find((v: any) => visibleRowIndices[v.index] === cursor.row);
        const colItem = colVirtualizer.getVirtualItems().find((v: any) => v.index === cursor.col);
        
        if (!rowItem || !colItem) return null;

        return (
          <div 
            key={userId}
            className="absolute z-20 pointer-events-none transition-all duration-150 ease-out flex flex-col items-start"
            style={{ 
              top: rowItem.start + finalHeaderH, 
              left: colItem.start + finalIndexW 
            }}
          >
            <div 
              className="border-2 rounded-sm" 
              style={{ 
                borderColor: color, 
                width: colItem.size, 
                height: rowItem.size 
              }} 
            />
            <div 
              className="px-1.5 py-0.5 rounded-br-md rounded-bl-md text-[9px] font-bold text-white whitespace-nowrap shadow-sm" 
              style={{ backgroundColor: color }}
            >
              {cursor.userName}
            </div>
          </div>
        );
      })}
    </>
  );
};
