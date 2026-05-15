import React, { useState, useRef } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Users, 
  Settings, Minimize2, ScreenShare, SignalHigh 
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface Participant {
  id: string;
  name: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isLocal: boolean;
  stream?: MediaStream;
  color: string;
}

/**
 * GOD LEVEL CALL OVERLAY
 * High-performance real-time communication hub.
 * Features cinematic GSAP transitions, adaptive grid layouts, 
 * and premium glassmorphic controls.
 */
export const CallOverlay: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (isActive) {
      gsap.fromTo('.call-container', 
        { y: 100, opacity: 0, scale: 0.9 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }
  }, [isActive]);

  const toggleCall = () => {
    if (!isActive) {
      // Mock joining a call
      setParticipants([
        { id: 'local', name: 'You', isAudioEnabled: true, isVideoEnabled: true, isLocal: true, color: '#6366f1' },
        { id: 'remote-1', name: 'Pranjal', isAudioEnabled: true, isVideoEnabled: true, isLocal: false, color: '#ec4899' },
      ]);
    } else {
      setParticipants([]);
    }
    setIsActive(!isActive);
  };

  if (!isActive && !isMinimized) {
    return (
      <button 
        onClick={toggleCall}
        className="fixed bottom-6 right-6 p-4 bg-accent text-white rounded-full shadow-[0_8px_32px_rgba(99,102,241,0.4)] hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <Video size={24} className="group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`call-container fixed bottom-6 right-6 z-50 transition-all duration-500 ease-premium ${
        isMinimized ? 'w-16 h-16 rounded-full' : 'w-80 rounded-2xl'
      } bg-surface/80 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden`}
    >
      {!isMinimized && (
        <>
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-textMain uppercase tracking-widest">SFU Live Link</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-lg text-textMuted transition-all">
                <Minimize2 size={14} />
              </button>
              <button onClick={toggleCall} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all">
                <PhoneOff size={14} />
              </button>
            </div>
          </div>

          {/* Participant Grid */}
          <div className="p-3 grid grid-cols-2 gap-2 min-h-[160px]">
            {participants.map(p => (
              <div key={p.id} className="relative aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/5 group">
                {p.isVideoEnabled ? (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xl" style={{ backgroundColor: p.color }}>
                      {p.name[0]}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VideoOff size={20} className="text-white/20" />
                  </div>
                )}
                
                {/* Overlay Info */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded-md">
                    {p.name} {p.isLocal && '(You)'}
                  </span>
                  <div className="flex gap-1">
                    {!p.isAudioEnabled && <MicOff size={10} className="text-rose-500" />}
                    <SignalHigh size={10} className="text-emerald-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="p-4 bg-white/5 flex items-center justify-around">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-xl transition-all ${isMuted ? 'bg-rose-500/20 text-rose-500' : 'bg-white/10 text-textMain hover:bg-white/20'}`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button 
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3 rounded-xl transition-all ${isVideoOff ? 'bg-rose-500/20 text-rose-500' : 'bg-white/10 text-textMain hover:bg-white/20'}`}
            >
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
            <button className="p-3 bg-white/10 text-textMain hover:bg-white/20 rounded-xl transition-all">
              <ScreenShare size={20} />
            </button>
            <button className="p-3 bg-white/10 text-textMain hover:bg-white/20 rounded-xl transition-all">
              <Settings size={20} />
            </button>
          </div>
        </>
      )}

      {isMinimized && (
        <button 
          onClick={() => setIsMinimized(false)}
          className="w-full h-full flex items-center justify-center bg-accent text-white"
        >
          <div className="relative">
            <Users size={24} />
            <div className="absolute -top-2 -right-2 bg-rose-500 text-[10px] font-bold px-1 rounded-full border border-white">
              {participants.length}
            </div>
          </div>
        </button>
      )}
    </div>
  );
};
