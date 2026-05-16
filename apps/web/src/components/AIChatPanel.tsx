import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Check, Loader2, Paperclip, FileText, Users, Phone, Video, PhoneOff, MonitorUp } from 'lucide-react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { useSheetStore } from '../store/useSheetStore';
import type { CellData } from '../store/useSheetStore';
import { socketService } from '../services/socket.service';
import { useCallStore } from '../store/useCallStore';
import { getWorkbookIdFromUrl } from '../utils/workbookUrl';

interface Message {
  role: 'user' | 'ai';
  content: string;
  tool?: string;
  result?: ToolResult;
  suggestion?: string;
  applied?: boolean;
}

interface ToolResult {
  formula?: string;
  targetCell?: string;
  data?: unknown[][];
  rows?: unknown[];
  columns?: string[];
  startRow?: number;
  startCol?: number;
  analysis?: string;
  suggestions?: string[];
  range?: string | string[];
  references?: string[];
  format?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    backgroundColor?: string;
    align?: 'left' | 'center' | 'right';
  };
  action?: string;
  columnIndex?: number;
  index?: number;
  // Semantic Search
  query?: string;
  matches?: string[];
  explanation?: string;
  // Extraction
  sourceFile?: string;
  // Dashboard
  kpis?: Array<{ label: string; value: string; change?: string; trend?: 'up' | 'down' | 'neutral' }>;
  charts?: Array<{ title: string; type: 'bar' | 'line' | 'area' | 'pie'; data: Record<string, unknown>[]; dataKeys: string[] }>;
  summary?: string;
}

