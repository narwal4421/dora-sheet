import { useState } from 'react';
import { useSheetStore } from '../../store/useSheetStore';
import { socketService } from '../../services/socket.service';
import { X, Copy, Users, Zap, Shield } from 'lucide-react';
import { toast } from '../../store/useToastStore';

export const ShareModal = ({ workbookId, onClose }: { workbookId: string, onClose: () => void }) => {
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  const isLocked = useSheetStore(state => state.isLocked);
  const isHost = useSheetStore(state => state.isHost);
  const localUserName = useSheetStore(state => state.localUserName);
  
  const [targetJoinId, setTargetJoinId] = useState('');
  const [joinerName, setJoinerName] = useState(localStorage.getItem('userName') || '');

  const handleJoinById = () => {
    if (targetJoinId.length !== 6) return toast('Please enter a valid 6-digit Room ID', 'warning');
    if (!joinerName) return toast('Please enter your name first', 'warning');
    
    localStorage.setItem('userName', joinerName);
    socketService.requestToJoin(targetJoinId, { 
      name: joinerName, 
      socketId: socketService.socket?.id || '' 
    });
    toast(`✅ Join request sent to room ${targetJoinId}! Waiting for approval...`, 'info');
    setTargetJoinId('');
  };

  const copyLink = () => {
    const url = `${window.location.origin}/workbook/${workbookId}`;
    navigator.clipboard.writeText(url);
    toast('🔗 Link copied to clipboard!', 'success');
  };


  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-surface border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header with Room ID */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-accent">
              <Users size={20} />
              <h2 className="text-xl font-bold text-white tracking-tight">Collaboration</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-textMuted hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 flex flex-col items-center gap-3 relative group">
            <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Zap size={40} className="text-accent" />
            </div>
            <span className="text-[10px] text-accent font-black uppercase tracking-[0.3em]">Your Unique Room ID</span>
            <div className="text-5xl font-black text-white tracking-[0.2em] font-mono drop-shadow-[0_0_15px_rgba(123,94,246,0.3)]">
              {workbookId.slice(0,3)}<span className="text-accent/50">-</span>{workbookId.slice(3)}
            </div>
            <div className="mt-4 flex gap-2 w-full">
              <button 
                onClick={copyLink} 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-textMuted hover:text-white transition-all border border-white/5"
                title="Copy Editor Link"
              >
                <Copy size={14} />
                <span>Editor Link</span>
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/dashboard/${workbookId}`);
                  toast('🔗 Dashboard link copied!', 'success');
                }} 
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold transition-all border border-accent/20"
                title="Copy Dashboard Link (Read-Only)"
              >
                <Zap size={14} />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-textMuted uppercase tracking-widest">
              <Shield size={14} className="text-accent" />
              <span>Join Another Room</span>
            </div>
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Your Name (e.g. Alex)" 
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent transition-all"
                value={joinerName}
                onChange={(e) => setJoinerName(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="6-digit ID" 
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent font-mono tracking-[0.5em] text-center"
                  value={targetJoinId}
                  onChange={(e) => setTargetJoinId(e.target.value.replace(/\D/g, ''))}
                />
                <button 
                  onClick={handleJoinById}
                  className="bg-accent hover:bg-accentHover text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50"
                  disabled={!joinerName || targetJoinId.length !== 6}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
          
          {/* Room Locking Toggle (Host Only) */}
          {isHost && (
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-all duration-300 ${isLocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white tracking-tight">Lock Session</p>
                  <p className="text-[10px] text-textMuted">Prevent new users from joining</p>
                </div>
              </div>
              <button 
                onClick={() => socketService.emitToggleRoomLock(workbookId, !isLocked)}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isLocked ? 'bg-accent' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isLocked ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Active Collaborators */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-textMuted uppercase tracking-widest">Active Collaborators</h3>
            <ul className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/5">
              {/* Me */}
              <li className="flex justify-between items-center text-sm p-3 bg-accent/5 rounded-xl border border-accent/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-lg shadow-accent/20">
                    {localUserName.charAt(0)}
                  </div>
                  <span className="font-bold text-white tracking-tight">{localUserName} (You)</span>
                </div>
                <span className="text-[8px] bg-accent/20 px-2 py-1 rounded text-accent uppercase font-bold tracking-widest">Host</span>
              </li>
              
              {connectedUsers.map((u, i) => (
                <li key={u.userId || i} className="flex justify-between items-center text-sm p-3 bg-white/[0.02] rounded-xl border border-white/5 animate-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold uppercase" style={{ backgroundColor: u.color }}>
                      {u.name.charAt(0)}
                    </div>
                    <span className="font-medium text-white/80">{u.name}</span>
                  </div>
                  <span className="text-[8px] bg-white/10 px-2 py-1 rounded text-textMuted uppercase font-bold tracking-widest">Active</span>
                </li>
              ))}
              {connectedUsers.length === 0 && (
                <div className="text-[10px] text-textMuted italic p-6 text-center border border-dashed border-white/10 rounded-xl">
                  You are currently the only one here.
                </div>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
