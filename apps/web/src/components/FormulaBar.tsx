import { useState, useRef, useEffect, useCallback } from 'react';
import { useSheetStore } from '../store/useSheetStore';
import { formulaService } from '../services/formulaService';
import { Check, X, FunctionSquare } from 'lucide-react';
import { toast } from '../store/useToastStore';

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
  return { r: parseInt(match[1], 10), c: parseInt(match[2], 10) };
};

export const FormulaBar = () => {
  const activeCell = useSheetStore(state => state.activeCell);
  const data = useSheetStore(state => state.data);
  const showFormulaBar = useSheetStore(state => state.showFormulaBar);
  const jumpToCell = useSheetStore(state => state.jumpToCell);

  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [nameBoxInput, setNameBoxInput] = useState<string>('');
  const [isEditingNameBox, setIsEditingNameBox] = useState<boolean>(false);
  const [showFunctionMenu, setShowFunctionMenu] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const functionMenuRef = useRef<HTMLDivElement>(null);

  // Close function dropdown when clicking outside
  useEffect(() => {
    if (!showFunctionMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (functionMenuRef.current && !functionMenuRef.current.contains(e.target as Node)) {
        setShowFunctionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFunctionMenu]);

  // Compute current display ref (e.g. A1, B12)
  const currentCellRef = activeCell ? (() => {
    const { r, c } = parseRef(activeCell);
    return `${getColName(c)}${r + 1}`;
  })() : 'A1';

  // Keep Name Box in sync when activeCell changes (unless user is typing in name box)
  useEffect(() => {
    if (!isEditingNameBox) {
      setNameBoxInput(currentCellRef);
    }
  }, [currentCellRef, isEditingNameBox]);

  const cell = activeCell ? data[activeCell] : null;
  const storeValue = cell?.f ?? cell?.v?.toString() ?? '';
  const displayValue = editingValue !== null ? editingValue : storeValue;
  const isDirty = editingValue !== null && editingValue !== storeValue;

  const handleCommit = useCallback(async () => {
    if (!activeCell || editingValue === null) return;
    const val = editingValue.trim();
    const { r, c } = parseRef(activeCell);
    setEditingValue(null);
    await formulaService.commitCellChange(r, c, val);
  }, [activeCell, editingValue]);

  const handleCancel = () => {
    setEditingValue(null);
    inputRef.current?.blur();
  };

  const handleNameBoxSubmit = () => {
    if (!nameBoxInput.trim()) return;
    const success = jumpToCell(nameBoxInput.trim());
    if (!success) {
      toast(`Invalid cell coordinate "${nameBoxInput}"`, 'warning');
      setNameBoxInput(currentCellRef);
    }
    setIsEditingNameBox(false);
  };

  const insertFunction = (fnName: string) => {
    const newVal = `=${fnName}()`;
    setEditingValue(newVal);
    setShowFunctionMenu(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(fnName.length + 2, fnName.length + 2);
      }
    }, 50);
  };

  if (!showFormulaBar) return null;

  return (
    <div className="flex items-center border-b px-2 py-1 gap-1 text-xs select-none relative z-10" style={{ backgroundColor: '#1e1e1e', borderColor: '#3d3d3d' }}>
      {/* --- NAME BOX --- */}
      <div className="relative">
        <input
          type="text"
          value={nameBoxInput}
          onChange={(e) => {
            setNameBoxInput(e.target.value);
            setIsEditingNameBox(true);
          }}
          className="w-16 md:w-20 text-center font-mono font-bold bg-[#2d2d2d] border rounded px-1.5 py-1 text-xs outline-none transition-all uppercase"
          style={{ color: '#107c41', borderColor: '#3d3d3d' }}
          onFocus={e => { setIsEditingNameBox(true); e.currentTarget.style.borderColor = '#107c41'; }}
          onBlur={e => { handleNameBoxSubmit(); e.currentTarget.style.borderColor = '#3d3d3d'; }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNameBoxSubmit();
            else if (e.key === 'Escape') {
              setNameBoxInput(currentCellRef);
              setIsEditingNameBox(false);
            }
          }}
          placeholder="A1"
          title="Name Box (Type cell like B5 and press Enter)"
        />
      </div>

      <div className="w-[1px] h-5 mx-1" style={{ backgroundColor: '#3d3d3d' }} />

      {/* --- FORMULA COMMIT / CANCEL BUTTONS --- */}
      <div className="flex items-center gap-0.5">
        <button
          onMouseDown={(e) => {
            // Prevent input onBlur from firing before cancel click
            e.preventDefault();
          }}
          onClick={handleCancel}
          disabled={!isDirty}
          className={`p-1 rounded hover:bg-surfaceHover transition-colors ${isDirty ? 'text-rose-400 hover:text-rose-300' : 'text-textMuted/40 cursor-default'}`}
          title="Cancel (Esc)"
        >
          <X size={14} />
        </button>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={handleCommit}
          disabled={!isDirty}
          className={`p-1 rounded hover:bg-surfaceHover transition-colors ${isDirty ? 'text-emerald-400 hover:text-emerald-300 font-bold' : 'text-textMuted/40 cursor-default'}`}
          title="Commit (Enter)"
        >
          <Check size={14} />
        </button>

        {/* Function Helper Icon */}
        <div className="relative" ref={functionMenuRef}>
          <button
            onClick={() => setShowFunctionMenu(!showFunctionMenu)}
            className="px-1.5 py-1 rounded hover:bg-surfaceHover text-accent font-serif italic font-bold text-sm leading-none flex items-center gap-0.5 transition-colors"
            title="Insert Function (ƒx)"
          >
            <span>ƒ<sub>x</sub></span>
          </button>

          {showFunctionMenu && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-surface border border-border rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-semibold text-textMuted uppercase tracking-wider border-b border-border/50">
                Insert Function
              </div>
              {['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'IF', 'VLOOKUP', 'CONCATENATE'].map((fn) => (
                <button
                  key={fn}
                  onClick={() => insertFunction(fn)}
                  className="w-full text-left px-3 py-1 text-xs text-textMain hover:bg-surfaceHover hover:text-accent font-mono flex items-center gap-2"
                >
                  <FunctionSquare size={12} className="text-accent" />
                  <span>{fn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- FORMULA INPUT --- */}
      <div className="flex-1 flex items-center border rounded px-2.5 py-1 transition-all" style={{ backgroundColor: '#ffffff', borderColor: '#ababab' }}>
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent outline-none font-mono text-xs placeholder-gray-400"
          style={{ color: '#111827' }}
          value={displayValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCommit();
              inputRef.current?.blur();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          onBlur={handleCommit}
          placeholder="Enter a value or formula (e.g. =SUM(A1:B10))"
        />
      </div>
    </div>
  );
};
