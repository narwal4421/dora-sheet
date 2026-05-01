import { useSheetStore } from '../store/useSheetStore';
import { Share2, FileSpreadsheet, Clock, Download, Sun, Moon } from 'lucide-react';
import { useEffect } from 'react';
import * as XLSX from 'xlsx';

import { DropdownMenu, type MenuItem } from './DropdownMenu';

export const TopNav = ({ onShowVersionHistory, onShowShare }: { onShowVersionHistory: () => void, onShowShare: () => void }) => {
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  const isLightMode = useSheetStore(state => state.isLightMode);
  const setIsLightMode = useSheetStore(state => state.setIsLightMode);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  const handleExport = () => {
    const { data: cells } = useSheetStore.getState();
    const data: (string | number)[][] = [];
    
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
    XLSX.writeFile(wb, "SmartSheet_Export.xlsx");
  };

  const fileMenu: MenuItem[] = [
    { label: 'New Workbook', onClick: () => window.location.reload() },
    { divider: true, label: '', onClick: () => {} },
    { label: 'Export to Excel (.xlsx)', onClick: handleExport },
    { label: 'Print', shortcut: 'Ctrl+P', onClick: () => window.print() }
  ];

  const editMenu: MenuItem[] = [
    { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => alert("Undo coming soon!") },
    { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => alert("Redo coming soon!") },
    { divider: true, label: '', onClick: () => {} },
    { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => document.execCommand('cut') },
    { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => document.execCommand('copy') },
    { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => alert("Use keyboard Ctrl+V to paste") },
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
    { label: 'Fullscreen', onClick: () => document.documentElement.requestFullscreen().catch(()=>alert("Fullscreen not supported")) }
  ];

  const insertMenu: MenuItem[] = [
    { label: 'Row Above', onClick: () => alert("Insert Row coming soon!") },
    { label: 'Column Right', onClick: () => alert("Insert Column coming soon!") }
  ];

  const formatMenu: MenuItem[] = [
    { label: 'Bold', shortcut: 'Ctrl+B', onClick: () => alert("Use the formatting toolbar below") },
    { label: 'Italic', shortcut: 'Ctrl+I', onClick: () => alert("Use the formatting toolbar below") }
  ];

  const dataMenu: MenuItem[] = [
    { label: 'Sort A-Z', onClick: () => alert("Sorting coming soon!") },
    { label: 'Filter', onClick: () => alert("Filters coming soon!") }
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-textMuted text-xs font-medium border-2 border-background bg-surface" title="Only you">
              Me
            </div>
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
