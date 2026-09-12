import { type FC, type MouseEvent } from 'react';

interface SelectionOverlayProps {
  selectionStyle: { top: number; left: number; width: number; height: number } | null;
  autoFillPreviewStyle?: { top: number; left: number; width: number; height: number } | null;
  onAutoFillStart: (e: MouseEvent) => void;
  onAutoFillDoubleClick?: () => void;
  onMoveSelectionStart?: (e: MouseEvent) => void;
  onBorderDoubleClick?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export const SelectionOverlay: FC<SelectionOverlayProps> = ({ 
  selectionStyle, 
  autoFillPreviewStyle,
  onAutoFillStart,
  onAutoFillDoubleClick,
  onMoveSelectionStart,
  onBorderDoubleClick
}) => {
  if (!selectionStyle) return null;

  return (
    <>
      {/* Main Active Selection Box */}
      <div 
        className="absolute z-20 border-2 border-accent bg-accent/[0.08] shadow-[0_0_15px_rgba(99,102,241,0.18)] transition-none pointer-events-none"
        style={{
          ...selectionStyle,
          willChange: 'top, left, width, height',
          boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.5)'
        }}
      >
        {/* Edge Drag-to-Move & Double-Click to Jump Handles */}
        {onMoveSelectionStart && (
          <>
            {/* Top Border */}
            <div 
              onMouseDown={onMoveSelectionStart} 
              onDoubleClick={() => onBorderDoubleClick?.('up')}
              className="absolute -top-1 left-0 right-0 h-2 cursor-grab active:cursor-grabbing pointer-events-auto" 
              title="Drag to move (Hold Ctrl to copy) | Double-click to jump up" 
            />
            {/* Bottom Border */}
            <div 
              onMouseDown={onMoveSelectionStart} 
              onDoubleClick={() => onBorderDoubleClick?.('down')}
              className="absolute -bottom-1 left-0 right-2 h-2 cursor-grab active:cursor-grabbing pointer-events-auto" 
              title="Drag to move (Hold Ctrl to copy) | Double-click to jump down" 
            />
            {/* Left Border */}
            <div 
              onMouseDown={onMoveSelectionStart} 
              onDoubleClick={() => onBorderDoubleClick?.('left')}
              className="absolute top-0 -left-1 bottom-0 w-2 cursor-grab active:cursor-grabbing pointer-events-auto" 
              title="Drag to move (Hold Ctrl to copy) | Double-click to jump left" 
            />
            {/* Right Border */}
            <div 
              onMouseDown={onMoveSelectionStart} 
              onDoubleClick={() => onBorderDoubleClick?.('right')}
              className="absolute top-0 -right-1 bottom-2 w-2 cursor-grab active:cursor-grabbing pointer-events-auto" 
              title="Drag to move (Hold Ctrl to copy) | Double-click to jump right" 
            />
          </>
        )}

        {/* AutoFill Drag Handle on Bottom-Right */}
        <div 
          className="absolute bottom-[-4px] right-[-4px] w-2.5 h-2.5 bg-accent border-2 border-white rounded-[2px] cursor-crosshair pointer-events-auto shadow-md hover:scale-150 transition-transform active:bg-indigo-400 active:scale-125 z-30"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAutoFillStart(e);
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAutoFillDoubleClick?.();
          }}
          title="Drag to auto-fill (Double-click to fill down)"
        />
      </div>

      {/* AutoFill Dotted Ghost Preview Box */}
      {autoFillPreviewStyle && (
        <div 
          className="absolute z-10 border-2 border-dashed border-accent/80 bg-accent/[0.04] pointer-events-none transition-none animate-pulse"
          style={{
            ...autoFillPreviewStyle,
            willChange: 'top, left, width, height'
          }}
        />
      )}
    </>
  );
};
