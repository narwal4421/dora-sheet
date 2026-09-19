import React, { useState } from 'react';
import { Users } from 'lucide-react';

interface JoinIdentityModalProps {
  onJoin: (name: string) => void;
}

export const JoinIdentityModal: React.FC<JoinIdentityModalProps> = ({ onJoin }) => {
  const [tempName, setTempName] = useState('');

  const handleSubmit = () => {
    if (tempName.trim()) {
      onJoin(tempName.trim());
      // The socket update is handled in App.tsx or we can just do it here if we import it.
      // But we will do it in App.tsx where onJoin is called.
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
      <div className="bg-surface border border-border/80 rounded-[24px] md:rounded-[32px] shadow-2xl shadow-black/40 w-full max-w-sm p-6 md:p-8 flex flex-col items-center gap-6 md:gap-8 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-3xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
          <Users size={38} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-textMain tracking-tight">Who's Joining?</h2>
          <p className="text-sm text-textMuted leading-relaxed px-4">Welcome to Dora Sheet! Please enter your name to start.</p>
        </div>
        <div className="w-full space-y-4">
          <input 
            autoFocus
            type="text" 
            placeholder="Enter your name" 
            className="w-full bg-background/70 border border-border rounded-2xl px-6 py-4 text-textMain placeholder-textMuted/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-center font-semibold tracking-wide"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
          <button 
            onClick={handleSubmit}
            disabled={!tempName.trim()}
            className="w-full bg-accent hover:bg-accentHover disabled:opacity-50 text-slate-950 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-md shadow-accent/25 active:scale-[0.98]"
          >
            JOIN
          </button>
        </div>
      </div>
    </div>
  );
};
