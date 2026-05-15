import React, { useState } from 'react';
import { X, Copy, Check, Users, Lock, Unlock, Globe, ShieldCheck } from 'lucide-react';
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
 * member tracking, and cinematic feedback loops.
 */
export const ShareModal: React.FC<ShareModalProps> = ({ workbookId, onClose }) => {
  const [copied, setCopied] = useState(false);
  const isLocked = useSheetStore(state => state.isLocked);
  const isHost = useSheetStore(state => state.isHost);
  const connectedUsers = useSheetStore(state => state.connectedUsers);
  
  const shareUrl = `${window.location.origin}/workbook/${workbookId}`;

  useGSAP(() => {
    gsap.fromTo('.modal-content', 
      { scale: 0.9, opacity: 0, y: 20 }, 
      { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
    );
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    gsap.fromTo('.copy-feedback', 
      { opacity: 0, y: 10 }, 
      { opacity: 1, y: 0, duration: 0.3 }
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleLock = () => {
    if (!isHost) return;
    socketService.emitToggleRoomLock(workbookId, !isLocked);
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
          <div className="flex items-center justify-between mb-8">
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

          {/* Share Link Section */}
          <div className="space-y-3 mb-8">
            <label className="text-xs font-bold text-textMuted uppercase tracking-widest ml-1">Sheet Access Link</label>
            <div className="flex items-center gap-2 p-1.5 bg-background border border-border rounded-xl focus-within:border-accent/50 transition-all shadow-inner">
              <input 
                readOnly 
                value={shareUrl} 
                className="flex-1 bg-transparent px-3 py-2 text-sm text-textMain outline-none font-medium"
              />
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accentHover text-white text-sm font-bold rounded-lg transition-all shadow-lg active:scale-95"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Security Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-8">
            <div 
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                isLocked 
                  ? 'bg-rose-500/10 border-rose-500/30' 
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
              onClick={toggleLock}
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
                    />
                  ))}
                </div>
              </div>
              <div className="text-sm font-bold text-textMain">{connectedUsers.length} Collaborators</div>
              <div className="text-[10px] text-textMuted font-medium mt-0.5">Currently active in sheet</div>
            </div>
          </div>

          {/* Footer Info */}
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
