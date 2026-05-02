import { Bold, Italic, Strikethrough, AlignLeft, AlignCenter, AlignRight, Type, PaintBucket, Percent, DollarSign, Bot, Undo, Redo, Search } from 'lucide-react';
import { useSheetStore } from '../store/useSheetStore';
import { useRef } from 'react';

export const Toolbar = ({ onToggleAI }: { onToggleAI: () => void }) => {
  const { data, activeCell, setCellFormat, undo, redo, history, future, findReplace, setFindReplace } = useSheetStore();
  const textColorRef = useRef<HTMLInputElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);

  const currentFmt = activeCell ? (data[activeCell]?.fmt || {}) : {};

  const toggleFormat = (key: string, value: string | boolean | number = true) => {
    if (!activeCell) return;
    setCellFormat(activeCell, { [key]: currentFmt[key] === value ? undefined : value });
  };

  const setFormat = (key: string, value: string | boolean | number) => {
    if (!activeCell) return;
    setCellFormat(activeCell, { [key]: value });
  };

  const toggleNumberFormat = (type: 'percent' | 'currency') => {
    if (!activeCell) return;
    const currentVal = data[activeCell]?.v;
    if (typeof currentVal === 'number' || !isNaN(Number(currentVal))) {
      // In a full implementation, we'd use a formatting engine, but for simple UI feedback:
      let formatted = Number(currentVal);
      if (type === 'percent') formatted = formatted * 100;
      const strVal = type === 'percent' ? `${formatted}%` : `$${formatted.toFixed(2)}`;
      useSheetStore.getState().setCellData(activeCell, { v: strVal });
    }
  };

  return (
    <div className="dark flex items-center px-4 py-2 border-b border-border bg-surface shadow-sm z-10 gap-4">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <button 
          onClick={undo}
          disabled={history.length === 0}
          className={`p-1.5 rounded transition-colors ${history.length === 0 ? 'text-border cursor-not-allowed' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}
        >
          <Undo size={16} />
        </button>
        <button 
          onClick={redo}
          disabled={future.length === 0}
          className={`p-1.5 rounded transition-colors ${future.length === 0 ? 'text-border cursor-not-allowed' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}
          title="Redo"
        >
          <Redo size={16} />
        </button>
        <button 
          onClick={() => setFindReplace({ isOpen: !findReplace.isOpen })}
          className={`p-1.5 rounded transition-colors ml-1 ${findReplace.isOpen ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}
          title="Find & Replace"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Formatting */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <button onClick={() => toggleFormat('bold')} className={`p-1.5 rounded transition-colors ${currentFmt.bold ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}><Bold size={16} /></button>
        <button onClick={() => toggleFormat('italic')} className={`p-1.5 rounded transition-colors ${currentFmt.italic ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}><Italic size={16} /></button>
        <button onClick={() => toggleFormat('strikethrough')} className={`p-1.5 rounded transition-colors ${currentFmt.strikethrough ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}><Strikethrough size={16} /></button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <button onClick={() => setFormat('align', 'left')} className={`p-1.5 rounded transition-colors ${currentFmt.align === 'left' || !currentFmt.align ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}><AlignLeft size={16} /></button>
        <button onClick={() => setFormat('align', 'center')} className={`p-1.5 rounded transition-colors ${currentFmt.align === 'center' ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}><AlignCenter size={16} /></button>
        <button onClick={() => setFormat('align', 'right')} className={`p-1.5 rounded transition-colors ${currentFmt.align === 'right' ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}><AlignRight size={16} /></button>
      </div>

      {/* Colors */}
      <div className="flex items-center gap-1 border-r border-border pr-4 relative">
        <button onClick={() => textColorRef.current?.click()} className="p-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-colors relative flex items-center justify-center">
          <Type size={16} style={{ color: currentFmt.color || 'inherit' }} />
          <div className="absolute bottom-0 w-3/4 h-[3px] rounded-full" style={{ backgroundColor: currentFmt.color || '#fff' }} />
        </button>
        <input ref={textColorRef} type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => setFormat('color', e.target.value)} />

        <button onClick={() => bgColorRef.current?.click()} className="p-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-colors relative flex items-center justify-center">
          <PaintBucket size={16} />
          <div className="absolute bottom-0 w-3/4 h-[3px] rounded-full" style={{ backgroundColor: currentFmt.backgroundColor || 'transparent' }} />
        </button>
        <input ref={bgColorRef} type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => setFormat('backgroundColor', e.target.value)} />
      </div>

      {/* Number Formats */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <button onClick={() => toggleNumberFormat('percent')} className="p-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-colors"><Percent size={16} /></button>
        <button onClick={() => toggleNumberFormat('currency')} className="p-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-colors"><DollarSign size={16} /></button>
      </div>

      {/* AI Bot Button */}
      <div className="flex-1 flex justify-end">
        <button 
          onClick={onToggleAI}
          className="flex items-center gap-2 p-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors font-medium text-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          title="Dora AI Assistant"
        >
          <Bot size={20} />
        </button>
      </div>
    </div>
  );
};
