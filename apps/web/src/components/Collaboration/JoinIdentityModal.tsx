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
    }
  };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
      <div className="bg-surface border border-white/10 rounded-[24px] md:rounded-[32px] shadow-2xl w-full max-w-sm p-6 md:p-8 flex flex-col items-center gap-6 md:gap-8 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center text-accent">
          <Users size={40} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">Who's Joining?</h2>
          <p className="text-sm text-textMuted leading-relaxed px-4">Welcome to Dora AI! Please enter your name to start.</p>
        </div>
        <div className="w-full space-y-4">
          <input 
            autoFocus
            type="text" 
            placeholder="Enter your name" 
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-accent transition-all text-center font-bold tracking-wide"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
          <button 
            onClick={handleSubmit}
            disabled={!tempName.trim()}
            className="w-full bg-accent hover:bg-accentHover disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
          >
            JOIN
          </button>
        </div>
      </div>
    </div>
  );
};
