import React from 'react';
import { Users } from 'lucide-react';

interface JoinRequest {
  requesterSocketId: string;
  requesterUserId: string;
  name: string;
}

interface JoinRequestStackProps {
  requests: JoinRequest[];
  onAccept: () => void;
  onDeny: () => void;
}

export const JoinRequestStack: React.FC<JoinRequestStackProps> = ({ requests, onAccept, onDeny }) => {
  if (requests.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 md:bottom-10 md:left-10 z-[250] flex flex-col gap-4 animate-in slide-in-from-left duration-500">
      {requests.map((req, idx) => (
        <div 
          key={req.requesterSocketId} 
          className={`bg-surface border border-accent/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 w-72 backdrop-blur-xl transition-all ${
            idx > 0 
              ? 'opacity-40 scale-95 -mt-16 grayscale pointer-events-none' 
              : 'opacity-100 scale-100 shadow-accent/20 border-accent/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white truncate w-32">{req.name}</h3>
              <p className="text-[10px] text-textMuted font-bold uppercase tracking-widest">Wants to join</p>
            </div>
          </div>
          
          {idx === 0 && (
            <div className="flex gap-2">
              <button 
                onClick={onAccept}
                className="flex-1 bg-accent hover:bg-accentHover text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-95"
              >
                Approve
              </button>
              <button 
                onClick={onDeny}
                className="px-4 bg-white/5 hover:bg-white/10 text-textMuted py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95"
              >
                Deny
              </button>
            </div>
          )}
        </div>
      ))}
      
      {requests.length > 1 && (
        <div className="text-[10px] text-accent font-black uppercase tracking-widest text-center animate-pulse">
          +{requests.length - 1} more pending
        </div>
      )}
    </div>
  );
};
