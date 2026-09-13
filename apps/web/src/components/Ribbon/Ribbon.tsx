import { useState, useRef, useMemo, useCallback, type FC } from 'react';
import { 
  useSheetStore, 
  type RibbonTab, 
  type CellFormat 
} from '../../store/useSheetStore';
import { 
  Bold, Italic, Strikethrough, Underline,
  AlignLeft, AlignCenter, AlignRight, WrapText,
  Type, PaintBucket, Grid as GridIcon,
  DollarSign, Percent, Plus, Minus,
  Scissors, Copy, Clipboard, Paintbrush, ChevronDown,
  PlusSquare, Trash2, ArrowUpCircle, ArrowRightCircle,
  Sigma, Eraser, ArrowDownAZ, ArrowUpZA, Filter, Search,
  BarChart3, LineChart, PieChart, AreaChart, LayoutDashboard, Sparkles,
  FunctionSquare, Calculator,
  ZoomIn, ZoomOut, Maximize,
  SlidersHorizontal,
  Bot, Combine, Split, Snowflake, Calendar, CheckSquare,
  ArrowDown, ArrowRight, Layers
} from 'lucide-react';
import { toast } from '../../store/useToastStore';
import { socketService } from '../../services/socket.service';

interface RibbonProps {
  onToggleAI: () => void;
  onShowTemplates?: () => void;
  onShowDashboard?: () => void;
  onShowCalculator?: () => void;
}

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