export const AIChatPanel = ({ onClose }: { onClose: () => void }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hi! I am your SmartSheet AI Assistant. Ask me to apply formulas, filter data, or analyze the spreadsheet!' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'team'>('ai');
  const [teamInput, setTeamInput] = useState('');
  
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCell = useSheetStore(state => state.activeCell);
  const setCellData = useSheetStore(state => state.setCellData);
  const bulkSetCellData = useSheetStore(state => state.bulkSetCellData);
  const sheetData = useSheetStore(state => state.data);
  const teamMessages = useSheetStore(state => state.teamMessages);
  const localUserName = useSheetStore(state => state.localUserName);
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  const { isCallActive, callToken, startCall, endCall, setToken, setStatus } = useCallStore();

  const workbookId = getWorkbookIdFromUrl();
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  const fetchToken = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL ||
        (window.location.hostname.includes('vercel.app') ? 'https://dora-sheet-api.onrender.com' : 'http://localhost:3002');
      const response = await fetch(`${apiUrl}/api/v1/call/token?room=${workbookId}&userName=${encodeURIComponent(localUserName)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setToken(result.data.token);
        setStatus('connected');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Failed to fetch call token', err);
      endCall();
    }
  }, [workbookId, localUserName, setToken, setStatus, endCall]);

  useEffect(() => {
    if (isCallActive && !callToken) {
      fetchToken();
    }
  }, [isCallActive, callToken, fetchToken]);

  // Convert internal ref format (r_0_c_0) to A1 notation for AI context
  const getSheetContext = () => {
    const context: Record<string, string | number | boolean | null> = {};
    Object.entries(sheetData).forEach(([ref, cell]) => {
      const match = ref.match(/r_(\d+)_c_(\d+)/);
      if (!match) return;
      const row = parseInt(match[1]) + 1;
      const col = parseInt(match[2]);
      const colLetter = col < 26 ? String.fromCharCode(65 + col) : `A${String.fromCharCode(65 + col - 26)}`;
      const a1 = `${colLetter}${row}`;
      const val = cell.f ? cell.f : (cell.v !== undefined ? cell.v : '');
      if (val !== '') context[a1] = val;
    });
    return Object.keys(context).length > 0 ? JSON.stringify(context) : '{}';
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, teamMessages, activeTab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || isLoading) return;
    
    const userMsg = input.trim() || 'Please extract data from this document.';
    const currentFile = attachedFile;
    
    const isAcceptance = /^(yes|yeah|yep|accept|do it|apply|sure|ok|okay|approve|agree|confirm)/i.test(userMsg);
    
    if (isAcceptance && !currentFile) {
      const lastActionableMsgIndex = messages.findLastIndex(m => m.role === 'ai' && m.tool && !m.applied);
      
      if (lastActionableMsgIndex !== -1) {
        const lastMsg = messages[lastActionableMsgIndex];
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        handleApplyAction(lastMsg.tool!, lastMsg.result, lastActionableMsgIndex);
        return;
      }
    }
    
    setInput('');
    setAttachedFile(null);
    setMessages(prev => [
      ...prev, 
      { role: 'user', content: currentFile ? `[Attached File: ${currentFile.name}] ${userMsg}` : userMsg }
    ]);
    setIsLoading(true);
    if (currentFile) setIsAnalyzingDoc(true);

    try {
      const token = localStorage.getItem('token');
      const sheetId = getWorkbookIdFromUrl();
      const formData = new FormData();
      formData.append('sheetId', sheetId);
      formData.append('prompt', userMsg);
      formData.append('history', JSON.stringify(messages.slice(-10).map(m => ({ role: m.role, content: m.content }))));
      if (activeCell) formData.append('activeCell', activeCell);
      if (currentFile) formData.append('attachedFile', currentFile);
      formData.append('sheetContext', getSheetContext());

      const apiUrl = import.meta.env.VITE_API_URL || 
        (window.location.hostname.includes('vercel.app') ? 'https://dora-sheet-api.onrender.com' : 'http://localhost:3002');
      
      const response = await fetch(`${apiUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: formData
      });

      if (!response.ok) {
        throw new Error(response.status === 429 ? 'Rate limit exceeded' : 'Failed to get AI response');
      }

      const result = await response.json();
      const { tool_used, suggestion, result: toolResult } = result.data;
      
      let displayContent = tool_used === 'none' ? toolResult : `I can help with that. ${suggestion ? `Suggestion: ${suggestion}` : ''}`;
      
      if (tool_used === 'analyze_data') {
        const r = toolResult as ToolResult;
        displayContent = `${r.analysis}\n\n**Suggestions:**\n${r.suggestions?.map(s => `• ${s}`).join('\n')}`;
      }
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: displayContent as string,
        tool: (tool_used === 'none' || tool_used === 'analyze_data') ? undefined : tool_used,
        result: toolResult as ToolResult
      }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${message}` }]);
    } finally {
      setIsLoading(false);
      setIsAnalyzingDoc(false);
    }
  };

  const handleApplyAction = (tool: string, result: ToolResult | undefined, msgIndex: number) => {
    if (!result) return;
    try {
      if (tool === 'apply_formula' && result.formula && activeCell) {
        const sheetId = getWorkbookIdFromUrl();
        setCellData(activeCell, { f: result.formula });
        socketService.emitCellUpdate(sheetId, activeCell, { f: result.formula });
        
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Applied formula ${result.formula} to ${activeCell}!` }];
        });
      } else if (tool === 'fill_data' && (result.data || result.rows)) {
        const startRow = result.startRow !== undefined ? Number(result.startRow) : 0;
        const startCol = result.startCol !== undefined ? Number(result.startCol) : 0;
        const dataToFill = result.data || (result.columns ? [result.columns, ...(result.rows || [])] : (result.rows || []));
        const updates: Record<string, { v?: string | number; f?: string }> = {};
        
        dataToFill.forEach((row: unknown, rIndex: number) => {
          const rowArray = Array.isArray(row) ? row : [row];
          rowArray.forEach((cellValue: unknown, cIndex: number) => {
            const ref = `r_${startRow + rIndex}_c_${startCol + cIndex}`;
            if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
              updates[ref] = { f: cellValue };
            } else if (typeof cellValue === 'string' || typeof cellValue === 'number') {
              updates[ref] = { v: cellValue };
            }
          });
        });
        
        bulkSetCellData(updates);
        const sheetId = getWorkbookIdFromUrl();
        socketService.emitBulkCellUpdate(sheetId, updates);
        
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Successfully updated ${Object.keys(updates).length} cells.` }];
        });
      } else if (tool === 'format_cells' && result.range && result.format) {
        const { setCellFormat } = useSheetStore.getState();
        const sheetId = getWorkbookIdFromUrl();
        const ranges = Array.isArray(result.range) ? result.range : [result.range as string];
        ranges.forEach((a1: string) => {
          const refs = expandRange(a1);
          refs.forEach(ref => {
            setCellFormat(ref, result.format!);
            socketService.emitCellUpdate(sheetId, ref, { fmt: result.format });
          });
        });
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Style power applied successfully!` }];
        });
      } else if (tool === 'organize_data' && result.action) {
        const { sortAZ, toggleFilter } = useSheetStore.getState();
        const sheetId = getWorkbookIdFromUrl();
        
        if (result.action === 'sort') sortAZ(result.columnIndex);
        if (result.action === 'filter' || result.action === 'toggleFilter') toggleFilter(result.columnIndex);
        
        socketService.emitSheetAction(sheetId, result.action, { columnIndex: result.columnIndex });

        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Data organization complete!` }];
        });
      } else if (tool === 'modify_structure' && result.action) {
        const { insertRowAbove, insertColumnRight, deleteRow, deleteColumn } = useSheetStore.getState();
        const sheetId = getWorkbookIdFromUrl();

        if (result.action === 'insertRow') insertRowAbove(result.index);
        if (result.action === 'insertCol') insertColumnRight(result.index);
        if (result.action === 'deleteRow') deleteRow(result.index);
        if (result.action === 'deleteCol') deleteColumn(result.index);

        socketService.emitSheetAction(sheetId, result.action, { index: result.index });

        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Sheet structure updated!` }];
        });
      } else if (tool === 'semantic_search' && result.matches) {
        const { setSelectionRange, setActiveCell } = useSheetStore.getState();
        if (result.matches.length > 0) {
          const first = a1ToRef(result.matches[0]);
          setActiveCell(first);
          
          if (result.matches.length > 1) {
            setSelectionRange({
              start: a1ToRef(result.matches[0]),
              end: a1ToRef(result.matches[result.matches.length - 1])
            });
          }
          
          setMessages(prev => {
            const updated = [...prev];
            updated[msgIndex] = { ...updated[msgIndex], applied: true };
            return [...updated, { role: 'ai', content: `I've found and highlighted ${result.matches!.length} matching cells. ${result.explanation || ''}` }];
          });
        }
      } else if (tool === 'extract_to_table' && result.rows) {
        const startRow = result.startRow !== undefined ? Number(result.startRow) : 0;
        const startCol = result.startCol !== undefined ? Number(result.startCol) : 0;
        const updates: Record<string, Partial<CellData>> = {};
        
        result.rows.forEach((row: unknown, rIdx: number) => {
          const rowArr = Array.isArray(row) ? row : [row];
          rowArr.forEach((val: unknown, cIdx: number) => {
            const ref = `r_${startRow + rIdx}_c_${startCol + cIdx}`;
            updates[ref] = { v: val as string | number | boolean | null };
          });
        });

        bulkSetCellData(updates);
        const sheetId = getWorkbookIdFromUrl();
        socketService.emitBulkCellUpdate(sheetId, updates);

        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Successfully extracted ${result.rows!.length} rows from ${result.sourceFile || 'the file'} into the sheet.` }];
        });
      } else if (tool === 'generate_dashboard' && result.kpis) {
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Cinematic Dashboard generated! You can now view the insights in the Dashboard tab.` }];
        });
        
        window.dispatchEvent(new CustomEvent('show-dashboard', { detail: result }));
      } else if (tool === 'clear_data') {
        const { clearSheet, clearRange } = useSheetStore.getState();
        const sheetId = getWorkbookIdFromUrl();
        
        if (result.range === 'all') {
          clearSheet();
          socketService.emitSheetAction(sheetId, 'clearSheet', { sheetId });
        } else if (result.references) {
          const refs: string[] = [];
          result.references.forEach((a1: string) => {
            expandRange(a1).forEach(ref => refs.push(ref));
          });
          clearRange(refs);
          socketService.emitBulkCellUpdate(sheetId, refs.reduce((acc, ref) => ({ ...acc, [ref]: { v: null } }), {}));
        }

        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Sheet cleared successfully!` }];
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, { role: 'ai', content: `Failed to apply action: ${message}` }]);
    }
  };

  const handleTeamSend = () => {
    if (!teamInput.trim()) return;
    socketService.emitChatMessage(teamInput.trim(), localUserName);
    setTeamInput('');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-background/80 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col z-[100] animate-in slide-in-from-right duration-500 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-surface/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-inner glow-accent">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight text-glow">Dora Intelligence</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-textMuted font-bold uppercase tracking-widest">Autonomous Core</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-textMuted hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-black/20 rounded-xl">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'ai' ? 'bg-accent text-white shadow-lg' : 'text-textMuted hover:text-white'}`}
          >
            <Bot size={14} />
            Assistant
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'team' ? 'bg-accent text-white shadow-lg' : 'text-textMuted hover:text-white'}`}
          >
            <Users size={14} />
            Team Chat
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/5">
        {activeTab === 'ai' ? (
          messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-accent text-white shadow-xl shadow-accent/20 rounded-tr-sm' 
                  : 'bg-surface border border-white/5 text-textMain rounded-tl-sm shadow-lg'
              }`}>
                {m.content}
              </div>
              
              {m.tool && m.role === 'ai' && (
                <div className="mt-3 bg-background/40 border border-white/10 p-4 rounded-xl w-full flex flex-col gap-3 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    {m.tool === 'apply_formula' ? 'Suggested Calculation' : 
                     m.tool === 'fill_data' ? 'Data Insertion' : 
                     m.tool === 'format_cells' ? 'Style Power' :
                     m.tool === 'organize_data' ? 'Data Power' :
                     m.tool === 'semantic_search' ? 'Smart Search' :
                     m.tool === 'extract_to_table' ? 'Intelligence Extraction' :
                     m.tool === 'generate_dashboard' ? 'Cinematic Dashboard' :
                     m.tool === 'modify_structure' ? 'Structural Power' : 'AI Action'}
                  </div>
                  
                  <button 
                    disabled={m.applied}
                    onClick={() => handleApplyAction(m.tool!, m.result, i)}
                    className={`mt-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold border transition-all duration-300 ${m.applied ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-accent/20 hover:bg-accent hover:text-white text-accent border-accent/30'}`}
                  >
                    <Check size={16} /> {m.applied ? 'Action Applied' : 'Approve & Apply'}
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          teamMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
              <Users size={48} className="mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No team messages yet</p>
              <p className="text-[10px] mt-2 px-8 text-textMuted text-center">Connect with your team instantly. Messages are not persisted.</p>
            </div>
          ) : (
            teamMessages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.userName === localUserName ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-textMuted">
                    {m.userName === localUserName ? 'You' : m.userName}
                  </span>
                  <span className="text-[8px] text-white/10">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.userName === localUserName 
                    ? 'bg-white/10 text-white rounded-tr-none' 
                    : 'bg-accent/10 border border-accent/20 text-accent rounded-tl-none'
                }`}>
                  {m.message}
                </div>
              </div>
            ))
          )
        )}
        {isLoading && activeTab === 'ai' && (
          <div className="flex items-center gap-2 text-textMuted text-xs">
            <Loader2 size={14} className="animate-spin text-accent" />
            <span className="animate-pulse">{isAnalyzingDoc ? "Analyzing document..." : "AI is thinking..."}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface/50 border-t border-white/5">
        {activeTab === 'ai' ? (
          <>
            {attachedFile && (
              <div className="mb-3 p-2 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className="text-accent shrink-0" />
                  <span className="text-xs text-accent font-bold truncate">{attachedFile.name}</span>
                </div>
                <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-accent/20 rounded-lg text-accent transition-all">
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-all border border-white/5"
                title="Attach Document (Excel, CSV, PDF, Image)"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".csv, .xlsx, .xls, .pdf, image/*"
              />
              <div className="flex-1 relative">
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-accent transition-all shadow-inner"
                  placeholder="Ask Dora anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  disabled={(!input.trim() && !attachedFile) || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent hover:bg-accentHover disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-accent/20"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Call Buttons: shown only when no call is active and others are present */}
            {connectedUsers.length > 0 && !isCallActive && (
              <div className="flex items-center gap-2 px-1">
                <button 
                  onClick={() => startCall(false, true)}
                  className="flex-1 bg-accent/20 hover:bg-accent hover:text-white text-accent py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-accent/30"
                >
                  <Phone size={14} /> Voice Call
                </button>
                <button 
                  onClick={() => startCall(true, true)}
                  className="flex-1 bg-accent/20 hover:bg-accent hover:text-white text-accent py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-accent/30"
                >
                  <Video size={14} /> Video Call
                </button>
              </div>
            )}

            {/* Active Call: LiveKit SFU embedded in Team Chat */}
            {isCallActive && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20 flex flex-col" style={{ height: '340px' }}>
                {/* Call Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Call</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      title="Screen Share (use controls below)"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-all"
                    >
                      <MonitorUp size={14} />
                    </button>
                    <button
                      onClick={() => endCall()}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all"
                      title="End Call"
                    >
                      <PhoneOff size={14} />
                    </button>
                  </div>
                </div>

                {/* LiveKit Room */}
                {!callToken ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    <span className="text-[10px] font-black text-textMuted uppercase tracking-widest animate-pulse">Connecting...</span>
                  </div>
                ) : (
                  <LiveKitRoom
                    video={true}
                    audio={true}
                    token={callToken}
                    serverUrl={livekitUrl}
                    onDisconnected={() => endCall()}
                    className="flex-1 overflow-hidden"
                    style={{ '--lk-bg': 'transparent' } as React.CSSProperties}
                  >
                    <VideoConference className="h-full" style={{ border: 'none' }} />
                    <RoomAudioRenderer />
                  </LiveKitRoom>
                )}
              </div>
            )}

            {/* Team message input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-accent transition-all shadow-inner"
                  placeholder="Message your team..."
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTeamSend()}
                />
                <button 
                  onClick={handleTeamSend}
                  disabled={!teamInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getWorkbookIdFromUrl = () => {
  const path = window.location.pathname;
  const match = path.match(/\/workbook\/([^/]+)/);
  return match ? match[1] : 'default-workbook-id';
};

function expandRange(rangeStr: string): string[] {
  if (!rangeStr.includes(':')) return [a1ToRef(rangeStr)];
  const [start, end] = rangeStr.split(':');
  const startRef = a1ToRef(start);
  const endRef = a1ToRef(end);
  const startMatch = startRef.match(/r_(\d+)_c_(\d+)/);
  const endMatch = endRef.match(/r_(\d+)_c_(\d+)/);
  if (!startMatch || !endMatch) return [startRef];
  
  const r1 = parseInt(startMatch[1]), c1 = parseInt(startMatch[2]);
  const r2 = parseInt(endMatch[1]), c2 = parseInt(endMatch[2]);
  
  const refs = [];
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
      refs.push(`r_${r}_c_${c}`);
    }
  }
  return refs;
}

function a1ToRef(a1: string): string {
  const match = a1.match(/([A-Z]+)(\d+)/);
  if (!match) return 'r_0_c_0';
  const colStr = match[1];
  const row = parseInt(match[2]) - 1;
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return `r_${row}_c_${col - 1}`;
}
