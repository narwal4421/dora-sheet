import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  Calculator, X, Copy, ArrowDownToLine, Maximize2, Minimize2, 
  History, RotateCcw, Sparkles, Check
} from 'lucide-react';
import { useSheetStore } from '../../store/useSheetStore';
import { socketService } from '../../services/socket.service';
import { toast } from '../../store/useToastStore';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

export const CalculatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = memo(({ isOpen, onClose }) => {
  const [display, setDisplay] = useState<string>('0');
  const [expression, setExpression] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [inserted, setInserted] = useState<boolean>(false);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [lastOperator, setLastOperator] = useState<string | null>(null);
  const [prevValue, setPrevValue] = useState<number | null>(null);

  // 120 FPS Zero-Latency Hardware-Accelerated Dragging
  const posRef = useRef<{ x: number; y: number }>({ x: 80, y: 100 });
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startPosX: number; startPosY: number; rafId: number | null }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosX: 80,
    startPosY: 100,
    rafId: null
  });
  const modalRef = useRef<HTMLDivElement>(null);

  const activeCell = useSheetStore(state => state.activeCell);

  // Convert ref e.g. "r_0_c_0" to A1 notation
  const activeCellA1 = React.useMemo(() => {
    if (!activeCell) return 'A1';
    const match = activeCell.match(/r_(\d+)_c_(\d+)/);
    if (!match) return 'A1';
    const row = parseInt(match[1], 10) + 1;
    const col = parseInt(match[2], 10);
    
    let colName = '';
    let temp = col;
    while (temp >= 0) {
      colName = String.fromCharCode((temp % 26) + 65) + colName;
      temp = Math.floor(temp / 26) - 1;
    }
    return `${colName}${row}`;
  }, [activeCell]);

  // Apply initial position on mount
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
    }
  }, [isOpen]);

  // Zero-Latency Mouse & Touch Dragging via requestAnimationFrame
  const handleStartDrag = (clientX: number, clientY: number) => {
    dragRef.current.isDragging = true;
    dragRef.current.startX = clientX;
    dragRef.current.startY = clientY;
    dragRef.current.startPosX = posRef.current.x;
    dragRef.current.startPosY = posRef.current.y;
    if (modalRef.current) {
      modalRef.current.style.willChange = 'transform';
      modalRef.current.style.transition = 'none';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    if (e.touches.length > 0) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const updatePosition = (clientX: number, clientY: number) => {
      if (!dragRef.current.isDragging) return;

      if (dragRef.current.rafId) {
        cancelAnimationFrame(dragRef.current.rafId);
      }

      dragRef.current.rafId = requestAnimationFrame(() => {
        const dx = clientX - dragRef.current.startX;
        const dy = clientY - dragRef.current.startY;
        const targetWidth = isExpanded ? 540 : 320;
        const newX = Math.max(8, Math.min(window.innerWidth - targetWidth - 8, dragRef.current.startPosX + dx));
        const newY = Math.max(8, Math.min(window.innerHeight - 380, dragRef.current.startPosY + dy));
        
        posRef.current = { x: newX, y: newY };
        if (modalRef.current) {
          modalRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current.isDragging) updatePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (dragRef.current.isDragging && e.touches.length > 0) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEndDrag = () => {
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false;
        if (dragRef.current.rafId) cancelAnimationFrame(dragRef.current.rafId);
        if (modalRef.current) {
          modalRef.current.style.willChange = 'auto';
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleEndDrag, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEndDrag, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
      if (dragRef.current.rafId) cancelAnimationFrame(dragRef.current.rafId);
    };
  }, [isExpanded]);

  // Calculator Logic
  const inputDigit = useCallback((digit: string) => {
    setDisplay(prev => {
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return digit;
      }
      return prev === '0' ? digit : prev + digit;
    });
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    setDisplay(prev => {
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return '0.';
      }
      return prev.includes('.') ? prev : prev + '.';
    });
  }, [waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setPrevValue(null);
    setLastOperator(null);
    setWaitingForOperand(false);
  }, []);

  const backspace = useCallback(() => {
    setDisplay(prev => {
      if (waitingForOperand) return prev;
      return prev.length > 1 ? prev.slice(0, -1) : '0';
    });
  }, [waitingForOperand]);

  const toggleSign = useCallback(() => {
    setDisplay(prev => {
      const val = parseFloat(prev);
      return String(-val);
    });
  }, []);

  const performOperation = useCallback((nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setExpression(`${inputValue} ${nextOperator}`);
    } else if (lastOperator) {
      const currentValue = prevValue || 0;
      let result = currentValue;

      if (lastOperator === '+') result = currentValue + inputValue;
      else if (lastOperator === '−' || lastOperator === '-') result = currentValue - inputValue;
      else if (lastOperator === '×' || lastOperator === '*') result = currentValue * inputValue;
      else if (lastOperator === '÷' || lastOperator === '/') result = inputValue !== 0 ? currentValue / inputValue : 0;
      else if (lastOperator === '^') result = Math.pow(currentValue, inputValue);

      const formattedResult = Number(result.toFixed(8));
      setDisplay(String(formattedResult));
      setPrevValue(formattedResult);
      setExpression(`${formattedResult} ${nextOperator}`);
    }

    setWaitingForOperand(true);
    setLastOperator(nextOperator);
  }, [display, prevValue, lastOperator]);

  const calculateEquals = useCallback(() => {
    if (!lastOperator || prevValue === null) return;
    const inputValue = parseFloat(display);
    let result = prevValue;

    if (lastOperator === '+') result = prevValue + inputValue;
    else if (lastOperator === '−' || lastOperator === '-') result = prevValue - inputValue;
    else if (lastOperator === '×' || lastOperator === '*') result = prevValue * inputValue;
    else if (lastOperator === '÷' || lastOperator === '/') result = inputValue !== 0 ? prevValue / inputValue : 0;
    else if (lastOperator === '^') result = Math.pow(prevValue, inputValue);

    const formattedResult = Number(result.toFixed(8));
    const fullExpr = `${prevValue} ${lastOperator} ${inputValue} =`;
    
    setHistory(prev => [
      { id: Date.now().toString(), expression: fullExpr, result: String(formattedResult), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev.slice(0, 24)
    ]);

    setExpression(fullExpr);
    setDisplay(String(formattedResult));
    setPrevValue(null);
    setLastOperator(null);
    setWaitingForOperand(true);
  }, [display, prevValue, lastOperator]);

  // 1-Click Business Operations
  const applyTax = (percent: number) => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const taxAmount = val * (percent / 100);
    const total = Number((val + taxAmount).toFixed(4));
    setExpression(`${val} + ${percent}% Tax =`);
    setDisplay(String(total));
    setHistory(prev => [
      { id: Date.now().toString(), expression: `${val} + ${percent}% GST`, result: String(total), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev.slice(0, 24)
    ]);
    setWaitingForOperand(true);
  };

  const applyDiscount = (percent: number) => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const discAmount = val * (percent / 100);
    const total = Number((val - discAmount).toFixed(4));
    setExpression(`${val} - ${percent}% Disc =`);
    setDisplay(String(total));
    setHistory(prev => [
      { id: Date.now().toString(), expression: `${val} - ${percent}% Disc`, result: String(total), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev.slice(0, 24)
    ]);
    setWaitingForOperand(true);
  };

  const applyMargin = (marginPercent: number) => {
    const cost = parseFloat(display);
    if (isNaN(cost) || marginPercent >= 100) return;
    const sellingPrice = Number((cost / (1 - marginPercent / 100)).toFixed(4));
    setExpression(`Cost ${cost} @ ${marginPercent}% Margin =`);
    setDisplay(String(sellingPrice));
    setHistory(prev => [
      { id: Date.now().toString(), expression: `Cost ${cost} + ${marginPercent}% Margin`, result: String(sellingPrice), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev.slice(0, 24)
    ]);
    setWaitingForOperand(true);
  };

  const applyPercentage = () => {
    const val = parseFloat(display);
    const res = Number((val / 100).toFixed(8));
    setDisplay(String(res));
  };

  // Scientific Functions
  const applyScientific = (func: string) => {
    const val = parseFloat(display);
    let res = val;
    let expr = '';

    switch(func) {
      case 'sqrt':
        res = Math.sqrt(val);
        expr = `√(${val})`;
        break;
      case 'sqr':
        res = val * val;
        expr = `(${val})²`;
        break;
      case 'recip':
        res = val !== 0 ? 1 / val : 0;
        expr = `1/(${val})`;
        break;
      case 'pi':
        res = Math.PI;
        expr = 'π';
        break;
      case 'sin':
        res = Math.sin((val * Math.PI) / 180);
        expr = `sin(${val}°)`;
        break;
      case 'cos':
        res = Math.cos((val * Math.PI) / 180);
        expr = `cos(${val}°)`;
        break;
      case 'tan':
        res = Math.tan((val * Math.PI) / 180);
        expr = `tan(${val}°)`;
        break;
      case 'log':
        res = Math.log10(val);
        expr = `log(${val})`;
        break;
      case 'ln':
        res = Math.log(val);
        expr = `ln(${val})`;
        break;
      case 'abs':
        res = Math.abs(val);
        expr = `|${val}|`;
        break;
    }

    const formatted = Number(res.toFixed(8));
    setExpression(`${expr} =`);
    setDisplay(String(formatted));
    setHistory(prev => [
      { id: Date.now().toString(), expression: expr, result: String(formatted), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev.slice(0, 24)
    ]);
    setWaitingForOperand(true);
  };

  // Move sheet active cell (box) via WASD or Arrow keys
  const moveActiveCell = useCallback((dRow: number, dCol: number, isShift = false) => {
    const store = useSheetStore.getState();
    const currentRef = store.activeCell || 'r_0_c_0';
    const match = currentRef.match(/r_(\d+)_c_(\d+)/);
    if (!match) return;

    const curR = parseInt(match[1], 10);
    const curC = parseInt(match[2], 10);
    const nextR = Math.max(0, curR + dRow);
    const nextC = Math.max(0, curC + dCol);

    if (nextR >= store.rowCount - 5) store.expandRows(100);
    if (nextC >= store.colCount - 5) store.expandCols(26);

    const targetRef = `r_${nextR}_c_${nextC}`;
    if (isShift) {
      const start = store.selectionRange?.start || currentRef;
      store.setSelectionRange({ start, end: targetRef });
    } else {
      store.setActiveCell(targetRef);
      store.setSelectionRange({ start: targetRef, end: targetRef });
      socketService.emitCursorMove(store.localUserName, store.activeSheetId, nextR, nextC, '#6366f1');
    }
  }, []);

  // Calculate pending expression (if any) and insert directly into active cell (box)
  const handleCalculateAndInsert = useCallback((moveDown = false) => {
    let resultToInsert = display;

    // If an arithmetic calculation is pending, evaluate it first!
    if (lastOperator && prevValue !== null) {
      const inputValue = parseFloat(display);
      let result = prevValue;

      if (lastOperator === '+') result = prevValue + inputValue;
      else if (lastOperator === '−' || lastOperator === '-') result = prevValue - inputValue;
      else if (lastOperator === '×' || lastOperator === '*') result = prevValue * inputValue;
      else if (lastOperator === '÷' || lastOperator === '/') result = inputValue !== 0 ? prevValue / inputValue : 0;
      else if (lastOperator === '^') result = Math.pow(prevValue, inputValue);

      const formattedResult = Number(result.toFixed(8));
      const fullExpr = `${prevValue} ${lastOperator} ${inputValue} =`;
      resultToInsert = String(formattedResult);

      setHistory(prev => [
        { id: Date.now().toString(), expression: fullExpr, result: resultToInsert, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ...prev.slice(0, 24)
      ]);

      setExpression(fullExpr);
      setDisplay(resultToInsert);
      setPrevValue(null);
      setLastOperator(null);
    }
    // Ensure subsequent digit entry starts a fresh calculation
    setWaitingForOperand(true);

    // Insert calculated value into current cell (box)
    const store = useSheetStore.getState();
    const cellRef = store.activeCell;
    if (!cellRef) {
      toast('Please select a cell first', 'error');
      return;
    }

    const val = parseFloat(resultToInsert);
    const finalVal = isNaN(val) ? resultToInsert : val;

    store.setCellData(cellRef, { v: finalVal });
    socketService.emitCellUpdate(store.activeSheetId, cellRef, { v: finalVal });

    if (moveDown) {
      const match = cellRef.match(/r_(\d+)_c_(\d+)/);
      if (match) {
        const nextRow = parseInt(match[1], 10) + 1;
        const col = parseInt(match[2], 10);
        const nextRef = `r_${nextRow}_c_${col}`;
        store.ensureDimensions(nextRow, col);
        store.setActiveCell(nextRef);
        store.setSelectionRange({ start: nextRef, end: nextRef });
      }
    }

    setInserted(true);
    setTimeout(() => setInserted(false), 1200);
    toast(`Inserted ${resultToInsert} into ${activeCellA1}${moveDown ? ' — moved down' : ''}`, 'success');
  }, [display, prevValue, lastOperator, activeCellA1]);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast(`Copied ${display} to clipboard`, 'success');
  };

  // Keyboard support: WASD moves cell box, NumPad calculates, Enter calculates & inserts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    // 1. WASD & Arrow Key Sheet Navigation: Move the active box
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveActiveCell(-1, 0, e.shiftKey);
        return;
      }
      if (key === 's' || e.key === 'ArrowDown') {
        e.preventDefault();
        moveActiveCell(1, 0, e.shiftKey);
        return;
      }
      if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        moveActiveCell(0, -1, e.shiftKey);
        return;
      }
      if (key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        moveActiveCell(0, 1, e.shiftKey);
        return;
      }
    }

    // 2. Enter / NumPad Enter: calculate & insert directly into active cell (box)!
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCalculateAndInsert(e.altKey);
      return;
    }

    // 3. Calculator NumPad & Operators
    if (e.key >= '0' && e.key <= '9') {
      inputDigit(e.key);
    } else if (e.key === '.' || e.key === ',') {
      inputDecimal();
    } else if (e.key === '+' || e.key === '-') {
      performOperation(e.key === '-' ? '−' : '+');
    } else if (e.key === '*') {
      performOperation('×');
    } else if (e.key === '/') {
      performOperation('÷');
    } else if (e.key === '=') {
      e.preventDefault();
      calculateEquals();
    } else if (e.key === 'Backspace') {
      backspace();
    } else if (e.key === 'Escape') {
      clearAll();
    }
  }, [isOpen, moveActiveCell, handleCalculateAndInsert, inputDigit, inputDecimal, performOperation, calculateEquals, backspace, clearAll]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        touchAction: 'none'
      }}
      className={`z-[9999] select-none ${
        isExpanded ? 'w-[540px]' : 'w-[320px]'
      } bg-surface/95 dark:bg-[#12161f]/95 backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-textMain`}
    >
      {/* Header (Draggable) */}
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="px-4 py-3 bg-surfaceHover/50 dark:bg-white/[0.03] border-b border-border/60 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold shadow-inner">
            <Calculator size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-textMain flex items-center gap-1.5">
              <span>Smart Calculator</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-accent/10 text-accent">
                {isExpanded ? 'Scientific & Finance' : 'Business'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            title="Calculation History"
            className={`p-1.5 rounded-lg transition-colors active:scale-95 ${showHistory ? 'bg-accent text-white' : 'hover:bg-surfaceHover text-textMuted hover:text-textMain'}`}
          >
            <History size={14} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Compact Business View' : 'Expand Advanced Tools'}
            className="p-1.5 rounded-lg hover:bg-surfaceHover text-textMuted hover:text-textMain transition-colors active:scale-95"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-textMuted hover:text-red-400 transition-colors active:scale-95"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Display Box */}
      <div className="p-4 bg-background/50 dark:bg-black/20 border-b border-border/40">
        <div className="h-5 text-right text-xs font-medium text-textMuted truncate">
          {expression}
        </div>
        <div className="text-right text-3xl font-black text-textMain tracking-tight overflow-x-auto whitespace-nowrap scrollbar-none my-1 font-mono">
          {display}
        </div>
        
        {/* Cell Destination Bar */}
        <div className="mt-2 pt-2 border-t border-border/30 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-textMuted text-[11px]">
              <span>Active:</span>
              <span className="font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{activeCellA1}</span>
            </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-surfaceHover/80 hover:bg-surfaceHover text-[11px] font-medium text-textMain transition-all active:scale-95"
              title="Copy result to clipboard"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => handleCalculateAndInsert(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent hover:bg-accentHover text-white text-[11px] font-bold shadow-md shadow-accent/20 transition-all active:scale-95"
              title="Calculate & insert into active cell (Enter)"
            >
              {inserted ? <Check size={12} /> : <ArrowDownToLine size={12} />}
              <span>{inserted ? 'Inserted!' : `Enter → [${activeCellA1}]`}</span>
            </button>
            <button
              onClick={() => handleCalculateAndInsert(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/20 hover:bg-accent/30 text-accent text-[11px] font-bold transition-all active:scale-95"
              title="Calculate, insert & move down one row (Alt+Enter)"
            >
              <ArrowDownToLine size={11} />
              <span className="text-[10px]">↓</span>
            </button>
          </div>
          </div>
          {/* Keyboard shortcut hint */}
          <div className="flex items-center flex-wrap gap-2 text-[10px] text-textMuted font-mono pt-0.5">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30 text-accent font-bold text-[9px]">WASD</kbd>
              <span className="text-[10px]">Move Box</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surfaceHover border border-border/60 text-[9px]">NumPad</kbd>
              <span className="text-[10px]">Calculate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-accent text-white font-bold text-[9px]">Enter</kbd>
              <span className="text-[10px]">Insert</span>
            </span>
          </div>
        </div>
      </div>

      {/* Calculator Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side (Standard Business Keypad) */}
        <div className="p-3 flex-1 flex flex-col gap-2">
          {/* 1-Click Business Operations Row */}
          <div className="grid grid-cols-4 gap-1.5 pb-1 border-b border-border/30">
            <button
              onClick={() => applyTax(18)}
              title="Add 18% GST/Tax"
              className="py-1.5 px-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 text-blue-400 font-bold text-[11px] transition-all flex items-center justify-center gap-0.5"
            >
              <span>+18%</span>
              <span className="text-[9px] opacity-75">GST</span>
            </button>
            <button
              onClick={() => applyTax(5)}
              title="Add 5% GST/Tax"
              className="py-1.5 px-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 text-blue-400 font-bold text-[11px] transition-all flex items-center justify-center gap-0.5"
            >
              <span>+5%</span>
              <span className="text-[9px] opacity-75">GST</span>
            </button>
            <button
              onClick={() => applyDiscount(10)}
              title="Apply 10% Discount"
              className="py-1.5 px-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 font-bold text-[11px] transition-all flex items-center justify-center gap-0.5"
            >
              <span>-10%</span>
              <span className="text-[9px] opacity-75">Off</span>
            </button>
            <button
              onClick={() => applyMargin(25)}
              title="Calculate 25% Profit Margin Selling Price"
              className="py-1.5 px-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-400 font-bold text-[11px] transition-all flex items-center justify-center gap-0.5"
            >
              <span>25%</span>
              <span className="text-[9px] opacity-75">Mrg</span>
            </button>
          </div>

          {/* Standard Keypad Grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={clearAll} className="py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 font-bold text-xs transition-all">AC</button>
            <button onClick={backspace} className="py-2.5 rounded-xl bg-surfaceHover hover:bg-white/10 active:scale-95 text-textMuted font-bold text-xs transition-all">DEL</button>
            <button onClick={toggleSign} className="py-2.5 rounded-xl bg-surfaceHover hover:bg-white/10 active:scale-95 text-textMuted font-bold text-xs transition-all">+/−</button>
            <button onClick={() => performOperation('÷')} className="py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 active:scale-95 text-accent font-bold text-sm transition-all">÷</button>

            <button onClick={() => inputDigit('7')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">7</button>
            <button onClick={() => inputDigit('8')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">8</button>
            <button onClick={() => inputDigit('9')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">9</button>
            <button onClick={() => performOperation('×')} className="py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 active:scale-95 text-accent font-bold text-sm transition-all">×</button>

            <button onClick={() => inputDigit('4')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">4</button>
            <button onClick={() => inputDigit('5')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">5</button>
            <button onClick={() => inputDigit('6')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">6</button>
            <button onClick={() => performOperation('−')} className="py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 active:scale-95 text-accent font-bold text-sm transition-all">−</button>

            <button onClick={() => inputDigit('1')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">1</button>
            <button onClick={() => inputDigit('2')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">2</button>
            <button onClick={() => inputDigit('3')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">3</button>
            <button onClick={() => performOperation('+')} className="py-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 active:scale-95 text-accent font-bold text-sm transition-all">+</button>

            <button onClick={applyPercentage} className="py-2.5 rounded-xl bg-surfaceHover hover:bg-white/10 active:scale-95 text-textMuted font-bold text-xs transition-all">%</button>
            <button onClick={() => inputDigit('0')} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-semibold text-sm transition-all">0</button>
            <button onClick={inputDecimal} className="py-2.5 rounded-xl bg-surfaceHover/70 hover:bg-surfaceHover active:scale-95 text-textMain font-bold text-sm transition-all">.</button>
            <button onClick={calculateEquals} className="py-2.5 rounded-xl bg-accent hover:bg-accentHover active:scale-95 text-white font-black text-sm shadow-md shadow-accent/20 transition-all">=</button>
          </div>
        </div>

        {/* Right Side (Expanded Advanced & Scientific Mode) */}
        {isExpanded && (
          <div className="w-[220px] p-3 border-l border-border/40 bg-surface/30 flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-textMuted flex items-center gap-1">
              <Sparkles size={12} className="text-accent" />
              <span>Scientific & Advanced</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={() => applyScientific('sqrt')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">√x</button>
              <button onClick={() => applyScientific('sqr')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">x²</button>
              <button onClick={() => performOperation('^')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">xʸ</button>

              <button onClick={() => applyScientific('recip')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">1/x</button>
              <button onClick={() => applyScientific('pi')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">π</button>
              <button onClick={() => applyScientific('abs')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">|x|</button>

              <button onClick={() => applyScientific('sin')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">sin</button>
              <button onClick={() => applyScientific('cos')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">cos</button>
              <button onClick={() => applyScientific('tan')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">tan</button>

              <button onClick={() => applyScientific('log')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">log</button>
              <button onClick={() => applyScientific('ln')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">ln</button>
              <button onClick={() => inputDigit('(')} className="py-1.5 rounded-lg bg-surfaceHover hover:bg-white/10 active:scale-95 text-xs font-semibold transition-transform">(</button>
            </div>

            {/* Quick Business Presets */}
            <div className="mt-2 pt-2 border-t border-border/30">
              <div className="text-[10px] font-bold text-textMuted uppercase mb-1">Quick Custom Margin</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button onClick={() => applyMargin(15)} className="py-1 rounded bg-surfaceHover hover:bg-white/10 active:scale-95 text-textMain font-medium transition-transform">+15% Margin</button>
                <button onClick={() => applyMargin(30)} className="py-1 rounded bg-surfaceHover hover:bg-white/10 active:scale-95 text-textMain font-medium transition-transform">+30% Margin</button>
                <button onClick={() => applyDiscount(25)} className="py-1 rounded bg-surfaceHover hover:bg-white/10 active:scale-95 text-textMain font-medium transition-transform">-25% Disc</button>
                <button onClick={() => applyTax(12)} className="py-1 rounded bg-surfaceHover hover:bg-white/10 active:scale-95 text-textMain font-medium transition-transform">+12% GST</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History Tape Overlay */}
      {showHistory && (
        <div className="p-3 border-t border-border/50 bg-background/95 max-h-[160px] overflow-y-auto flex flex-col gap-1.5 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between text-[11px] font-bold text-textMuted mb-1">
            <span>Calculation Tape</span>
            {history.length > 0 && (
              <button onClick={() => setHistory([])} className="hover:text-red-400 transition-colors flex items-center gap-0.5 text-[10px]">
                <RotateCcw size={10} /> Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="text-center py-3 text-xs text-textMuted">No calculations yet</div>
          ) : (
            history.map(item => (
              <div 
                key={item.id}
                onClick={() => {
                  setDisplay(item.result);
                  setWaitingForOperand(true);
                }}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surfaceHover/80 cursor-pointer text-xs group transition-colors active:scale-[0.98]"
              >
                <span className="text-textMuted font-mono truncate max-w-[180px]">{item.expression}</span>
                <div className="flex items-center gap-1.5 font-bold font-mono text-accent">
                  <span>{item.result}</span>
                  <span className="text-[9px] text-textMuted opacity-50 group-hover:opacity-100">{item.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});