export const Ribbon: FC<RibbonProps> = ({ 
  onToggleAI, 
  onShowTemplates, 
  onShowDashboard,
  onShowCalculator 
}) => {
  const activeTab = useSheetStore(state => state.activeRibbonTab);
  const setActiveTab = useSheetStore(state => state.setActiveRibbonTab);
  
  const data = useSheetStore(state => state.data);
  const activeCell = useSheetStore(state => state.activeCell);
  const selectionRange = useSheetStore(state => state.selectionRange);
  const setCellFormat = useSheetStore(state => state.setCellFormat);
  const setCellData = useSheetStore(state => state.setCellData);
  
  const formatPainter = useSheetStore(state => state.formatPainter);
  const activateFormatPainter = useSheetStore(state => state.activateFormatPainter);
  const deactivateFormatPainter = useSheetStore(state => state.deactivateFormatPainter);
  const pasteSpecial = useSheetStore(state => state.pasteSpecial);
  
  const showGridlines = useSheetStore(state => state.showGridlines);
  const setShowGridlines = useSheetStore(state => state.setShowGridlines);
  const showHeaders = useSheetStore(state => state.showHeaders);
  const setShowHeaders = useSheetStore(state => state.setShowHeaders);
  const showFormulaBar = useSheetStore(state => state.showFormulaBar);
  const setShowFormulaBar = useSheetStore(state => state.setShowFormulaBar);
  const zoomLevel = useSheetStore(state => state.zoomLevel);
  const setZoomLevel = useSheetStore(state => state.setZoomLevel);
  
  const setFindReplace = useSheetStore(state => state.setFindReplace);
  const findReplace = useSheetStore(state => state.findReplace);

  const mergedCells = useSheetStore(state => state.mergedCells);
  const mergeCell = useSheetStore(state => state.mergeCell);
  const unmergeCell = useSheetStore(state => state.unmergeCell);
  const freezeRow = useSheetStore(state => state.freezeRow);
  const freezeCol = useSheetStore(state => state.freezeCol);
  const setFreezeRow = useSheetStore(state => state.setFreezeRow);
  const setFreezeCol = useSheetStore(state => state.setFreezeCol);

  const [showPasteSpecialMenu, setShowPasteSpecialMenu] = useState(false);
  const [showClearMenu, setShowClearMenu] = useState(false);
  const [showBorderMenu, setShowBorderMenu] = useState(false);
  const [showFreezeMenu, setShowFreezeMenu] = useState(false);
  const textColorRef = useRef<HTMLInputElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);

  // Parse selection range coordinates
  const selectionBounds = useMemo(() => {
    if (!selectionRange) return null;
    const s = parseRef(selectionRange.start);
    const e = parseRef(selectionRange.end);
    return {
      minR: Math.min(s.r, e.r),
      maxR: Math.max(s.r, e.r),
      minC: Math.min(s.c, e.c),
      maxC: Math.max(s.c, e.c)
    };
  }, [selectionRange]);

  const currentFmt: CellFormat = activeCell ? (data[activeCell]?.fmt || {}) : {};

  // Check if active cell is inside a merged cell
  const isCurrentMerged = useMemo(() => {
    if (!activeCell) return false;
    const { r, c } = parseRef(activeCell);
    for (const bounds of Object.values(mergedCells)) {
      const [start, end] = bounds.split(':');
      if (!start || !end) continue;
      const s = parseRef(start);
      const e = parseRef(end);
      if (r >= Math.min(s.r, e.r) && r <= Math.max(s.r, e.r) &&
          c >= Math.min(s.c, e.c) && c <= Math.max(s.c, e.c)) {
        return true;
      }
    }
    return false;
  }, [activeCell, mergedCells]);

  // Apply format modification to entire current selection or active cell
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

  const getSelectedRefs = useCallback((): string[] => {
    if (!selectionBounds) {
      return activeCell ? [activeCell] : [];
    }
    const refs: string[] = [];
    for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
      for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
        refs.push(`r_${r}_c_${c}`);
      }
    }
    return refs;
  }, [selectionBounds, activeCell]);

  const toggleFormat = <K extends keyof CellFormat>(key: K, val: CellFormat[K] = true as CellFormat[K]) => {
    const isSet = currentFmt[key] === val;
    const patch = { [key]: isSet ? undefined : val };
    const refs = getSelectedRefs();
    if (refs.length === 1) {
      setCellFormat(refs[0], patch);
    } else if (refs.length > 1) {
      useSheetStore.getState().setRangeFormat(refs, patch);
    }
  };

  const setFormat = <K extends keyof CellFormat>(key: K, val: CellFormat[K]) => {
    const patch = { [key]: val };
    const refs = getSelectedRefs();
    if (refs.length === 1) {
      setCellFormat(refs[0], patch);
    } else if (refs.length > 1) {
      useSheetStore.getState().setRangeFormat(refs, patch);
    }
  };

  // Get active cell coordinate string e.g. "A1" or range "A1:B5"
  const getActiveCoordString = () => {
    if (selectionBounds) {
      const startLetter = getColName(selectionBounds.minC);
      const endLetter = getColName(selectionBounds.maxC);
      return `${startLetter}${selectionBounds.minR + 1}:${endLetter}${selectionBounds.maxR + 1}`;
    }
    if (activeCell) {
      const { r, c } = parseRef(activeCell);
      return `${getColName(c)}${r + 1}`;
    }
    return 'A1';
  };

  // Clipboard operations
  const handleCopy = async () => {
    if (!activeCell && !selectionBounds) return;
    const bounds = selectionBounds || {
      minR: parseInt(activeCell!.split('_')[1], 10),
      maxR: parseInt(activeCell!.split('_')[1], 10),
      minC: parseInt(activeCell!.split('_')[3], 10),
      maxC: parseInt(activeCell!.split('_')[3], 10)
    };
    const lines: string[] = [];
    for (let r = bounds.minR; r <= bounds.maxR; r++) {
      const rowVals: string[] = [];
      for (let c = bounds.minC; c <= bounds.maxC; c++) {
        const cell = data[`r_${r}_c_${c}`];
        rowVals.push(cell?.f ?? cell?.v?.toString() ?? '');
      }
      lines.push(rowVals.join('\t'));
    }
    await navigator.clipboard.writeText(lines.join('\n'));
    toast('Copied to clipboard', 'info');
  };

  const handleCut = async () => {
    await handleCopy();
    const refs = getSelectedRefs();
    if (refs.length > 0) {
      // Use clearRange for single history entry + socket broadcast
      useSheetStore.getState().clearRange(refs);
    }
    toast('Cut to clipboard', 'info');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const start = activeCell ? parseRef(activeCell) : { r: 0, c: 0 };

      const rows = text.replace(/\r\n/g, '\n').split('\n');
      const updates: Record<string, Partial<import('../../store/useSheetStore').CellData>> = {};
      let maxCols = 0;

      rows.forEach((rowStr, rOffset) => {
        if (!rowStr && rOffset === rows.length - 1) return;
        const cols = rowStr.split('\t');
        if (cols.length > maxCols) maxCols = cols.length;
        cols.forEach((val, cOffset) => {
          const targetRef = `r_${start.r + rOffset}_c_${start.c + cOffset}`;
          const isF = val.startsWith('=');
          const isNum = !isF && val.trim() !== '' && !isNaN(Number(val));
          const parsedVal = isNum ? Number(val) : val;
          updates[targetRef] = isF ? { f: val, v: undefined } : { v: parsedVal, f: undefined };
        });
      });

      useSheetStore.getState().ensureDimensions(start.r + rows.length, start.c + Math.max(maxCols, 30));
      useSheetStore.getState().bulkSetCellData(updates);
      socketService.emitBulkCellUpdate(useSheetStore.getState().activeSheetId, updates);
      toast('Pasted from clipboard', 'info');
    } catch {
      toast('Please use keyboard Ctrl+V to paste', 'warning');
    }
  };

  // Smart AutoSum calculation
  const insertAutoSum = (func: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN' = 'SUM') => {
    if (!activeCell) return;
    const { r: curR, c: curC } = parseRef(activeCell);
    const colLetter = getColName(curC);
    
    let formula = `=${func}(A1:A1)`;
    if (selectionBounds) {
      const startLetter = getColName(selectionBounds.minC);
      const endLetter = getColName(selectionBounds.maxC);
      formula = `=${func}(${startLetter}${selectionBounds.minR + 1}:${endLetter}${selectionBounds.maxR + 1})`;
    } else if (curR > 0) {
      formula = `=${func}(${colLetter}1:${colLetter}${curR})`;
    } else if (curC > 0) {
      const startLetter = 'A';
      const endLetter = getColName(curC - 1);
      formula = `=${func}(${startLetter}1:${endLetter}1)`;
    }
    setCellData(activeCell, { f: formula });
    toast(`Inserted ${func} formula`, 'success');
  };

  // Clear Handlers
  const handleClearAll = () => {
    if (selectionBounds) {
      const refs: string[] = [];
      for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
        for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
          refs.push(`r_${r}_c_${c}`);
        }
      }
      useSheetStore.getState().clearRange(refs);
      toast(`Cleared ${refs.length} cells`, 'info');
    } else if (activeCell) {
      useSheetStore.getState().clearCell(activeCell);
      toast('Cleared cell', 'info');
    }
    setShowClearMenu(false);
  };

  const handleClearFormats = () => {
    if (selectionBounds) {
      const refs: string[] = [];
      for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
        for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
          refs.push(`r_${r}_c_${c}`);
        }
      }
      useSheetStore.getState().clearRangeFormats(refs);
      toast(`Cleared formats for ${refs.length} cells`, 'info');
    } else if (activeCell) {
      useSheetStore.getState().clearCellFormats(activeCell);
      toast('Cleared cell formats', 'info');
    }
    setShowClearMenu(false);
  };

  const handleClearContents = () => {
    if (selectionBounds) {
      const refs: string[] = [];
      for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
        for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
          refs.push(`r_${r}_c_${c}`);
        }
      }
      useSheetStore.getState().clearRangeContents(refs);
      toast(`Cleared contents for ${refs.length} cells`, 'info');
    } else if (activeCell) {
      setCellData(activeCell, { v: undefined, f: undefined });
      toast('Cleared cell contents', 'info');
    }
    setShowClearMenu(false);
  };

  // Merge / Unmerge Toggle
  const handleToggleMerge = () => {
    if (isCurrentMerged && activeCell) {
      unmergeCell(activeCell);
      return;
    }
    if (selectionBounds) {
      const refs: string[] = [];
      for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
        for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
          refs.push(`r_${r}_c_${c}`);
        }
      }
      mergeCell(refs);
    } else {
      toast('Select 2 or more cells to merge', 'warning');
    }
  };

  const tabs: { id: RibbonTab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'insert', label: 'Insert' },
    { id: 'formulas', label: 'Formulas' },
    { id: 'data', label: 'Data' },
    { id: 'view', label: 'View' },
    { id: 'ai', label: '✨ Dora AI' }
  ];

  return (
    <div className="flex flex-col border-b border-border bg-surface select-none shadow-sm transition-all">
      {/* --- RIBBON TABS BAR --- */}
      <div className="flex items-center px-2 bg-background border-b border-border/60 gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isAI = tab.id === 'ai';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-md transition-all relative whitespace-nowrap
                ${isActive 
                  ? isAI 
                    ? 'bg-surface text-accent shadow-sm border-t-2 border-accent font-bold' 
                    : 'bg-surface text-textMain shadow-sm border-t-2 border-accent' 
                  : isAI
                    ? 'text-accent hover:bg-accent/10 hover:text-accent font-medium'
                    : 'text-textMuted hover:text-textMain hover:bg-surfaceHover/50 font-medium'
                }
              `}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-surface" />
              )}
            </button>
          );
        })}
      </div>

      {/* --- RIBBON COMMANDS PANEL --- */}
      <div className="flex items-stretch px-3 py-1.5 gap-2 overflow-x-auto no-scrollbar min-h-[64px] bg-surface">
        
        {/* ========================================================= */}
        {/* TAB 1: HOME                                               */}
        {/* ========================================================= */}
        {activeTab === 'home' && (
          <>
            {/* Clipboard Group */}
            <div className="flex items-center gap-1 border-r border-border/80 pr-2.5 relative">
              {/* Paste Button with Split Dropdown */}
              <div className="flex flex-col items-center">
                <div className="flex items-stretch rounded hover:bg-surfaceHover">
                  <button 
                    onClick={handlePaste}
                    className="flex flex-col items-center justify-center px-1.5 py-1 text-textMuted hover:text-textMain transition-all active:scale-95 group" 
                    title="Paste (Ctrl+V)"
                  >
                    <Clipboard size={17} className="text-accent group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-medium mt-0.5">Paste</span>
                  </button>
                  <button 
                    onClick={() => setShowPasteSpecialMenu(prev => !prev)}
                    className="px-0.5 hover:bg-surfaceHover text-textMuted hover:text-textMain flex items-center justify-center border-l border-border/40"
                    title="Paste Special Options"
                  >
                    <ChevronDown size={11} />
                  </button>
                </div>

                {/* Paste Special Dropdown */}
                {showPasteSpecialMenu && (
                  <div 
                    className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[180px] flex flex-col backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setShowPasteSpecialMenu(false)}
                  >
                    <button 
                      onClick={() => { pasteSpecial('values'); setShowPasteSpecialMenu(false); }}
                      className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                    >
                      <span>🔢</span> Paste Values Only
                    </button>
                    <button 
                      onClick={() => { pasteSpecial('formulas'); setShowPasteSpecialMenu(false); }}
                      className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                    >
                      <span>ƒx</span> Paste Formulas Only
                    </button>
                    <button 
                      onClick={() => { pasteSpecial('formats'); setShowPasteSpecialMenu(false); }}
                      className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                    >
                      <span>🎨</span> Paste Formats Only
                    </button>
                    <button 
                      onClick={() => { pasteSpecial('transpose'); setShowPasteSpecialMenu(false); }}
                      className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                    >
                      <span>⇄</span> Paste Transpose (Flip)
                    </button>
                    <button 
                      onClick={() => { pasteSpecial('add'); setShowPasteSpecialMenu(false); }}
                      className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                    >
                      <span>➕</span> Paste Add
                    </button>
                    <button 
                      onClick={() => { pasteSpecial('subtract'); setShowPasteSpecialMenu(false); }}
                      className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover flex items-center gap-2 text-textMain"
                    >
                      <span>➖</span> Paste Subtract
                    </button>
                  </div>
                )}
              </div>

              {/* Cut, Copy, Format Painter */}
              <div className="flex flex-col gap-0.5">
                <button 
                  onClick={handleCut}
                  className="p-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain flex items-center gap-1.5 text-xs" 
                  title="Cut (Ctrl+X)"
                >
                  <Scissors size={12} />
                  <span className="text-[10px]">Cut</span>
                </button>
                <button 
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain flex items-center gap-1.5 text-xs" 
                  title="Copy (Ctrl+C)"
                >
                  <Copy size={12} />
                  <span className="text-[10px]">Copy</span>
                </button>
              </div>

              {/* Format Painter */}
              <button 
                onClick={() => {
                  if (formatPainter.active) {
                    deactivateFormatPainter();
                    toast('Format Painter disabled', 'info');
                  } else {
                    const srcCell = activeCell ? data[activeCell] : null;
                    const fmt = srcCell?.fmt || {};
                    activateFormatPainter(fmt, false);
                    toast('Format Painter active (Click target cell/range)', 'info');
                  }
                }}
                onDoubleClick={() => {
                  const srcCell = activeCell ? data[activeCell] : null;
                  const fmt = srcCell?.fmt || {};
                  activateFormatPainter(fmt, true);
                  toast('Format Painter LOCKED (Double-click mode. Press Esc to stop)', 'success');
                }}
                className={`p-1.5 rounded flex flex-col items-center justify-center transition-all ${
                  formatPainter.active 
                    ? 'bg-accent/20 text-accent border border-accent ring-2 ring-accent/30 shadow-md font-bold' 
                    : 'hover:bg-surfaceHover text-textMuted hover:text-textMain'
                }`}
                title="Format Painter (Click once for 1-time apply, Double-click to lock across multiple cells)"
              >
                <Paintbrush size={14} className={formatPainter.active ? 'animate-bounce text-accent' : ''} />
                <span className="text-[9px] mt-0.5">Format</span>
              </button>
            </div>

            {/* Font & Style Group */}
            <div className="flex items-center gap-1 border-r border-border/80 pr-2.5">
              <div className="flex flex-col gap-1">
                {/* Font Selector & Size */}
                <div className="flex items-center gap-1">
                  <select 
                    value={currentFmt.fontFamily || 'Inter'}
                    onChange={(e) => setFormat('fontFamily', e.target.value)}
                    className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-textMain outline-none hover:border-accent/50 transition-colors w-24"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Outfit">Outfit</option>
                    <option value="Courier New">Monospace</option>
                    <option value="Georgia">Serif</option>
                  </select>

                  <select 
                    value={currentFmt.fontSize || 13}
                    onChange={(e) => setFormat('fontSize', parseInt(e.target.value, 10))}
                    className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-textMain outline-none hover:border-accent/50 transition-colors w-14"
                  >
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="18">18</option>
                    <option value="24">24</option>
                    <option value="32">32</option>
                  </select>
                </div>

                {/* Bold, Italic, Strikethrough, Underline, Colors, Border */}
                <div className="flex items-center gap-0.5 relative">
                  <button 
                    onClick={() => toggleFormat('bold')} 
                    className={`p-1 rounded transition-all ${currentFmt.bold ? 'bg-accent/20 text-accent font-black shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Bold (Ctrl+B)"
                  >
                    <Bold size={14} />
                  </button>
                  <button 
                    onClick={() => toggleFormat('italic')} 
                    className={`p-1 rounded transition-all ${currentFmt.italic ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Italic (Ctrl+I)"
                  >
                    <Italic size={14} />
                  </button>
                  <button 
                    onClick={() => toggleFormat('strikethrough')} 
                    className={`p-1 rounded transition-all ${currentFmt.strikethrough ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Strikethrough"
                  >
                    <Strikethrough size={14} />
                  </button>
                  <button 
                    onClick={() => toggleFormat('underline')} 
                    className={`p-1 rounded transition-all ${currentFmt.underline ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Underline (Ctrl+U)"
                  >
                    <Underline size={14} />
                  </button>

                  <div className="w-[1px] h-3.5 bg-border mx-0.5" />

                  {/* Text Color Picker */}
                  <button 
                    onClick={() => textColorRef.current?.click()} 
                    className="p-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain transition-all relative flex flex-col items-center" 
                    title="Text Color"
                  >
                    <Type size={14} style={{ color: currentFmt.color || 'inherit' }} />
                    <div className="w-3.5 h-[2px] rounded-full mt-0.5" style={{ backgroundColor: currentFmt.color || 'currentColor' }} />
                  </button>
                  <input ref={textColorRef} type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => setFormat('color', e.target.value)} />

                  {/* Fill Color Picker */}
                  <button 
                    onClick={() => bgColorRef.current?.click()} 
                    className="p-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain transition-all relative flex flex-col items-center" 
                    title="Fill Color"
                  >
                    <PaintBucket size={14} />
                    <div className="w-3.5 h-[2px] rounded-full mt-0.5" style={{ backgroundColor: currentFmt.backgroundColor || 'transparent' }} />
                  </button>
                  <input ref={bgColorRef} type="color" className="absolute opacity-0 w-0 h-0" onChange={(e) => setFormat('backgroundColor', e.target.value)} />

                  {/* Cell Border Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowBorderMenu(prev => !prev)} 
                      className={`p-1 rounded transition-all ${currentFmt.border && currentFmt.border !== 'none' ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                      title="Borders"
                    >
                      <GridIcon size={14} />
                    </button>
                    {showBorderMenu && (
                      <div 
                        className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[140px] flex flex-col backdrop-blur-md"
                        onMouseLeave={() => setShowBorderMenu(false)}
                      >
                        <button onClick={() => { setFormat('border', 'all'); setShowBorderMenu(false); }} className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain">All Borders</button>
                        <button onClick={() => { setFormat('border', 'outer'); setShowBorderMenu(false); }} className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain">Outside Borders</button>
                        <button onClick={() => { setFormat('border', 'bottom'); setShowBorderMenu(false); }} className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain">Bottom Border</button>
                        <button onClick={() => { setFormat('border', 'top'); setShowBorderMenu(false); }} className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain">Top Border</button>
                        <button onClick={() => { setFormat('border', 'none'); setShowBorderMenu(false); }} className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain">No Borders</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Alignment & Merge Group */}
            <div className="flex items-center gap-1 border-r border-border/80 pr-2.5">
              <div className="flex flex-col gap-1">
                {/* Horizontal & Vertical Alignment */}
                <div className="flex items-center gap-0.5">
                  {/* Horizontal */}
                  <button 
                    onClick={() => setFormat('align', 'left')} 
                    className={`p-1 rounded transition-all ${currentFmt.align === 'left' || !currentFmt.align ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Align Left"
                  >
                    <AlignLeft size={13} />
                  </button>
                  <button 
                    onClick={() => setFormat('align', 'center')} 
                    className={`p-1 rounded transition-all ${currentFmt.align === 'center' ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Align Center"
                  >
                    <AlignCenter size={13} />
                  </button>
                  <button 
                    onClick={() => setFormat('align', 'right')} 
                    className={`p-1 rounded transition-all ${currentFmt.align === 'right' ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Align Right"
                  >
                    <AlignRight size={13} />
                  </button>

                  <div className="w-[1px] h-3.5 bg-border mx-0.5" />

                  {/* Vertical Alignment Buttons */}
                  <button 
                    onClick={() => setFormat('verticalAlign', 'top')} 
                    className={`p-1 rounded transition-all ${currentFmt.verticalAlign === 'top' ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Vertical Align Top"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="3" x2="21" y2="3" />
                      <path d="M12 7v14M8 11l4-4 4 4" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setFormat('verticalAlign', 'middle')} 
                    className={`p-1 rounded transition-all ${currentFmt.verticalAlign === 'middle' || !currentFmt.verticalAlign ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Vertical Align Middle"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <path d="M8 8l4 4 4-4M8 16l4-4 4 4" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setFormat('verticalAlign', 'bottom')} 
                    className={`p-1 rounded transition-all ${currentFmt.verticalAlign === 'bottom' ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`} 
                    title="Vertical Align Bottom"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="21" x2="21" y2="21" />
                      <path d="M12 3v14M8 13l4 4 4-4" />
                    </svg>
                  </button>
                </div>

                {/* Wrap Text & Merge Cells */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      const isSet = currentFmt.wrapText;
                      applyToSelection((ref) => {
                        setCellFormat(ref, { wrapText: !isSet });
                      });
                      setTimeout(() => {
                        if (selectionBounds) {
                          for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
                            useSheetStore.getState().autoFitRow(r);
                          }
                        } else if (activeCell) {
                          const r = parseInt(activeCell.split('_')[1], 10);
                          useSheetStore.getState().autoFitRow(r);
                        }
                      }, 50);
                      toast(!isSet ? 'Wrap Text Enabled' : 'Wrap Text Disabled', 'info');
                    }} 
                    className={`px-1.5 py-0.5 rounded flex items-center justify-center gap-1 text-[10px] font-medium transition-all ${currentFmt.wrapText ? 'bg-accent/20 text-accent shadow-inner' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}
                    title="Wrap Text"
                  >
                    <WrapText size={12} />
                    <span>Wrap</span>
                  </button>

                  <button 
                    onClick={handleToggleMerge}
                    className={`px-1.5 py-0.5 rounded flex items-center justify-center gap-1 text-[10px] font-medium transition-all ${
                      isCurrentMerged 
                        ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30' 
                        : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'
                    }`}
                    title={isCurrentMerged ? "Unmerge Cells" : "Merge & Center selected cells"}
                  >
                    {isCurrentMerged ? <Split size={12} /> : <Combine size={12} />}
                    <span>{isCurrentMerged ? "Unmerge" : "Merge"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Number Formatting Group */}
            <div className="flex items-center gap-1 border-r border-border/80 pr-2.5">
              <div className="flex flex-col gap-1">
                <select 
                  value={currentFmt.numFmt || 'general'}
                  onChange={(e) => setFormat('numFmt', e.target.value as CellFormat['numFmt'])}
                  className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-textMain outline-none hover:border-accent/50 transition-colors w-28"
                >
                  <option value="general">General</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency ($)</option>
                  <option value="percent">Percentage (%)</option>
                  <option value="date">Date</option>
                </select>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setFormat('numFmt', currentFmt.numFmt === 'currency' ? 'general' : 'currency')}
                    className={`p-1 rounded text-xs transition-all ${currentFmt.numFmt === 'currency' ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}
                    title="Format as Currency ($)"
                  >
                    <DollarSign size={13} />
                  </button>
                  <button 
                    onClick={() => setFormat('numFmt', currentFmt.numFmt === 'percent' ? 'general' : 'percent')}
                    className={`p-1 rounded text-xs transition-all ${currentFmt.numFmt === 'percent' ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}
                    title="Format as Percent (%)"
                  >
                    <Percent size={13} />
                  </button>
                  <button 
                    onClick={() => setFormat('decimals', Math.min(6, (currentFmt.decimals || 2) + 1))}
                    className="p-1 rounded text-xs text-textMuted hover:bg-surfaceHover hover:text-textMain flex items-center"
                    title="Increase Decimals"
                  >
                    <Plus size={11} />
                    <span className="text-[9px] font-mono">.0</span>
                  </button>
                  <button 
                    onClick={() => setFormat('decimals', Math.max(0, (currentFmt.decimals || 2) - 1))}
                    className="p-1 rounded text-xs text-textMuted hover:bg-surfaceHover hover:text-textMain flex items-center"
                    title="Decrease Decimals"
                  >
                    <Minus size={11} />
                    <span className="text-[9px] font-mono">.0</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cells & Format Group (Insert/Delete + AutoFit) */}
            <div className="flex items-center gap-1 border-r border-border/80 pr-2.5">
              <div className="flex flex-col gap-0.5">
                <button 
                  onClick={() => useSheetStore.getState().insertRowAbove()}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-surfaceHover hover:text-textMain flex items-center gap-1"
                  title="Insert Row Above"
                >
                  <ArrowUpCircle size={12} className="text-emerald-400" />
                  <span>+ Row</span>
                </button>
                <button 
                  onClick={() => useSheetStore.getState().insertColumnRight()}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-surfaceHover hover:text-textMain flex items-center gap-1"
                  title="Insert Column Right"
                >
                  <ArrowRightCircle size={12} className="text-emerald-400" />
                  <span>+ Col</span>
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                <button 
                  onClick={() => useSheetStore.getState().deleteRow()}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-rose-500/10 hover:text-rose-400 flex items-center gap-1"
                  title="Delete Row"
                >
                  <Trash2 size={12} className="text-rose-400" />
                  <span>- Row</span>
                </button>
                <button 
                  onClick={() => useSheetStore.getState().deleteColumn()}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-rose-500/10 hover:text-rose-400 flex items-center gap-1"
                  title="Delete Column"
                >
                  <Trash2 size={12} className="text-rose-400" />
                  <span>- Col</span>
                </button>
              </div>

              <div className="w-[1px] h-6 bg-border/70 mx-0.5" />

              {/* AutoFit Commands */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    if (selectionBounds) {
                      for (let c = selectionBounds.minC; c <= selectionBounds.maxC; c++) {
                        useSheetStore.getState().autoFitColumn(c);
                      }
                    } else if (activeCell) {
                      const c = parseInt(activeCell.split('_')[3], 10);
                      useSheetStore.getState().autoFitColumn(c);
                    }
                    toast('AutoFit Column Width applied', 'info');
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-surfaceHover hover:text-accent flex items-center gap-1"
                  title="AutoFit Column Width based on content"
                >
                  <span>↔ AutoFit Col</span>
                </button>
                <button
                  onClick={() => {
                    if (selectionBounds) {
                      for (let r = selectionBounds.minR; r <= selectionBounds.maxR; r++) {
                        useSheetStore.getState().autoFitRow(r);
                      }
                    } else if (activeCell) {
                      const r = parseInt(activeCell.split('_')[1], 10);
                      useSheetStore.getState().autoFitRow(r);
                    }
                    toast('AutoFit Row Height applied', 'info');
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-surfaceHover hover:text-accent flex items-center gap-1"
                  title="AutoFit Row Height based on content"
                >
                  <span>↕ AutoFit Row</span>
                </button>
              </div>
            </div>

            {/* Editing, Fill, Clear & Find Group */}
            <div className="flex items-center gap-1.5">
              {/* AutoSum */}
              <button 
                onClick={() => insertAutoSum('SUM')}
                className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-accent transition-all group"
                title="AutoSum (SUM above or left)"
              >
                <Sigma size={16} className="text-accent group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-medium mt-0.5">AutoSum</span>
              </button>

              {/* Fill Down / Fill Right */}
              <div className="flex flex-col gap-0.5 border-r border-border/80 pr-2">
                <button 
                  onClick={() => useSheetStore.getState().fillDown()}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-surfaceHover hover:text-accent flex items-center gap-1"
                  title="Fill Down (Ctrl+D) - Copies top row/cell down across selection"
                >
                  <ArrowDown size={11} className="text-indigo-400" />
                  <span>Fill Down</span>
                </button>
                <button 
                  onClick={() => useSheetStore.getState().fillRight()}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-surfaceHover hover:text-accent flex items-center gap-1"
                  title="Fill Right (Ctrl+R) - Copies leftmost col/cell right across selection"
                >
                  <ArrowRight size={11} className="text-indigo-400" />
                  <span>Fill Right</span>
                </button>
              </div>

              {/* Clear Dropdown & Find */}
              <div className="flex flex-col gap-0.5 relative">
                <div className="relative">
                  <button 
                    onClick={() => setShowClearMenu(prev => !prev)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium text-textMuted hover:bg-surfaceHover hover:text-rose-400 flex items-center gap-1"
                    title="Clear Options"
                  >
                    <Eraser size={12} />
                    <span>Clear</span>
                    <ChevronDown size={10} />
                  </button>

                  {showClearMenu && (
                    <div 
                      className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[150px] flex flex-col backdrop-blur-md animate-in fade-in duration-100"
                      onMouseLeave={() => setShowClearMenu(false)}
                    >
                      <button 
                        onClick={handleClearAll}
                        className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-rose-400 flex items-center gap-1.5"
                      >
                        <Trash2 size={12} /> Clear All
                      </button>
                      <button 
                        onClick={handleClearFormats}
                        className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain flex items-center gap-1.5"
                      >
                        <Paintbrush size={12} /> Clear Formats Only
                      </button>
                      <button 
                        onClick={handleClearContents}
                        className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain flex items-center gap-1.5"
                      >
                        <Eraser size={12} /> Clear Contents Only
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setFindReplace({ isOpen: !findReplace.isOpen })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${findReplace.isOpen ? 'bg-accent/20 text-accent' : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'}`}
                  title="Find & Replace (Ctrl+F)"
                >
                  <Search size={12} />
                  <span>Find</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INSERT                                             */}
        {/* ========================================================= */}
        {activeTab === 'insert' && (
          <div className="flex items-center gap-3">
            {/* Charts Group */}
            <div className="flex items-center gap-1.5 border-r border-border/80 pr-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-textMuted mr-1">Charts:</span>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-chart', { detail: { type: 'bar' } }));
                }}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-surfaceHover text-textMuted hover:text-accent transition-all group"
                title="Insert Interactive Bar Chart"
              >
                <BarChart3 size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] mt-0.5">Bar</span>
              </button>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-chart', { detail: { type: 'line' } }));
                }}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-surfaceHover text-textMuted hover:text-accent transition-all group"
                title="Insert Interactive Line Chart"
              >
                <LineChart size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] mt-0.5">Line</span>
              </button>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-chart', { detail: { type: 'pie' } }));
                }}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-surfaceHover text-textMuted hover:text-accent transition-all group"
                title="Insert Interactive Pie Chart"
              >
                <PieChart size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] mt-0.5">Pie</span>
              </button>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-chart', { detail: { type: 'area' } }));
                }}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-surfaceHover text-textMuted hover:text-accent transition-all group"
                title="Insert Interactive Area Chart"
              >
                <AreaChart size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] mt-0.5">Area</span>
              </button>
            </div>

            {/* Tables & Templates */}
            <div className="flex items-center gap-2 border-r border-border/80 pr-3">
              <button 
                onClick={onShowTemplates}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surfaceHover hover:bg-accent/20 text-textMain hover:text-accent text-xs font-semibold border border-border transition-all"
                title="Open Starter Templates"
              >
                <PlusSquare size={16} className="text-accent" />
                <span>Browse Templates</span>
              </button>

              <button 
                onClick={onShowDashboard}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surfaceHover hover:bg-accent/20 text-textMain hover:text-accent text-xs font-semibold border border-border transition-all"
                title="Open Cinematic Analytics Dashboard"
              >
                <LayoutDashboard size={16} className="text-emerald-400" />
                <span>Cinematic Dashboard</span>
              </button>
            </div>

            {/* Quick Insert Symbols & Data */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (activeCell) {
                    const todayStr = new Date().toLocaleDateString('en-US');
                    setCellData(activeCell, { v: todayStr });
                    toast('Inserted Date', 'info');
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-surfaceHover hover:bg-border text-textMuted hover:text-textMain text-xs font-medium transition-colors"
                title="Insert current date into active cell"
              >
                <Calendar size={13} className="text-sky-400" />
                <span>Date</span>
              </button>

              <button
                onClick={() => {
                  if (activeCell) {
                    const cur = data[activeCell]?.v;
                    const next = cur === '☑ Done' ? '☐ Pending' : '☑ Done';
                    setCellData(activeCell, { v: next });
                    toast(`Inserted ${next}`, 'info');
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-surfaceHover hover:bg-border text-textMuted hover:text-textMain text-xs font-medium transition-colors"
                title="Insert checkbox / status toggle"
              >
                <CheckSquare size={13} className="text-emerald-400" />
                <span>Status</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FORMULAS                                           */}
        {/* ========================================================= */}
        {activeTab === 'formulas' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* AutoSum Functions */}
            <div className="flex items-center gap-1 border-r border-border/80 pr-2.5">
              <button 
                onClick={() => insertAutoSum('SUM')}
                className="px-2.5 py-1 rounded bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold transition-all flex items-center gap-1.5"
                title="AutoSum"
              >
                <Sigma size={14} />
                <span>SUM</span>
              </button>
              <button 
                onClick={() => insertAutoSum('AVERAGE')}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium"
              >
                AVERAGE
              </button>
              <button 
                onClick={() => insertAutoSum('COUNT')}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium"
              >
                COUNT
              </button>
              <button 
                onClick={() => insertAutoSum('MAX')}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium"
              >
                MAX
              </button>
              <button 
                onClick={() => insertAutoSum('MIN')}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium"
              >
                MIN
              </button>
            </div>

            {/* Logical & Lookups */}
            <div className="flex items-center gap-1 border-r border-border/80 pr-2.5">
              <button 
                onClick={() => {
                  if (activeCell) setCellData(activeCell, { f: `=IF(${getActiveCoordString()}>0, "Yes", "No")` });
                  toast('Inserted IF formula', 'info');
                }}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium flex items-center gap-1"
                title="Insert IF conditional formula"
              >
                <FunctionSquare size={13} className="text-amber-400" />
                <span>IF</span>
              </button>
              <button 
                onClick={() => {
                  if (activeCell) setCellData(activeCell, { f: `=IFERROR(${getActiveCoordString()}, 0)` });
                  toast('Inserted IFERROR formula', 'info');
                }}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium flex items-center gap-1"
                title="Insert IFERROR fallback formula"
              >
                <span>IFERROR</span>
              </button>
              <button 
                onClick={() => {
                  if (activeCell) setCellData(activeCell, { f: `=VLOOKUP(${getActiveCoordString()}, A1:D20, 2, FALSE)` });
                  toast('Inserted VLOOKUP formula', 'info');
                }}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium flex items-center gap-1"
                title="Insert VLOOKUP formula"
              >
                <Search size={13} className="text-sky-400" />
                <span>VLOOKUP</span>
              </button>
              <button 
                onClick={() => {
                  if (activeCell) setCellData(activeCell, { f: `=XLOOKUP(${getActiveCoordString()}, A1:A20, B1:B20)` });
                  toast('Inserted XLOOKUP formula', 'info');
                }}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium flex items-center gap-1"
                title="Insert modern XLOOKUP formula"
              >
                <span>XLOOKUP</span>
              </button>
            </div>

            {/* Text & Date Formulas */}
            <div className="flex items-center gap-1 border-r border-border/80 pr-2.5">
              <button 
                onClick={() => {
                  if (activeCell) setCellData(activeCell, { f: `=CONCATENATE(${getActiveCoordString()}, " ", "Total")` });
                  toast('Inserted CONCAT formula', 'info');
                }}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium flex items-center gap-1"
              >
                <Type size={13} className="text-emerald-400" />
                <span>CONCAT</span>
              </button>
              <button 
                onClick={() => {
                  if (activeCell) setCellData(activeCell, { f: `=TRIM(${getActiveCoordString()})` });
                  toast('Inserted TRIM formula', 'info');
                }}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium"
              >
                TRIM
              </button>
              <button 
                onClick={() => {
                  if (activeCell) setCellData(activeCell, { f: `=TODAY()` });
                  toast('Inserted TODAY() formula', 'info');
                }}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium"
              >
                TODAY
              </button>
              <button 
                onClick={() => {
                  if (activeCell) setCellData(activeCell, { f: `=ROUND(${getActiveCoordString()}, 2)` });
                  toast('Inserted ROUND formula', 'info');
                }}
                className="px-2 py-1 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium"
              >
                ROUND
              </button>
            </div>

            {/* Smart Calculator */}
            <button 
              onClick={() => onShowCalculator ? onShowCalculator() : toast('Spreadsheet formulas up-to-date', 'success')}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-surfaceHover hover:bg-accent/20 text-textMain hover:text-accent text-xs font-semibold transition-colors"
              title="Open Smart Calculator (Alt+C)"
            >
              <Calculator size={14} className="text-accent" />
              <span>Calculator</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: DATA                                               */}
        {/* ========================================================= */}
        {activeTab === 'data' && (
          <div className="flex items-center gap-3">
            {/* Sort & Filter (Column Auto-Detected!) */}
            <div className="flex items-center gap-1.5 border-r border-border/80 pr-3">
              <button 
                onClick={() => {
                  const col = activeCell ? parseRef(activeCell).c : 0;
                  useSheetStore.getState().sortAZ(col);
                  toast(`Sorted Column ${getColName(col)} Ascending (A-Z)`, 'success');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium transition-colors"
                title="Sort selected column A to Z"
              >
                <ArrowDownAZ size={16} className="text-accent" />
                <span>Sort A-Z</span>
              </button>

              <button 
                onClick={() => {
                  const col = activeCell ? parseRef(activeCell).c : 0;
                  useSheetStore.getState().sortZA(col);
                  toast(`Sorted Column ${getColName(col)} Descending (Z-A)`, 'success');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium transition-colors"
                title="Sort selected column Z to A"
              >
                <ArrowUpZA size={16} className="text-accent" />
                <span>Sort Z-A</span>
              </button>

              <button 
                onClick={() => {
                  const col = activeCell ? parseRef(activeCell).c : 0;
                  useSheetStore.getState().toggleFilter(col);
                  toast(`Filter toggled on Column ${getColName(col)}`, 'info');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium transition-colors"
                title="Toggle filter on selected column"
              >
                <Filter size={15} className="text-emerald-400" />
                <span>Filter</span>
              </button>
            </div>

            {/* Data Tools: Remove Duplicates, Clean Blanks, Fill */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => useSheetStore.getState().removeDuplicates()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-rose-400 text-xs font-medium transition-colors"
                title="Remove Duplicate Rows across selection or sheet"
              >
                <Layers size={14} className="text-amber-400" />
                <span>Remove Duplicates</span>
              </button>

              <button 
                onClick={() => {
                  const cells = useSheetStore.getState().data;
                  let count = 0;
                  Object.entries(cells).forEach(([ref, cell]) => {
                    if (cell.v === '' || cell.v === null) {
                      useSheetStore.getState().clearCell(ref);
                      count++;
                    }
                  });
                  toast(`Cleaned ${count} blank cells`, 'success');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium transition-colors"
                title="Remove empty and whitespace cells"
              >
                <SlidersHorizontal size={14} />
                <span>Clean Blanks</span>
              </button>

              <div className="w-[1px] h-6 bg-border/70 mx-1" />

              <button 
                onClick={() => useSheetStore.getState().fillDown()}
                className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-accent text-xs font-medium transition-colors"
                title="Fill Down (Ctrl+D)"
              >
                <ArrowDown size={13} className="text-indigo-400" />
                <span>Fill Down</span>
              </button>

              <button 
                onClick={() => useSheetStore.getState().fillRight()}
                className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-accent text-xs font-medium transition-colors"
                title="Fill Right (Ctrl+R)"
              >
                <ArrowRight size={13} className="text-indigo-400" />
                <span>Fill Right</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: VIEW                                               */}
        {/* ========================================================= */}
        {activeTab === 'view' && (
          <div className="flex items-center gap-3">
            {/* Show / Hide */}
            <div className="flex items-center gap-3 border-r border-border/80 pr-3">
              <label className="flex items-center gap-1.5 text-xs text-textMuted hover:text-textMain cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showGridlines} 
                  onChange={(e) => setShowGridlines(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent accent-accent" 
                />
                <span>Gridlines</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-textMuted hover:text-textMain cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showHeaders} 
                  onChange={(e) => setShowHeaders(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent accent-accent" 
                />
                <span>Headers</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-textMuted hover:text-textMain cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showFormulaBar} 
                  onChange={(e) => setShowFormulaBar(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent accent-accent" 
                />
                <span>Formula Bar</span>
              </label>
            </div>

            {/* Freeze Panes Group */}
            <div className="flex items-center gap-1.5 border-r border-border/80 pr-3 relative">
              <button 
                onClick={() => setShowFreezeMenu(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  freezeRow > 0 || freezeCol > 0 
                    ? 'bg-accent/20 text-accent border border-accent/40 font-bold' 
                    : 'hover:bg-surfaceHover text-textMuted hover:text-textMain'
                }`}
                title="Freeze Panes (Keep rows and columns visible while scrolling)"
              >
                <Snowflake size={15} className={freezeRow > 0 || freezeCol > 0 ? "text-accent animate-spin-slow" : "text-sky-400"} />
                <span>Freeze Panes</span>
                <ChevronDown size={11} />
              </button>

              {showFreezeMenu && (
                <div 
                  className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[170px] flex flex-col backdrop-blur-md animate-in fade-in duration-100"
                  onMouseLeave={() => setShowFreezeMenu(false)}
                >
                  <button 
                    onClick={() => {
                      setFreezeRow(1);
                      setShowFreezeMenu(false);
                      toast('Frozen Top Row (Row 1)', 'success');
                    }}
                    className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain flex items-center justify-between"
                  >
                    <span>Freeze Top Row</span>
                    {freezeRow === 1 && <span className="text-accent text-[10px] font-bold">ACTIVE</span>}
                  </button>
                  <button 
                    onClick={() => {
                      setFreezeCol(1);
                      setShowFreezeMenu(false);
                      toast('Frozen First Column (Col A)', 'success');
                    }}
                    className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-textMain flex items-center justify-between"
                  >
                    <span>Freeze First Column</span>
                    {freezeCol === 1 && <span className="text-accent text-[10px] font-bold">ACTIVE</span>}
                  </button>
                  <button 
                    onClick={() => {
                      setFreezeRow(0);
                      setFreezeCol(0);
                      setShowFreezeMenu(false);
                      toast('Unfrozen all panes', 'info');
                    }}
                    className="px-3 py-1.5 text-xs text-left hover:bg-surfaceHover text-rose-400 border-t border-border/40"
                  >
                    Unfreeze All Panes
                  </button>
                </div>
              )}
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1.5 border-r border-border/80 pr-3">
              <button 
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                className="p-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span className="text-xs font-mono font-semibold px-1 min-w-[40px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button 
                onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
                className="p-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button 
                onClick={() => setZoomLevel(1)}
                className="px-2 py-0.5 rounded text-[10px] hover:bg-surfaceHover text-textMuted hover:text-textMain font-medium"
                title="Reset Zoom"
              >
                100%
              </button>
            </div>

            {/* Fullscreen */}
            <button 
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => toast('Fullscreen not available', 'warning'));
                } else {
                  document.exitFullscreen();
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-surfaceHover text-textMuted hover:text-textMain text-xs font-medium"
            >
              <Maximize size={15} />
              <span>Fullscreen</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: DORA AI                                            */}
        {/* ========================================================= */}
        {activeTab === 'ai' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={onToggleAI}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-accent to-indigo-600 text-white font-semibold text-xs shadow-md shadow-accent/25 hover:shadow-accent/40 active:scale-95 transition-all"
            >
              <Bot size={15} className="animate-pulse" />
              <span>Open Dora AI Assistant</span>
            </button>

            <button 
              onClick={() => {
                onToggleAI();
                toast('Ask Dora AI: "Write a formula to calculate monthly totals"', 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceHover hover:bg-accent/20 text-textMain hover:text-accent border border-border text-xs font-medium transition-all"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Formula Copilot</span>
            </button>

            <button 
              onClick={() => {
                onToggleAI();
                toast('Ask Dora AI: "Analyze trends and highlight top performers"', 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceHover hover:bg-accent/20 text-textMain hover:text-accent border border-border text-xs font-medium transition-all"
            >
              <BarChart3 size={14} className="text-emerald-400" />
              <span>Analyze Trends</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
