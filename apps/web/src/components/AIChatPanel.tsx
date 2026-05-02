import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Check, Loader2, Paperclip, FileText } from 'lucide-react';
import { useSheetStore } from '../store/useSheetStore';
import { socketService } from '../services/socket.service';

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
}

export const AIChatPanel = ({ onClose }: { onClose: () => void }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hi! I am your SmartSheet AI Assistant. Ask me to apply formulas, filter data, or analyze the spreadsheet!' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCell = useSheetStore(state => state.activeCell);
  const setCellData = useSheetStore(state => state.setCellData);
  const bulkSetCellData = useSheetStore(state => state.bulkSetCellData);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('sheetId', 'default-workbook-id');
      formData.append('prompt', userMsg);
      formData.append('history', JSON.stringify(messages.slice(-10).map(m => ({ role: m.role, content: m.content }))));
      if (activeCell) formData.append('activeCell', activeCell);
      if (currentFile) formData.append('attachedFile', currentFile);

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
        setCellData(activeCell, { f: result.formula });
        socketService.emitCellUpdate('default-workbook-id', activeCell, { f: result.formula });
        
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
        Object.entries(updates).forEach(([ref, cell]) => {
          socketService.emitCellUpdate('default-workbook-id', ref, cell);
        });
        
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Successfully updated ${Object.keys(updates).length} cells.` }];
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, { role: 'ai', content: `Failed to apply action: ${message}` }]);
    }
  };

  return (
    <div className="w-80 h-full bg-surface/90 backdrop-blur-xl border-l border-white/5 flex flex-col shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.5)] flex-shrink-0 z-20 relative">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 text-accent font-semibold tracking-wide drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
          <Bot size={20} className="animate-pulse" />
          <span>Dora AI</span>
        </div>
        <button onClick={onClose} className="text-textMuted hover:text-textMain transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-sm pb-8 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`px-4 py-2.5 rounded-2xl max-w-[90%] shadow-md leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-br from-accent to-accentHover text-white rounded-br-sm' : 'bg-surfaceHover/80 backdrop-blur-md text-textMain rounded-bl-sm border border-white/5'}`}>
              {msg.content}
            </div>
            
            {msg.tool && msg.role === 'ai' && (
              <div className="mt-3 bg-background/40 border border-white/10 p-4 rounded-xl w-full flex flex-col gap-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  {msg.tool === 'apply_formula' ? 'Suggested Calculation' : msg.tool === 'fill_data' ? 'Data Insertion' : 'AI Action'}
                </div>
                
                <div className="flex flex-col gap-2 py-1">
                  {msg.tool === 'apply_formula' && resultHasFormula(msg.result) && (
                    <>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-textMuted uppercase font-semibold">Formula</span>
                        <code className="px-2 py-1.5 bg-black/30 rounded border border-white/5 text-accent font-mono text-xs">
                          {msg.result?.formula}
                        </code>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-textMuted uppercase font-semibold">Target Cell</span>
                        <div className="text-white font-medium text-xs">{msg.result?.targetCell || 'Selected Cell'}</div>
                      </div>
                    </>
                  )}

                  {msg.tool === 'fill_data' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-textMuted">Proposed Rows:</span>
                        <span className="text-white font-bold">{msg.result?.rows?.length || msg.result?.data?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-textMuted">Columns:</span>
                        <span className="text-white truncate max-w-[120px]">{msg.result?.columns?.join(', ') || 'Auto-detect'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  disabled={msg.applied}
                  onClick={() => handleApplyAction(msg.tool!, msg.result, i)}
                  className={`mt-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold border transition-all duration-300 ${msg.applied ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-accent/20 hover:bg-accent hover:text-white text-accent border-accent/30'}`}
                >
                  <Check size={16} /> {msg.applied ? 'Action Applied' : 'Approve & Apply'}
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-textMuted text-xs">
            <Loader2 size={14} className="animate-spin text-accent" />
            <span className="animate-pulse">{isAnalyzingDoc ? "Analyzing document..." : "AI is thinking..."}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-white/5 bg-surface/80 backdrop-blur-md">
        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent">
            <FileText size={14} />
            <span className="flex-1 truncate font-medium">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)}><X size={14} /></button>
          </div>
        )}
        <div className="flex items-center bg-background/60 border border-white/10 rounded-xl px-2 py-1.5 shadow-inner focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all duration-200">
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-textMuted hover:text-accent"><Paperclip size={18} /></button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <input
            type="text"
            className="flex-1 bg-transparent py-1 px-2 outline-none text-sm text-textMain placeholder-textMuted"
            placeholder="Type your request here..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={(!input.trim() && !attachedFile) || isLoading} className="text-accent hover:text-white hover:bg-accent p-1.5 rounded-lg disabled:opacity-50"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
};

function resultHasFormula(result: unknown): result is { formula: string; targetCell?: string } {
  return !!result && typeof (result as { formula: string }).formula === 'string';
}
