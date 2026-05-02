import { useState, useEffect } from 'react';
import { socketService } from '../../services/socket.service';
import { X, Copy, Users, Zap, Shield } from 'lucide-react';

export const ShareModal = ({ workspaceId, workbookId, onClose }: { workspaceId: string, workbookId: string, onClose: () => void }) => {
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<{userId: string, user: {name: string, email: string}, role: string}[]>([]);
  const [targetJoinId, setTargetJoinId] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 
          (window.location.hostname.includes('vercel.app') ? 'https://dora-sheet-api.onrender.com' : 'http://localhost:3002');
        
        const res = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/members`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const json = await res.json();
        if (json.success) setMembers(json.data);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchMembers();
  }, [workspaceId]);

  const handleInvite = async () => {
    if (!email) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 
        (window.location.hostname.includes('vercel.app') ? 'https://dora-sheet-api.onrender.com' : 'http://localhost:3002');
      
      await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ email, role: 'EDITOR' })
      });
      setEmail('');
      
      // Refresh members
      const res = await fetch(`${apiUrl}/api/v1/workspaces/${workspaceId}/members`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const json = await res.json();
      if (json.success) setMembers(json.data);
    } catch (e) {
      console.error(e);
      alert('Failed to invite member.');
    }
  };

  const handleJoinById = () => {
    if (targetJoinId.length !== 6) return alert('Please enter a valid 6-digit ID');
    socketService.requestToJoin(targetJoinId, { 
      name: 'Collaborator', 
      socketId: socketService.socket?.id || '' 
    });
    alert(`Join request sent to room ${targetJoinId}! Please wait for approval.`);
    setTargetJoinId('');
  };

  const copyLink = () => {
    const url = `${window.location.origin}/workbook/${workbookId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
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
            <button 
              onClick={copyLink} 
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs text-textMuted hover:text-white transition-all border border-white/5"
            >
              <Copy size={12} />
              <span>Copy Invite Link</span>
            </button>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-8">
          {/* Join by ID */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-textMuted uppercase tracking-widest">
              <Shield size={14} className="text-accent" />
              <span>Join Another Room</span>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                maxLength={6}
                placeholder="Enter 6-digit ID..." 
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent font-mono tracking-[0.5em] text-center"
                value={targetJoinId}
                onChange={(e) => setTargetJoinId(e.target.value.replace(/\D/g, ''))}
              />
              <button 
                onClick={handleJoinById}
                className="bg-accent hover:bg-accentHover text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-accent/20 active:scale-95"
              >
                Join
              </button>
            </div>
          </div>

          {/* Invite via Email */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-textMuted uppercase tracking-widest">Invite Collaborator</h3>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="email@example.com" 
                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button 
                onClick={handleInvite} 
                className="bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-xl text-sm font-bold border border-white/10 transition-all"
              >
                Invite
              </button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-textMuted uppercase tracking-widest">Active Members</h3>
            <ul className="space-y-2 max-h-[120px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/5">
              {members.map(m => (
                <li key={m.userId} className="flex justify-between items-center text-sm p-3 bg-white/[0.02] rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold uppercase">
                      {m.user.name.charAt(0)}
                    </div>
                    <span className="font-medium text-white/80">{m.user.name}</span>
                  </div>
                  <span className="text-[10px] bg-accent/10 px-2 py-1 rounded-lg text-accent uppercase font-black tracking-tighter">Editor</span>
                </li>
              ))}
              {members.length === 0 && (
                <div className="text-[10px] text-textMuted italic p-4 text-center border border-dashed border-white/10 rounded-xl">
                  Waiting for collaborators...
                </div>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
