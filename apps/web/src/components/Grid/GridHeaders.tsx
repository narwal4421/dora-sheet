import React from 'react';

interface GridHeadersProps {
  colVirtualizer: any;
  rowVirtualizer: any;
  visibleRowIndices: number[];
  finalHeaderH: number;
  finalIndexW: number;
  getColName: (c: number) => string;
  onColResizeStart: (e: React.MouseEvent, index: number, width: number) => void;
  onRowResizeStart: (e: React.MouseEvent, index: number, height: number) => void;
  onAutoFit: (index: number) => void;
}

export const GridHeaders: React.FC<GridHeadersProps> = ({
  colVirtualizer,
  rowVirtualizer,
  visibleRowIndices,
  finalHeaderH,
  finalIndexW,
  getColName,
  onColResizeStart,
  onRowResizeStart,
  onAutoFit,
}) => {
  return (
    <>
      {/* Corner Header */}
      <div 
        className="sticky top-0 left-0 border-b border-r border-border bg-surface z-50 flex items-center justify-center font-bold text-[10px] text-textMuted" 
        style={{ width: finalIndexW, height: finalHeaderH }}
      >
        <div className="w-2 h-2 rounded-full bg-accent/20" />
      </div>

      {/* Column Headers */}
      {colVirtualizer.getVirtualItems().map((virtualCol: any) => (
        <div 
          key={`header-col-${virtualCol.index}`} 
          className="sticky top-0 absolute flex items-center justify-center border-b border-r border-border bg-surface text-[10px] text-textMuted font-bold hover:bg-surfaceHover transition-none z-40" 
          style={{ 
            left: finalIndexW + virtualCol.start, 
            width: virtualCol.size, 
            height: finalHeaderH, 
            position: 'absolute', 
            top: 0 
          }}
        >
          <div className="sticky top-0 w-full h-full flex items-center justify-center bg-inherit">
            {getColName(virtualCol.index)}
          </div>
          <div 
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize z-50 group" 
            onMouseDown={(e) => onColResizeStart(e, virtualCol.index, virtualCol.size)} 
            onDoubleClick={() => onAutoFit(virtualCol.index)}
          >
            <div className="absolute right-0 top-0 w-[1px] h-full bg-border group-hover:bg-accent" />
          </div>
        </div>
      ))}

      {/* Row Headers */}
      {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
        const rowIndex = visibleRowIndices[virtualRow.index];
        return (
          <div 
            key={`header-row-${virtualRow.index}`} 
            className="sticky left-0 absolute flex items-center justify-center border-b border-r border-border bg-surface text-[10px] text-textMuted font-bold hover:bg-surfaceHover transition-none z-30" 
            style={{ 
              top: finalHeaderH + virtualRow.start, 
              left: 0, 
              width: finalIndexW, 
              height: virtualRow.size, 
              position: 'absolute' 
            }}
          >
            <div className="sticky left-0 w-full h-full flex items-center justify-center bg-inherit">
              {rowIndex + 1}
            </div>
            <div 
              className="absolute left-0 bottom-0 w-full h-1 cursor-row-resize z-50 group" 
              onMouseDown={(e) => onRowResizeStart(e, virtualRow.index, virtualRow.size)}
            >
              <div className="absolute left-0 bottom-0 w-full h-[1px] bg-border group-hover:bg-accent" />
            </div>
          </div>
        );
      })}
    </>
  );
};
