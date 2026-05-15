import { Bold, Italic, Strikethrough, AlignLeft, AlignCenter, AlignRight, Type, PaintBucket, Percent, DollarSign, Bot, Undo, Redo, Search } from 'lucide-react';
import { useSheetStore } from '../store/useSheetStore';
import { useRef, useCallback, useMemo } from 'react';

export const Toolbar = ({ onToggleAI }: { onToggleAI: () => void }) => {
  const { data, activeCell, selectionRange, setCellFormat, undo, redo, history, future, findReplace, setFindReplace } = useSheetStore();
  const textColorRef = useRef<HTMLInputElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);

  const selectionBounds = useMemo(() => {
    if (!selectionRange) return null;
    const parse = (ref: string) => {
      const m = ref.match(/r_(\d+)_c_(\d+)/);
      return m ? { r: parseInt(m[1]), c: parseInt(m[2]) } : { r: 0, c: 0 };
    };
    const s = parse(selectionRange.start);
    const e = parse(selectionRange.end);
    return {
      minR: Math.min(s.r, e.r),
      maxR: Math.max(s.r, e.r),
      minC: Math.min(s.c, e.c),
      maxC: Math.max(s.c, e.c)
    };
  }, [selectionRange]);

  const currentFmt = activeCell ? (data[activeCell]?.fmt || {}) : {};

  const applyToSelection = useCallback((fn: (ref: string) => void) => {
    if (!selectionBounds) {
      if (activeCell) fn(activeCell);
      return;
    }
    for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
      for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
        fn(`r_${r}_c_${c}`);
      }
    }
  }, [selectionBounds, activeCell]);

  const toggleFormat = (key: string, value: string | boolean | number = true) => {
    const isCurrentlySet = currentFmt[key] === value;
    applyToSelection((ref) => {
      setCellFormat(ref, { [key]: isCurrentlySet ? undefined : value });
    });
  };

  const setFormat = (key: string, value: string | boolean | number) => {
    applyToSelection((ref) => {
      setCellFormat(ref, { [key]: value });
    });
  };

  const toggleNumberFormat = (type: 'percent' | 'currency') => {
    applyToSelection((ref) => {
      const cell = useSheetStore.getState().data[ref];
      const currentVal = cell?.v;
      if (typeof currentVal === 'number' || !isNaN(Number(currentVal))) {
        let num = Number(currentVal);
        if (type === 'percent') num = num * 100;
        const strVal = type === 'percent' ? `${num}%` : `$${num.toFixed(2)}`;
        useSheetStore.getState().setCellData(ref, { v: strVal });
      }
    });
  };

  return (
    <div className="dark flex items-center px-4 py-2 border-b border-border bg-surface shadow-sm z-10 gap-4 overflow-x-auto no-scrollbar">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-border pr-4 shrink-0">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className={`p-1.5 rounded transition-all active:scale-95 ${history.length === 0 ? 'text-border cursor-not-allowed opacity-50' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain hover:shadow-lg'}`}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className={`p-1.5 rounded transition-all active:scale-95 ${future.length === 0 ? 'text-border cursor-not-allowed opacity-50' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain hover:shadow-lg'}`}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
        <button
          onClick={() => setFindReplace({ isOpen: !findReplace.isOpen })}
          className={`p-1.5 rounded transition-all ml-1 active:scale-95 ${findReplace.isOpen ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain hover:shadow-lg'}`}
          title="Find & Replace (Ctrl+F)"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Formatting */}
      <div className="flex items-center gap-1 border-r border-border pr-4 shrink-0">
        <button onClick={() => toggleFormat('bold')} className={`p-1.5 rounded transition-all active:scale-95 ${currentFmt.bold ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} title="Bold"><Bold size={16} /></button>
        <button onClick={() => toggleFormat('italic')} className={`p-1.5 rounded transition-all active:scale-95 ${currentFmt.italic ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} title="Italic"><Italic size={16} /></button>
        <button onClick={() => toggleFormat('strikethrough')} className={`p-1.5 rounded transition-all active:scale-95 ${currentFmt.strikethrough ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} title="Strikethrough"><Strikethrough size={16} /></button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-r border-border pr-4 shrink-0">
        <button onClick={() => setFormat('align', 'left')} className={`p-1.5 rounded transition-all active:scale-95 ${currentFmt.align === 'left' || !currentFmt.align ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} title="Align Left"><AlignLeft size={16} /></button>
        <button onClick={() => setFormat('align', 'center')} className={`p-1.5 rounded transition-all active:scale-95 ${currentFmt.align === 'center' ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} title="Align Center"><AlignCenter size={16} /></button>
        <button onClick={() => setFormat('align', 'right')} className={`p-1.5 rounded transition-all active:scale-95 ${currentFmt.align === 'right' ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} title="Align Right"><AlignRight size={16} /></button>
      </div>

      {/* Colors */}
      <div className="flex items-center gap-1 border-r border-border pr-4 relative shrink-0">
        <button onClick={() => textColorRef.current?.click()} className="p-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-all active:scale-95 relative flex items-center justify-center" title="Text Color">
          <Type size={16} style={{ color: currentFmt.color || 'inherit' }} />
          <div className="absolute bottom-0 w-3/4 h-[2px] rounded-full" style={{ backgroundColor: currentFmt.color || '#fff' }} />
        </button>
        <input ref={textColorRef} type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => setFormat('color', e.target.value)} />

        <button onClick={() => bgColorRef.current?.click()} className="p-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-all active:scale-95 relative flex items-center justify-center" title="Fill Color">
          <PaintBucket size={16} />
          <div className="absolute bottom-0 w-3/4 h-[2px] rounded-full" style={{ backgroundColor: currentFmt.backgroundColor || 'transparent' }} />
        </button>
        <input ref={bgColorRef} type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => setFormat('backgroundColor', e.target.value)} />
      </div>

      {/* Number Formats */}
      <div className="flex items-center gap-1 border-r border-border pr-4 shrink-0">
        <button onClick={() => toggleNumberFormat('percent')} className="p-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-all active:scale-95" title="Format as Percent"><Percent size={16} /></button>
        <button onClick={() => toggleNumberFormat('currency')} className="p-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-all active:scale-95" title="Format as Currency"><DollarSign size={16} /></button>
      </div>

      {/* AI Bot Button */}
      <div className="flex-1 flex justify-end shrink-0">
          <button
            onClick={onToggleAI}
            className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-gradient-to-r from-accent to-indigo-600 text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all active:scale-95 font-semibold text-sm"
          >
            <Bot size={16} className="animate-pulse" />
            <span className="hidden md:inline">Dora AI</span>
          </button>
      </div>
    </div>
  );
};
