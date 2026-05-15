import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface RoomLockedModalProps {
  isWaiting: boolean;
  onRequestAccess: () => void;
}

export const RoomLockedModal: React.FC<RoomLockedModalProps> = ({ isWaiting, onRequestAccess }) => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
      <div className="bg-surface border border-red-500/20 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-md p-6 md:p-10 flex flex-col items-center gap-6 md:gap-8 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse">
          <Shield size={48} />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-white tracking-tighter">Room is Locked</h2>
          <p className="text-sm text-textMuted leading-relaxed px-6">
            This workbook is private. You need the host's approval to join this session.
          </p>
        </div>
        
        <div className="w-full space-y-4">
          {isWaiting ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-xs font-black text-accent uppercase tracking-[0.2em] animate-pulse">
                Waiting for Host Approval...
              </p>
            </div>
          ) : (
            <button 
              onClick={onRequestAccess}
              className="w-full bg-accent hover:bg-accentHover text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-accent/20 active:scale-95"
            >
              Request Access
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
