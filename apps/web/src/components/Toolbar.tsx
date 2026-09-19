import { Bold, Italic, Strikethrough, AlignLeft, AlignCenter, AlignRight, Type, PaintBucket, Percent, DollarSign, Bot, Undo, Redo, Search } from 'lucide-react';
import { useSheetStore } from '../store/useSheetStore';
import { useRef, useCallback, useMemo } from 'react';

export const Toolbar = ({ onToggleAI }: { onToggleAI: () => void }) => {
  const data = useSheetStore(state => state.data);
  const activeCell = useSheetStore(state => state.activeCell);
  const selectionRange = useSheetStore(state => state.selectionRange);
  const setCellFormat = useSheetStore(state => state.setCellFormat);
  const undo = useSheetStore(state => state.undo);
  const redo = useSheetStore(state => state.redo);
  const history = useSheetStore(state => state.history);
  const future = useSheetStore(state => state.future);
  const findReplace = useSheetStore(state => state.findReplace);
  const setFindReplace = useSheetStore(state => state.setFindReplace);

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
      if (activeCell) {
        fn(activeCell);
      }
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
    <div className="dark flex items-center px-4 py-2 border-b z-10 gap-4 overflow-x-auto no-scrollbar" style={{ backgroundColor: '#1e1e1e', borderColor: '#3d3d3d' }}>
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r pr-4 shrink-0" style={{ borderColor: '#3d3d3d' }}>
        <button
          onClick={undo}
          disabled={history.length === 0}
          className={`p-1.5 rounded transition-all active:scale-95 ${history.length === 0 ? 'cursor-not-allowed opacity-30' : 'hover:bg-[#333333]'}`}
          style={{ color: history.length === 0 ? '#666' : '#cccccc' }}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className={`p-1.5 rounded transition-all active:scale-95 ${future.length === 0 ? 'cursor-not-allowed opacity-30' : 'hover:bg-[#333333]'}`}
          style={{ color: future.length === 0 ? '#666' : '#cccccc' }}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
        <button
          onClick={() => setFindReplace({ isOpen: !findReplace.isOpen })}
          className={`p-1.5 rounded transition-all ml-1 active:scale-95`}
          style={{ color: findReplace.isOpen ? '#107c41' : '#cccccc', backgroundColor: findReplace.isOpen ? 'rgba(16,124,65,0.15)' : 'transparent' }}
          title="Find & Replace (Ctrl+F)"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Formatting */}
      <div className="flex items-center gap-1 border-r pr-4 shrink-0" style={{ borderColor: '#3d3d3d' }}>
        <button onClick={() => toggleFormat('bold')} className="p-1.5 rounded transition-all active:scale-95" style={{ color: currentFmt.bold ? '#107c41' : '#cccccc', backgroundColor: currentFmt.bold ? 'rgba(16,124,65,0.15)' : 'transparent' }} title="Bold"><Bold size={16} /></button>
        <button onClick={() => toggleFormat('italic')} className="p-1.5 rounded transition-all active:scale-95" style={{ color: currentFmt.italic ? '#107c41' : '#cccccc', backgroundColor: currentFmt.italic ? 'rgba(16,124,65,0.15)' : 'transparent' }} title="Italic"><Italic size={16} /></button>
        <button onClick={() => toggleFormat('strikethrough')} className="p-1.5 rounded transition-all active:scale-95" style={{ color: currentFmt.strikethrough ? '#107c41' : '#cccccc', backgroundColor: currentFmt.strikethrough ? 'rgba(16,124,65,0.15)' : 'transparent' }} title="Strikethrough"><Strikethrough size={16} /></button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-r pr-4 shrink-0" style={{ borderColor: '#3d3d3d' }}>
        <button onClick={() => setFormat('align', 'left')} className="p-1.5 rounded transition-all active:scale-95" style={{ color: (!currentFmt.align || currentFmt.align === 'left') ? '#107c41' : '#cccccc', backgroundColor: (!currentFmt.align || currentFmt.align === 'left') ? 'rgba(16,124,65,0.15)' : 'transparent' }} title="Align Left"><AlignLeft size={16} /></button>
        <button onClick={() => setFormat('align', 'center')} className="p-1.5 rounded transition-all active:scale-95" style={{ color: currentFmt.align === 'center' ? '#107c41' : '#cccccc', backgroundColor: currentFmt.align === 'center' ? 'rgba(16,124,65,0.15)' : 'transparent' }} title="Align Center"><AlignCenter size={16} /></button>
        <button onClick={() => setFormat('align', 'right')} className="p-1.5 rounded transition-all active:scale-95" style={{ color: currentFmt.align === 'right' ? '#107c41' : '#cccccc', backgroundColor: currentFmt.align === 'right' ? 'rgba(16,124,65,0.15)' : 'transparent' }} title="Align Right"><AlignRight size={16} /></button>
      </div>

      {/* Colors */}
      <div className="flex items-center gap-1 border-r pr-4 relative shrink-0" style={{ borderColor: '#3d3d3d' }}>
        <button onClick={() => textColorRef.current?.click()} className="p-1.5 rounded hover:bg-[#333333] transition-all active:scale-95 relative flex items-center justify-center" style={{ color: '#cccccc' }} title="Text Color">
          <Type size={16} style={{ color: currentFmt.color || '#cccccc' }} />
          <div className="absolute bottom-0 w-3/4 h-[2px] rounded-full" style={{ backgroundColor: currentFmt.color || '#cccccc' }} />
        </button>
        <input ref={textColorRef} type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => setFormat('color', e.target.value)} />

        <button onClick={() => bgColorRef.current?.click()} className="p-1.5 rounded hover:bg-[#333333] transition-all active:scale-95 relative flex items-center justify-center" style={{ color: '#cccccc' }} title="Fill Color">
          <PaintBucket size={16} />
          <div className="absolute bottom-0 w-3/4 h-[2px] rounded-full" style={{ backgroundColor: currentFmt.backgroundColor || 'transparent' }} />
        </button>
        <input ref={bgColorRef} type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => setFormat('backgroundColor', e.target.value)} />
      </div>

      {/* Number Formats */}
      <div className="flex items-center gap-1 border-r pr-4 shrink-0" style={{ borderColor: '#3d3d3d' }}>
        <button onClick={() => toggleNumberFormat('percent')} className="p-1.5 rounded hover:bg-[#333333] transition-all active:scale-95" style={{ color: '#cccccc' }} title="Format as Percent"><Percent size={16} /></button>
        <button onClick={() => toggleNumberFormat('currency')} className="p-1.5 rounded hover:bg-[#333333] transition-all active:scale-95" style={{ color: '#cccccc' }} title="Format as Currency"><DollarSign size={16} /></button>
      </div>

      {/* AI Bot Button */}
      <div className="flex-1 flex justify-end shrink-0">
          <button
            onClick={onToggleAI}
            className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-gradient-to-r from-accent to-emerald-600 text-slate-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-95 font-bold text-sm"
          >
            <Bot size={16} className="animate-pulse" />
            <span className="hidden md:inline">Dora AI</span>
          </button>
      </div>
    </div>
  );
};
