import React, { useState, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { useSheetStore } from '../store/useSheetStore';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

/**
 * PREMIUM MULTI-SHEET TABS CONTROLLER
 * Sleek, high-fidelity workbook navigation with double-click renaming,
 * smooth sliding transitions, and complete real-time collaborative state sync.
 */
export const SheetTabs: React.FC = () => {
  const sheets = useSheetStore(state => state.sheets);
  const activeSheetId = useSheetStore(state => state.activeSheetId);
  const addSheetTab = useSheetStore(state => state.addSheetTab);
  const renameSheetTab = useSheetStore(state => state.renameSheetTab);
  const deleteSheetTab = useSheetStore(state => state.deleteSheetTab);
  const switchSheetTab = useSheetStore(state => state.switchSheetTab);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // --- ANIME: ULTRA-SMOOTH ACTIVATION EFFECT ---
  useGSAP(() => {
    if (activeTabRef.current) {
      gsap.fromTo(activeTabRef.current,
        { scale: 0.95, opacity: 0.8 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' }
      );
    }
  }, [activeSheetId]);

  // --- HORIZONTAL SCROLL MANAGEMENT ---
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 150;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleStartRename = (id: string, name: string) => {
    setEditingTabId(id);
    setEditingName(name);
  };

  const handleFinishRename = (id: string) => {
    if (editingName.trim()) {
      renameSheetTab(id, editingName.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleFinishRename(id);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div className="h-11 bg-surface/50 border-t border-border/80 px-4 flex items-center justify-between select-none relative z-10 backdrop-blur-xl">
      {/* LEFT SECTION: CONTROLS & TABS */}
      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
        {/* ADD SHEET TABS BUTTON */}
        <button
          onClick={() => addSheetTab()}
          className="p-1.5 text-textMuted hover:text-white bg-white/5 hover:bg-accent/20 hover:border-accent border border-white/5 rounded-lg transition-all duration-200 shadow-sm flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 group"
          title="Add New Worksheet"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="h-4 w-[1px] bg-border shrink-0" />

        {/* SCROLL BUTTON: LEFT */}
        <button
          onClick={() => handleScroll('left')}
          className="p-1 text-textMuted hover:text-white hover:bg-white/5 rounded-md transition-colors shrink-0"
        >
          <ChevronLeft size={14} />
        </button>

        {/* TABS CONTAINER */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {sheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            return (
              <div
                key={sheet.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => !isActive && switchSheetTab(sheet.id)}
                onDoubleClick={() => handleStartRename(sheet.id, sheet.name)}
                className={`group px-3.5 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all duration-250 shrink-0 text-xs font-semibold ${
                  isActive
                    ? 'bg-accent/15 border-accent text-white shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                    : 'bg-surfaceHover/30 border-border/60 text-textMuted hover:text-textMain hover:border-border hover:bg-surfaceHover/60'
                }`}
              >
                <FileSpreadsheet size={12} className={isActive ? 'text-accent' : 'text-textMuted'} />

                {editingTabId === sheet.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleFinishRename(sheet.id)}
                    onKeyDown={(e) => handleKeyDown(e, sheet.id)}
                    className="bg-surface/80 text-white border border-accent/40 rounded px-1.5 py-0.5 outline-none text-[11px] w-20 font-medium"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="tracking-wide">{sheet.name}</span>
                )}

                {/* DELETE SHEET BUTTON (if > 1 sheet) */}
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSheetTab(sheet.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-400 text-textMuted transition-all duration-200 shrink-0 ${
                      isActive ? 'opacity-30' : ''
                    }`}
                    title="Delete Sheet"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* SCROLL BUTTON: RIGHT */}
        <button
          onClick={() => handleScroll('right')}
          className="p-1 text-textMuted hover:text-white hover:bg-white/5 rounded-md transition-colors shrink-0"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* RIGHT SECTION: SHEET METRICS / STATUS */}
      <div className="hidden sm:flex items-center gap-4 text-[10px] text-textMuted font-medium tracking-wider uppercase shrink-0 bg-surfaceHover/10 px-3 py-1 rounded-full border border-border/40 select-none">
        <span>Worksheets: {sheets.length}</span>
        <div className="h-2 w-[1px] bg-border/80" />
        <span className="text-accent/90">Active: {sheets.find(s => s.id === activeSheetId)?.name || 'Sheet1'}</span>
      </div>
    </div>
  );
};
