import { useSheetStore } from '../store/useSheetStore';
import { useState, useRef, useCallback } from 'react';
import { socketService } from '../services/socket.service';

const SHEET_ID = 'default-workbook-id';

const getColName = (c: number) => {
  let name = '';
  let temp = c;
  while (temp >= 0) {
    name = String.fromCharCode(65 + (temp % 26)) + name;
    temp = Math.floor(temp / 26) - 1;
  }
  return name;
};

const parseRef = (ref: string) => {
  const match = ref.match(/r_(\d+)_c_(\d+)/);
  if (!match) return { r: 0, c: 0 };
  return { r: parseInt(match[1]), c: parseInt(match[2]) };
};

export const FormulaBar = () => {
  const activeCell = useSheetStore(state => state.activeCell);
  const data = useSheetStore(state => state.data);
  const setCellData = useSheetStore(state => state.setCellData);
  
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cell = activeCell ? data[activeCell] : null;
  const storeValue = cell?.f ?? cell?.v?.toString() ?? '';
  const displayValue = editingValue ?? storeValue;

  let displayRef = '';
  if (activeCell) {
    const { r, c } = parseRef(activeCell);
    displayRef = `${getColName(c)}${r + 1}`;
  }

  const handleCommit = useCallback(() => {
    if (!activeCell || editingValue === null) return;
    const value = editingValue;
    const isFormula = value.startsWith('=');
    const newData = { [isFormula ? 'f' : 'v']: value, ...(!isFormula && { f: undefined }) };
    
    setCellData(activeCell, newData);
    socketService.emitCellUpdate(SHEET_ID, activeCell, newData);
    setEditingValue(null);
  }, [activeCell, editingValue, setCellData]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommit();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditingValue(null);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex items-center border-b border-border bg-surface p-1.5 shadow-sm relative z-10 gap-1">
      <div className="w-16 text-center font-mono font-bold text-accent border border-border/50 rounded bg-accent/5 px-2 py-1 text-xs shadow-inner">
        {displayRef || '---'}
      </div>
      
      <div className="flex flex-1 items-center px-3 py-1 bg-surfaceHover/50 rounded-lg border border-transparent focus-within:border-accent/30 focus-within:bg-surface transition-all duration-200 group">
        <span className="text-accent font-mono font-black mr-3 opacity-50 group-focus-within:opacity-100 transition-opacity select-none italic text-base">ƒ<sub>x</sub></span>
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent outline-none font-mono text-sm text-textMain placeholder-textMuted/40"
          value={displayValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCommit}
          placeholder="Enter a value or formula (e.g. =SUM(A1:B10))"
        />
      </div>

      <div className="flex items-center gap-2 px-2 text-[10px] text-textMuted/60 font-medium select-none uppercase tracking-widest hidden sm:flex">
        Ready
      </div>
    </div>
  );
};
