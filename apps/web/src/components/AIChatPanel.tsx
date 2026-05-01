import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Check, Loader2, Paperclip, FileText } from 'lucide-react';
import { useSheetStore } from '../store/useSheetStore';
import { socketService } from '../services/socket.service';

export const AIChatPanel = ({ onClose }: { onClose: () => void }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, tool?: string, result?: unknown, suggestion?: string, applied?: boolean }[]>([
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
    
    // Gemini supports PDFs, images, CSV, text, etc.
    setAttachedFile(file);
    // Reset input so the same file can be uploaded again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || isLoading) return;
    
    const userMsg = input.trim() || 'Please extract data from this document.';
    const currentFile = attachedFile;
    
    // Check if this is an acceptance of a previous suggestion
    const isAcceptance = /^(yes|yeah|yep|accept|do it|apply|sure|ok|okay)/i.test(userMsg);
    
    if (isAcceptance && !currentFile) {
      let lastActionableMsgIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'ai' && messages[i].tool && !messages[i].applied) {
          lastActionableMsgIndex = i;
          break;
        }
      }
      
      if (lastActionableMsgIndex !== -1) {
        const lastMsg = messages[lastActionableMsgIndex];
        
        setInput('');
        setMessages(prev => [
          ...prev, 
          { role: 'user', content: userMsg }
        ]);
        
        // Apply the action automatically
        handleApplyAction(lastMsg.tool!, lastMsg.result, lastActionableMsgIndex);
        return; // Skip sending to AI
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
      if (activeCell) formData.append('activeCell', activeCell);
      if (currentFile) formData.append('attachedFile', currentFile);

      const apiUrl = import.meta.env.VITE_API_URL || 
        (window.location.hostname.includes('vercel.app') 
          ? 'https://dora-sheet-api.vercel.app' 
          : 'http://localhost:3002');
      const response = await fetch(`${apiUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        if (response.status === 429) {
           setMessages(prev => [...prev, { role: 'ai', content: 'You have hit the rate limit (50 requests/day). Please try again tomorrow.' }]);
        } else {
           throw new Error('Failed to get AI response');
        }
      } else {
        const result = await response.json();
        const { tool_used, suggestion, result: toolResult } = result.data;
        
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: tool_used === 'none' ? toolResult : `I can help with that. ${suggestion ? `Suggestion: ${suggestion}` : ''}`,
          tool: tool_used === 'none' ? undefined : tool_used,
          result: toolResult
        }]);
      }
    } catch (err: unknown) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${(err as Error).message}` }]);
    } finally {
      setIsLoading(false);
      setIsAnalyzingDoc(false);
    }
  };

  const handleApplyAction = (tool: string, rawResult: unknown, msgIndex: number) => {
    const result = rawResult as Record<string, unknown>;
    try {
      // If the tool was apply_formula and we have an active cell, apply it!
      if (tool === 'apply_formula' && result?.formula && activeCell) {
        const formula = result.formula as string;
        setCellData(activeCell, { f: formula });
        socketService.emitCellUpdate('default-workbook-id', activeCell, { f: formula });
        
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Applied formula ${formula} to ${activeCell}!` }];
        });
      } else if (tool === 'fill_data' && (result?.data || result?.rows)) {
        const startRow = result.startRow !== undefined ? Number(result.startRow) : 0;
        const startCol = result.startCol !== undefined ? Number(result.startCol) : 0;
        const columns = result.columns as unknown[];
        const rows = result.rows as unknown[];
        const data = result.data as unknown[][];
        
        const dataToFill = data || (columns ? [columns, ...rows] : rows);
        const updates: Record<string, { v: string | number }> = {};
        
        dataToFill.forEach((row: unknown, rIndex: number) => {
          const rowArray = Array.isArray(row) ? row : [row];
          rowArray.forEach((cellValue: unknown, cIndex: number) => {
            const ref = `r_${startRow + rIndex}_c_${startCol + cIndex}`;
            const val = cellValue as string | number;
            updates[ref] = { v: val };
          });
        });
        
        bulkSetCellData(updates);
        
        // Batch socket updates to avoid overwhelming the connection
        Object.entries(updates).forEach(([ref, cell]) => {
          socketService.emitCellUpdate('default-workbook-id', ref, cell);
        });
        
        const cellList = Object.keys(updates).join(', ');
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = { ...updated[msgIndex], applied: true };
          return [...updated, { role: 'ai', content: `Successfully updated cells: ${cellList}` }];
        });
      } else {
         setMessages(prev => [...prev, { role: 'ai', content: `Cannot automatically apply action for ${tool}.` }]);
      }
    } catch (err: unknown) {
      setMessages(prev => [...prev, { role: 'ai', content: `Failed to apply action: ${(err as Error).message}` }]);
    }
  };

  return (
    <div className="w-80 h-full bg-surface/90 backdrop-blur-xl border-l border-white/5 flex flex-col shadow-[-8px_0_30px_-5px_rgba(0,0,0,0.5)] flex-shrink-0 z-20 relative">
      <div className="absolute inset-0 pointer-events-none rounded-l-2xl shadow-[inset_1px_0_0_0_rgba(255,255,255,0.05)]"></div>
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 text-accent font-semibold tracking-wide drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
          <Bot size={20} className="animate-pulse" />
          <span>SmartSheet AI</span>
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
              <div className="mt-2 bg-background/50 border border-white/10 p-3 rounded-xl w-full flex flex-col gap-2 shadow-inner">
                <div className="text-xs text-textMuted uppercase font-bold tracking-wider">Action: {msg.tool}</div>
                <div className="font-mono text-xs text-accent/90 break-all bg-black/20 p-2 rounded-md border border-white/5">
                  {JSON.stringify(msg.result, null, 2)}
                </div>
                <button 
                  disabled={msg.applied}
                  onClick={() => msg.tool && handleApplyAction(msg.tool, msg.result, i)}
                  className={`mt-2 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${msg.applied ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-accent/20 hover:bg-accent hover:text-white text-accent border-accent/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]'}`}
                >
                  <Check size={16} /> {msg.applied ? 'Applied' : 'Accept Suggestion'}
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-textMuted text-xs">
            <Loader2 size={14} className="animate-spin text-accent" />
            <span className="animate-pulse">
              {isAnalyzingDoc ? "Analyzing document (this may take a few seconds)..." : "AI is thinking..."}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-white/5 bg-surface/80 backdrop-blur-md">
        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent">
            <FileText size={14} />
            <span className="flex-1 truncate font-medium">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-center bg-background/60 border border-white/10 rounded-xl px-2 py-1.5 shadow-inner focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all duration-200">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-textMuted hover:text-accent transition-colors"
            title="Attach Document or Image"
          >
            <Paperclip size={18} />
          </button>
          <input
            type="file"
            accept="*/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            type="text"
            className="flex-1 bg-transparent py-1 px-2 outline-none text-sm text-textMain placeholder-textMuted"
            placeholder="Type your request here..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend} 
            disabled={(!input.trim() && !attachedFile) || isLoading}
            className="text-accent hover:text-white hover:bg-accent p-1.5 rounded-lg disabled:bg-transparent disabled:text-textMuted disabled:opacity-50 transition-all duration-200"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
