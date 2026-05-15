import React from 'react';

interface SelectionOverlayProps {
  selectionStyle: { top: number; left: number; width: number; height: number } | null;
  onAutoFillStart: (e: React.MouseEvent) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ selectionStyle, onAutoFillStart }) => {
  if (!selectionStyle) return null;

  return (
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
        className="absolute bottom-[-5px] right-[-5px] w-2.5 h-2.5 bg-accent border-2 border-white rounded-sm cursor-crosshair pointer-events-auto shadow-sm hover:scale-125 transition-transform"
        onMouseDown={onAutoFillStart}
      />
    </div>
  );
};
