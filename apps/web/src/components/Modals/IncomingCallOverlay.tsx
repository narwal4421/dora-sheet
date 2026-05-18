import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCallStore } from '../../store/useCallStore';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export const IncomingCallOverlay: React.FC = () => {
  const { incomingCall, startCall, clearIncomingCall } = useCallStore();

  useGSAP(() => {
    if (incomingCall) {
      gsap.fromTo('.incoming-call-box', 
        { scale: 0.9, opacity: 0, y: -50 }, 
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    startCall(incomingCall.video, incomingCall.audio);
    clearIncomingCall();
  };

  const handleDecline = () => {
    clearIncomingCall();
  };

  return (
    <div className="fixed inset-x-0 top-6 z-[120] flex items-center justify-center p-4 pointer-events-none">
      <div className="incoming-call-box pointer-events-auto flex items-center gap-4 bg-surface/90 backdrop-blur-md border border-accent/30 shadow-[0_20px_50px_rgba(99,102,241,0.3)] rounded-2xl px-6 py-4 max-w-sm w-full">
        <div className="p-3 bg-accent/10 text-accent rounded-full animate-pulse">
          {incomingCall.video ? <Video size={24} /> : <Phone size={24} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-white truncate">Incoming Call</h3>
          <p className="text-xs text-textMuted truncate">{incomingCall.callerName} is calling you...</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={handleDecline}
            className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all shadow-md active:scale-95"
            title="Decline"
          >
            <PhoneOff size={16} />
          </button>
          <button 
            onClick={handleAccept}
            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl transition-all shadow-md active:scale-95 animate-bounce"
            title="Accept"
          >
            <Phone size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
