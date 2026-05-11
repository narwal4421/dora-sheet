import { useState, useEffect, useRef } from 'react';
import { useSheetStore } from '../store/useSheetStore';
import { Share2, FileSpreadsheet, Clock, Download, Sun, Moon } from 'lucide-react';
import * as XLSX from 'xlsx';

import { DropdownMenu, type MenuItem } from './DropdownMenu';
import { toast } from '../store/useToastStore';

export const TopNav = ({ 
  onShowVersionHistory, 
  onShowShare,
  onShowAbout,
  onNewWorkbook,
  onShowTemplates
}: { 
  onShowVersionHistory: () => void, 
  onShowShare: () => void,
  onShowAbout: () => void,
  onNewWorkbook: () => void,
  onShowTemplates: () => void
}) => {
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  const isLightMode = useSheetStore(state => state.isLightMode);
  const setIsLightMode = useSheetStore(state => state.setIsLightMode);
  const userName = useSheetStore(state => state.localUserName);
  const setUserName = useSheetStore(state => state.setLocalUserName);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  const handleExport = () => {
    const { data: cells } = useSheetStore.getState();
    const data: (string | number | boolean)[][] = [];
    
    let maxR = 0;
    let maxC = 0;
    for (const key of Object.keys(cells)) {
       const match = key.match(/r_(\d+)_c_(\d+)/);
       if (match) {
         maxR = Math.max(maxR, parseInt(match[1], 10));
         maxC = Math.max(maxC, parseInt(match[2], 10));
       }
    }
    
    for (let r = 0; r <= maxR; r++) {
      const rowData = [];
      for (let c = 0; c <= maxC; c++) {
        const cell = cells[`r_${r}_c_${c}`];
        rowData.push(cell?.v || "");
      }
      data.push(rowData);
    }
    
    if (data.length === 0) data.push([""]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "DoraAI_Export.xlsx");
  };

  const fileMenu: MenuItem[] = [
    { label: 'New Workbook', onClick: onNewWorkbook },
    { label: 'Templates', onClick: onShowTemplates },
    { divider: true, label: '', onClick: () => {} },
    { label: 'Export to Excel (.xlsx)', onClick: handleExport },
    { label: 'Print', shortcut: 'Ctrl+P', onClick: () => window.print() }
  ];

  const editMenu: MenuItem[] = [
    { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => useSheetStore.getState().undo() },
    { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => useSheetStore.getState().redo() },
    { divider: true, label: '', onClick: () => {} },
    { 
      label: 'Cut', 
      shortcut: 'Ctrl+X', 
      onClick: async () => {
        const { activeCell, data, clearCell } = useSheetStore.getState();
        if (!activeCell) return;
        const val = data[activeCell]?.f || data[activeCell]?.v || '';
        await navigator.clipboard.writeText(String(val));
        clearCell(activeCell);
      } 
    },
    { 
      label: 'Copy', 
      shortcut: 'Ctrl+C', 
      onClick: async () => {
        const { activeCell, data } = useSheetStore.getState();
        if (!activeCell) return;
        const val = data[activeCell]?.f || data[activeCell]?.v || '';
        await navigator.clipboard.writeText(String(val));
      } 
    },
    { 
      label: 'Paste', 
      shortcut: 'Ctrl+V', 
      onClick: async () => {
        const { activeCell, setCellData } = useSheetStore.getState();
        if (!activeCell) return;
        try {
          const text = await navigator.clipboard.readText();
          if (!text) return;
          const isFormula = text.startsWith('=');
          const update: { v?: string; f?: string } = isFormula 
            ? { f: text } 
            : { v: text, f: undefined };
          setCellData(activeCell, update);
        } catch {
          toast("Please use keyboard Ctrl+V to paste", "warning");
        }
      } 
    },
    { divider: true, label: '', onClick: () => {} },
    { 
      label: 'Clear', 
      shortcut: 'Del', 
      onClick: () => {
         const { activeCell, clearCell } = useSheetStore.getState();
         if (activeCell) clearCell(activeCell);
      } 
    }
  ];

  const viewMenu: MenuItem[] = [
    { label: 'Fullscreen', onClick: () => document.documentElement.requestFullscreen().catch(() => toast('Fullscreen not supported in this browser', 'warning')) }
  ];

  const insertMenu: MenuItem[] = [
    { label: 'Row Above', onClick: () => useSheetStore.getState().insertRowAbove() },
    { label: 'Column Right', onClick: () => useSheetStore.getState().insertColumnRight() }
  ];

  const formatMenu: MenuItem[] = [
    { 
      label: 'Bold', 
      shortcut: 'Ctrl+B', 
      onClick: () => {
        const { activeCell, data, setCellFormat } = useSheetStore.getState();
        if (activeCell) setCellFormat(activeCell, { bold: !data[activeCell]?.fmt?.bold });
      } 
    },
    { 
      label: 'Italic', 
      shortcut: 'Ctrl+I', 
      onClick: () => {
        const { activeCell, data, setCellFormat } = useSheetStore.getState();
        if (activeCell) setCellFormat(activeCell, { italic: !data[activeCell]?.fmt?.italic });
      } 
    }
  ];

  const dataMenu: MenuItem[] = [
    { label: 'Sort A-Z', onClick: () => useSheetStore.getState().sortAZ() },
    { label: 'Filter', onClick: () => useSheetStore.getState().toggleFilter() }
  ];

  return (
    <div className="dark flex items-center justify-between px-4 py-2 border-b border-border bg-background z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-accent/20 text-accent">
          <FileSpreadsheet size={20} />
        </div>
        <div className="flex flex-col">
          <input 
            type="text" 
            defaultValue="Untitled Workbook" 
            className="bg-transparent font-medium text-textMain text-sm outline-none border border-transparent hover:border-border px-1 rounded transition-colors focus:border-accent focus:bg-surface"
          />
          <div className="flex items-center gap-1 px-1 mt-0.5">
            <DropdownMenu label="File" items={fileMenu} />
            <DropdownMenu label="Edit" items={editMenu} />
            <DropdownMenu label="View" items={viewMenu} />
            <DropdownMenu label="Insert" items={insertMenu} />
            <DropdownMenu label="Format" items={formatMenu} />
            <DropdownMenu label="Data" items={dataMenu} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Current User Name Editor */}
        <div className="flex items-center gap-2 bg-surfaceHover/50 px-2 py-1 rounded-full border border-border/50 hover:border-accent/30 transition-all group">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accentHover flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
            {userName.charAt(0)}
          </div>
          {isEditingName ? (
            <input 
              autoFocus
              className="bg-transparent border-none outline-none text-xs font-semibold text-textMain w-24 animate-in fade-in duration-200"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={() => {
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingName(false);
                }
              }}
            />
          ) : (
            <div 
              onClick={() => setIsEditingName(true)}
              className="text-xs font-semibold text-textMuted group-hover:text-textMain cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>{userName}</span>
              <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity bg-accent/10 text-accent px-1 rounded">Edit</span>
            </div>
          )}
        </div>

        {/* Avatars */}
        <div className="flex items-center -space-x-2">
          {connectedUsers.map((user, i) => (
            <div 
              key={user.userId || i} 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-background ring-2 ring-transparent"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {connectedUsers.length === 0 && (
            <button 
              onClick={onShowAbout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-textMuted hover:text-white hover:border-accent transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
              title="Learn about Dora AI"
            >
              Contact Us
            </button>
          )}
        </div>

        <div className="relative flex items-center">
          <button 
            onClick={() => setIsLightMode(!isLightMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-colors text-sm font-medium"
            title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
            <span>Theme</span>
          </button>
        </div>

        <button 
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-colors text-sm font-medium"
        >
          <Download size={16} />
          <span>Export</span>
        </button>

        <button 
          onClick={onShowVersionHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-textMuted hover:bg-surfaceHover hover:text-textMain transition-colors text-sm font-medium"
        >
          <Clock size={16} />
          <span>History</span>
        </button>

        <button 
          onClick={onShowShare}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-accent text-white hover:bg-accentHover transition-colors text-sm font-medium shadow-md shadow-accent/20"
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};
