import { type FC, type MouseEvent } from 'react';
import { type Virtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { useSheetStore } from '../../store/useSheetStore';

interface GridHeadersProps {
  colVirtualizer: Virtualizer<HTMLDivElement, Element>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  visibleRowIndices: number[];
  finalHeaderH: number;
  finalIndexW: number;
  getColName: (c: number) => string;
  onColResizeStart: (e: MouseEvent, index: number, width: number) => void;
  onRowResizeStart: (e: MouseEvent, index: number, height: number) => void;
  onAutoFit: (index: number) => void;
  onAutoFitRow?: (index: number) => void;
  onSelectColumn?: (colIndex: number, e?: MouseEvent) => void;
  onSelectRow?: (rowIndex: number, e?: MouseEvent) => void;
  onColumnMouseEnter?: (colIndex: number) => void;
  onRowMouseEnter?: (rowIndex: number) => void;
  onSelectAll?: () => void;
}

export const GridHeaders: FC<GridHeadersProps> = ({
  colVirtualizer,
  rowVirtualizer,
  visibleRowIndices,
  finalHeaderH,
  finalIndexW,
  getColName,
  onColResizeStart,
  onRowResizeStart,
  onAutoFit,
  onAutoFitRow,
  onSelectColumn,
  onSelectRow,
  onColumnMouseEnter,
  onRowMouseEnter,
  onSelectAll,
}) => {
  const showHeaders = useSheetStore(state => state.showHeaders);

  if (!showHeaders || finalHeaderH === 0) return null;

  return (
    <>
      {/* Top-Left Corner Box - Pinned both top & left */}
      <div 
        onClick={onSelectAll}
        className="sticky top-0 left-0 border-b border-r border-border bg-surface z-50 flex items-center justify-center font-bold text-[10px] text-textMuted hover:bg-surfaceHover cursor-pointer select-none transition-colors shadow-sm" 
        style={{ width: finalIndexW, height: finalHeaderH }}
        title="Select All (Ctrl+A)"
      >
        <div className="w-2.5 h-2.5 rounded-sm bg-accent/30 hover:bg-accent transition-colors" />
      </div>

      {/* Column Headers Container - Sticky at top */}
      <div 
        className="sticky top-0 z-40 pointer-events-none" 
        style={{ height: finalHeaderH, marginTop: -finalHeaderH, marginLeft: finalIndexW }}
      >
        {colVirtualizer.getVirtualItems().map((virtualCol: VirtualItem) => (
          <div 
            key={`header-col-${virtualCol.index}`} 
            onMouseDown={(e) => onSelectColumn?.(virtualCol.index, e)}
            onMouseEnter={() => onColumnMouseEnter?.(virtualCol.index)}
            className="absolute flex items-center justify-center border-b border-r border-border bg-surface text-[11px] text-textMuted font-bold hover:bg-surfaceHover hover:text-textMain cursor-pointer select-none transition-colors pointer-events-auto shadow-sm" 
            style={{ 
              left: virtualCol.start, 
              width: virtualCol.size, 
              height: finalHeaderH, 
              top: 0 
            }}
            title={`Column ${getColName(virtualCol.index)} (Drag to select columns, double-click border to AutoFit)`}
          >
            <span className="truncate px-1">{getColName(virtualCol.index)}</span>
            
            {/* Column Resize Handle */}
            <div 
              className="absolute -right-1.5 top-0 w-3 h-full cursor-col-resize z-50 group flex items-center justify-center hover:bg-accent/20 transition-colors" 
              onMouseDown={(e) => {
                e.stopPropagation();
                onColResizeStart(e, virtualCol.index, virtualCol.size);
              }} 
              onDoubleClick={(e) => {
                e.stopPropagation();
                onAutoFit(virtualCol.index);
              }}
              title="Drag border to resize column, double-click to AutoFit"
            >
              <div className="w-[2px] h-full bg-border/60 group-hover:bg-accent transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* Row Headers Container - Sticky on left */}
      <div 
        className="sticky left-0 z-30 pointer-events-none" 
        style={{ width: finalIndexW, marginTop: -finalHeaderH }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const rowIndex = visibleRowIndices[virtualRow.index];
          return (
            <div 
              key={`header-row-${virtualRow.index}`} 
              onMouseDown={(e) => onSelectRow?.(rowIndex, e)}
              onMouseEnter={() => onRowMouseEnter?.(rowIndex)}
              className="absolute flex items-center justify-center border-b border-r border-border bg-surface text-[10px] text-textMuted font-mono font-medium hover:bg-surfaceHover hover:text-textMain cursor-pointer select-none transition-colors pointer-events-auto shadow-sm" 
              style={{ 
                top: finalHeaderH + virtualRow.start, 
                left: 0, 
                width: finalIndexW, 
                height: virtualRow.size 
              }}
              title={`Row ${rowIndex + 1} (Drag to select rows, double-click border to AutoFit)`}
            >
              <span>{rowIndex + 1}</span>

              {/* Row Resize Handle */}
              <div 
                className="absolute left-0 -bottom-1.5 w-full h-3 cursor-row-resize z-50 group flex items-center justify-center hover:bg-accent/20 transition-colors" 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onRowResizeStart(e, virtualRow.index, virtualRow.size);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onAutoFitRow?.(rowIndex);
                }}
                title="Drag border to resize row, double-click to AutoFit"
              >
                <div className="w-full h-[2px] bg-border/60 group-hover:bg-accent transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
