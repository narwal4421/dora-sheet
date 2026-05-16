import React, { useState } from 'react';
import { X, Copy, Check, Users, Lock, Unlock, Globe, ShieldCheck, Hash, LogIn } from 'lucide-react';
import { useSheetStore } from '../../store/useSheetStore';
import { socketService } from '../../services/socket.service';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface ShareModalProps {
  workbookId: string;
  onClose: () => void;
}

/**
 * GOD LEVEL SHARE MODAL
 * High-end collaboration center with real-time lock controls, 
 * member tracking, join-by-code, and cinematic feedback loops.
 */
export const ShareModal: React.FC<ShareModalProps> = ({ workbookId, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const isLocked = useSheetStore(state => state.isLocked);
  const isHost = useSheetStore(state => state.isHost);
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  
  const shareUrl = `${window.location.origin}/workbook/${workbookId}`;
  // Extract just the 6-digit code from the workbookId
  const roomCode = workbookId;

  useGSAP(() => {
    gsap.fromTo('.modal-content', 
      { scale: 0.9, opacity: 0, y: 20 }, 
      { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
    );
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const toggleLock = () => {
    if (!isHost) return;
    socketService.emitToggleRoomLock(workbookId, !isLocked);
  };

  const handleJoinByCode = () => {
    const code = joinCode.trim();
    if (!code) {
      setJoinError('Please enter a room code.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setJoinError('Code must be exactly 6 digits.');
      return;
    }
    // Navigate to the workbook with that code
    window.location.href = `/workbook/${code}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />

      {/* Content */}
      <div className="modal-content relative w-full max-w-lg bg-surface border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
        {/* Header Gradient */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-indigo-400 to-accent" />
        
        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-2.5 bg-accent/10 rounded-xl">
                <Globe className="text-accent" size={24} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-textMain tracking-tight">Collaborative Sharing</h2>
                <p className="text-[11px] md:text-sm text-textMuted font-medium">Manage access and invite your team</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surfaceHover rounded-full transition-all text-textMuted hover:text-textMain"
            >
              <X size={20} />
            </button>
          </div>

          {/* === ROOM CODE (BIG & PROMINENT) === */}
          <div className="mb-6 p-5 rounded-2xl bg-accent/5 border border-accent/20 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-textMuted uppercase tracking-widest">
              <Hash size={14} className="text-accent" />
              Your Room Code
            </div>
            <div className="flex items-center gap-4">
              {roomCode.split('').map((digit, i) => (
                <span 
                  key={i} 
                  className="w-10 h-12 flex items-center justify-center bg-background border border-border rounded-xl text-2xl font-black text-accent shadow-inner"
                >
                  {digit}
                </span>
              ))}
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-4 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold rounded-full transition-all border border-accent/20"
            >
              {codeCopied ? <Check size={13} /> : <Copy size={13} />}
              {codeCopied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          {/* Share Link */}
          <div className="space-y-3 mb-6">
            <label className="text-xs font-bold text-textMuted uppercase tracking-widest ml-1">Share Link</label>
            <div className="flex items-center gap-2 p-1.5 bg-background border border-border rounded-xl focus-within:border-accent/50 transition-all shadow-inner">
              <input 
                readOnly 
                value={shareUrl} 
                className="flex-1 bg-transparent px-3 py-2 text-sm text-textMain outline-none font-medium truncate"
              />
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accentHover text-white text-sm font-bold rounded-lg transition-all shadow-lg active:scale-95 shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* === JOIN BY CODE === */}
          <div className="space-y-3 mb-6">
            <label className="text-xs font-bold text-textMuted uppercase tracking-widest ml-1">Join a Room by Code</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.replace(/\D/g, ''));
                  setJoinError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                placeholder="Enter 6-digit code"
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-accent transition-all font-mono tracking-[0.3em] placeholder:tracking-normal placeholder:font-sans"
              />
              <button
                onClick={handleJoinByCode}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 shrink-0"
              >
                <LogIn size={16} />
                Join
              </button>
            </div>
            {joinError && (
              <p className="text-xs text-rose-400 font-medium ml-1 animate-in fade-in duration-200">{joinError}</p>
            )}
          </div>

          {/* Security Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            <div 
              className={`p-4 rounded-xl border transition-all select-none ${
                isLocked 
                  ? 'bg-rose-500/10 border-rose-500/30' 
                  : 'bg-emerald-500/10 border-emerald-500/30'
              } ${isHost ? 'cursor-pointer hover:opacity-90' : 'opacity-50 cursor-not-allowed'}`}
              onClick={toggleLock}
              title={isHost 
                ? (isLocked ? 'Click to unlock the room' : 'Click to lock the room') 
                : 'Only the host can lock or unlock this room'
              }
            >
              <div className="flex items-center justify-between mb-2">
                {isLocked ? <Lock size={20} className="text-rose-500" /> : <Unlock size={20} className="text-emerald-500" />}
                {isHost && <div className="text-[10px] font-bold uppercase text-textMuted tracking-tighter">Host Control</div>}
              </div>
              <div className="text-sm font-bold text-textMain">{isLocked ? 'Room Locked' : 'Room Open'}</div>
              <div className="text-[10px] text-textMuted font-medium mt-0.5">
                {isLocked ? 'Invite-only approval required' : 'Anyone with link can join'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surfaceHover/50">
              <div className="flex items-center justify-between mb-2">
                <Users size={20} className="text-accent" />
                <div className="flex -space-x-2">
                  {connectedUsers.slice(0, 3).map((u, i) => (
                    <div 
                      key={i} 
                      className="w-5 h-5 rounded-full border-2 border-surface shadow-sm" 
                      style={{ backgroundColor: u.color }}
                      title={u.name}
                    />
                  ))}
                </div>
              </div>
              <div className="text-sm font-bold text-textMain">{connectedUsers.length} Collaborators</div>
              <div className="text-[10px] text-textMuted font-medium mt-0.5">Currently active in sheet</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-xl border border-accent/10">
            <ShieldCheck className="text-accent" size={20} />
            <div className="text-xs text-textMuted font-medium leading-relaxed">
              Dora Collaborative Security is enabled. Your data is protected by <span className="text-accent font-bold">Bodyguard™</span> real-time threat monitoring.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
