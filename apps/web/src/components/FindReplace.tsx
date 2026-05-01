import { useEffect } from 'react';
import { useSheetStore } from '../store/useSheetStore';
import { X, ChevronUp, ChevronDown, Replace as ReplaceIcon, ReplaceAll } from 'lucide-react';

export const FindReplace = () => {
  const { 
    findReplace, 
    setFindReplace, 
    executeFind, 
    nextFindResult, 
    prevFindResult, 
    replaceCurrent, 
    replaceAll 
  } = useSheetStore();

  const { isOpen, findText, replaceText, results, currentIndex } = findReplace;

  // Trigger search whenever findText changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      executeFind();
    }, 200); // 200ms debounce
    return () => clearTimeout(timeoutId);
  }, [findText, executeFind]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 right-8 w-80 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="flex items-center justify-between px-3 py-2 bg-surfaceHover/50 border-b border-white/5">
        <span className="text-xs font-semibold tracking-wide text-textMain uppercase">Find & Replace</span>
        <button 
          onClick={() => setFindReplace({ isOpen: false })}
          className="text-textMuted hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Find Input */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              autoFocus
              placeholder="Find..."
              value={findText}
              onChange={(e) => setFindReplace({ findText: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) prevFindResult();
                  else nextFindResult();
                }
              }}
              className="w-full bg-background/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
            {findText && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-textMuted select-none pointer-events-none">
                {results.length > 0 ? `${currentIndex + 1} / ${results.length}` : '0 / 0'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={prevFindResult}
              disabled={results.length === 0}
              className="p-1.5 text-textMuted hover:text-accent hover:bg-accent/10 rounded disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-textMuted transition-colors"
              title="Previous (Shift+Enter)"
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={nextFindResult}
              disabled={results.length === 0}
              className="p-1.5 text-textMuted hover:text-accent hover:bg-accent/10 rounded disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-textMuted transition-colors"
              title="Next (Enter)"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Replace Input */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setFindReplace({ replaceText: e.target.value })}
              className="w-full bg-background/60 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={replaceCurrent}
            disabled={results.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 bg-surfaceHover hover:bg-accent/20 text-textMain hover:text-accent border border-white/5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
          >
            <ReplaceIcon size={14} /> Replace
          </button>
          <button
            onClick={replaceAll}
            disabled={results.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 bg-surfaceHover hover:bg-accent/20 text-textMain hover:text-accent border border-white/5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
          >
            <ReplaceAll size={14} /> Replace All
          </button>
        </div>
      </div>
    </div>
  );
};
