import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LiveKitRoom, 
  VideoConference, 
  RoomAudioRenderer
} from '@livekit/components-react';
import '@livekit/components-styles';
import { 
  Video, PhoneOff, Minimize2, SignalHigh, Loader2, Maximize2
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useCallStore } from '../store/useCallStore';
import { useSheetStore } from '../store/useSheetStore';
import { toast } from '../store/useToastStore';
import { getWorkbookIdFromUrl } from '../utils/workbookUrl';

/**
 * GOD LEVEL CALL OVERLAY
 * High-performance real-time communication hub using LiveKit SFU.
 * Features cinematic GSAP transitions, adaptive grid layouts, 
 * and premium glassmorphic controls.
 */
export const CallOverlay: React.FC = () => {
  const { isCallActive, callToken, startCall, endCall, setToken, setStatus } = useCallStore();
  const { localUserName } = useSheetStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const workbookId = getWorkbookIdFromUrl();
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  useGSAP(() => {
    if (isCallActive && !isMinimized) {
      gsap.fromTo('.call-container', 
        { y: 100, opacity: 0, scale: 0.9 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }
  }, [isCallActive, isMinimized]);

  const fetchToken = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 
        (window.location.hostname.includes('vercel.app') ? 'https://dora-sheet-api.onrender.com' : 'http://localhost:3002');
      
      const response = await fetch(`${apiUrl}/api/v1/call/token?room=${workbookId}&userName=${encodeURIComponent(localUserName)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setToken(result.data.token);
        setStatus('connected');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Failed to fetch call token', err);
      toast('Failed to join call. Check your connection.', 'error');
      endCall();
    }
  }, [workbookId, localUserName, setToken, setStatus, endCall]);

  useEffect(() => {
    if (isCallActive && !callToken) {
      fetchToken();
    }
  }, [isCallActive, callToken, fetchToken]);

  if (!isCallActive && !isMinimized) {
    return (
      <button 
        onClick={() => startCall(true, true)}
        className="fixed bottom-6 right-6 p-4 bg-accent text-white rounded-full shadow-[0_8px_32px_rgba(99,102,241,0.4)] hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <Video size={24} className="group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-in zoom-in duration-300">
        <button 
          onClick={() => setIsMinimized(false)}
          className="w-16 h-16 rounded-full bg-accent text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-all group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-accent to-accentHover opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center">
            <Maximize2 size={24} />
            <span className="text-[8px] font-black uppercase mt-1">Live</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="call-container fixed bottom-6 right-6 z-[100] w-[340px] h-[480px] bg-surface/90 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-inner">
            <Video size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Workbook Call</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-textMuted uppercase tracking-widest">Active SFU Link</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/5 rounded-xl text-textMuted hover:text-white transition-all">
            <Minimize2 size={18} />
          </button>
          <button onClick={() => endCall()} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all shadow-lg shadow-rose-500/10">
            <PhoneOff size={18} />
          </button>
        </div>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1 relative overflow-hidden bg-black/20">
        {!callToken ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="text-[10px] font-black text-textMuted uppercase tracking-[0.2em] animate-pulse">Establishing Connection...</span>
          </div>
        ) : (
          <LiveKitRoom
            video={true}
            audio={true}
            token={callToken}
            serverUrl={livekitUrl}
            onDisconnected={() => endCall()}
            className="h-full flex flex-col"
            style={{ '--lk-bg': 'transparent' } as any}
          >
            <div className="flex-1 overflow-hidden p-4">
               <VideoConference 
                 className="h-full border-none" 
                 style={{ border: 'none' }} 
               />
            </div>
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <SignalHigh size={14} className="text-emerald-500" />
          <span className="text-[9px] font-black text-textMuted uppercase tracking-widest">HD Streaming Optimized</span>
        </div>
      </div>
    </div>
  );
};
