import React, { useState, useEffect, useCallback } from 'react';
import { PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2, MonitorUp, Phone, Loader2 } from 'lucide-react';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useCallStore } from '../../store/useCallStore';
import { useSheetStore } from '../../store/useSheetStore';
import { getWorkbookIdFromUrl } from '../../utils/workbookUrl';

const CallOverlayContent: React.FC<{ 
  isMinimized: boolean; 
  setIsMinimized: (min: boolean) => void; 
}> = ({ isMinimized, setIsMinimized }) => {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const { endCall } = useCallStore();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const [callDuration, setCallDuration] = useState('00:00');

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const diff = Date.now() - start;
      const mins = Math.floor(diff / 60000).toString().padStart(2, '0');
      const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setCallDuration(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMicrophone = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err) {
      console.error('Failed to toggle microphone', err);
    }
  };

  const toggleCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.error('Failed to toggle camera', err);
    }
  };

  const toggleScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (err) {
      console.error('Failed to toggle screen share', err);
    }
  };

  // Import participant components from LiveKit React SDK to build participant tiles customly
  const getParticipantTile = (trackRef: typeof tracks[0]) => {
    const { participant, source } = trackRef;
    const isLocal = participant.isLocal;
    const cameraOn = participant.isCameraEnabled;

    if (source === Track.Source.Camera && !cameraOn) {
      // Don't render video track if camera is turned off by participant
      return null;
    }

    // Render the video stream using standard video element or track ref
    // The LiveKit SDK has a custom element `<VideoTrack>` or `<ParticipantTile>`
    // Using standard `<ParticipantTile>` is highly reliable.
    // For visual consistency, let's render a custom sleek layout.
    return (
      <div 
        key={`${participant.identity}_${source}`}
        className="rounded-xl overflow-hidden bg-black/60 border border-white/5 relative aspect-video flex flex-col justify-between"
      >
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-zinc-900">
          {trackRef.publication?.track ? (
            <video 
              ref={(el) => {
                if (el && trackRef.publication?.track) {
                  trackRef.publication.track.attach(el);
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              muted={isLocal}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-zinc-950/80 text-zinc-600 font-black uppercase text-[10px] tracking-wider">
              No Feed
            </div>
          )}
        </div>
        <div className="absolute top-2 left-2 z-10 bg-black/45 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-white tracking-wide">
            {isLocal ? 'You' : participant.name || participant.identity}
          </span>
        </div>
      </div>
    );
  };

  const activeVideoTracks = tracks.filter(t => t.source === Track.Source.ScreenShare || (t.source === Track.Source.Camera && t.participant.isCameraEnabled));

  if (isMinimized) {
    return (
      <div className="flex items-center gap-2 bg-surface/90 backdrop-blur-xl border border-accent/30 shadow-[0_8px_30px_rgb(0,0,0,0.5)] px-4 py-2.5 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
        <span className="text-[10px] font-black tracking-widest text-white uppercase mr-1">On Call</span>
        <span className="text-[10px] font-mono text-textMuted bg-black/35 px-2 py-0.5 rounded-full mr-2">{callDuration}</span>
        
        <div className="flex items-center gap-1.5 border-l border-white/10 pl-2.5">
          <button 
            onClick={toggleMicrophone} 
            className={`p-1.5 rounded-xl transition-all ${isMicrophoneEnabled ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-rose-400 hover:bg-rose-500/10 bg-rose-500/5'}`}
            title={isMicrophoneEnabled ? "Mute Mic" : "Unmute Mic"}
          >
            {isMicrophoneEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
          
          <button 
            onClick={toggleCamera} 
            className={`p-1.5 rounded-xl transition-all ${isCameraEnabled ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-rose-400 hover:bg-rose-500/10 bg-rose-500/5'}`}
            title={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isCameraEnabled ? <Video size={14} /> : <VideoOff size={14} />}
          </button>

          <button 
            onClick={toggleScreenShare} 
            className={`p-1.5 rounded-xl transition-all ${isScreenShareEnabled ? 'text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/5' : 'text-textMuted hover:text-white hover:bg-white/5'}`}
            title={isScreenShareEnabled ? "Stop Sharing" : "Screen Share"}
          >
            <MonitorUp size={14} />
          </button>
          
          <button 
            onClick={() => setIsMinimized(false)} 
            className="p-1.5 text-textMuted hover:text-white rounded-xl transition-all hover:bg-white/5"
            title="Expand Call Panel"
          >
            <Maximize2 size={14} />
          </button>
          
          <button 
            onClick={endCall} 
            className="p-1.5 text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all shadow-md active:scale-95 ml-1"
            title="Hang Up"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[340px] md:w-[380px] h-[360px] bg-surface/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
      {/* Call Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">Live Call</span>
          <span className="text-[10px] font-mono text-textMuted bg-black/35 px-2 py-0.5 rounded-full ml-1">{callDuration}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsMinimized(true)} 
            className="p-1.5 text-textMuted hover:text-white rounded-lg transition-all hover:bg-white/5"
            title="Minimize"
          >
            <Minimize2 size={15} />
          </button>
          <button 
            onClick={endCall} 
            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all"
            title="End Call"
          >
            <PhoneOff size={15} />
          </button>
        </div>
      </div>

      {/* Participant Video Grid */}
      <div className="flex-1 overflow-hidden min-h-0 bg-black/40 relative">
        <div className="grid grid-cols-2 gap-2 p-3 h-full overflow-y-auto">
          {activeVideoTracks.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center text-center p-4 text-textMuted h-full justify-center">
              <Phone className="w-10 h-10 text-accent animate-pulse mb-3" />
              <p className="text-sm font-black text-white uppercase tracking-widest">Voice Call Connected</p>
              <p className="text-xs text-textMuted mt-1 px-4">Camera is disabled. Click camera button to share video.</p>
            </div>
          ) : (
            activeVideoTracks.map((track) => getParticipantTile(track))
          )}
        </div>
      </div>

      {/* Call controls at the bottom */}
      <div className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-center gap-3">
        <button 
          onClick={toggleMicrophone}
          className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
            isMicrophoneEnabled 
              ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:scale-105 active:scale-95' 
              : 'bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 hover:scale-105 active:scale-95'
          }`}
          title={isMicrophoneEnabled ? "Mute Mic" : "Unmute Mic"}
        >
          {isMicrophoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        <button 
          onClick={toggleCamera}
          className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
            isCameraEnabled 
              ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:scale-105 active:scale-95' 
              : 'bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 hover:scale-105 active:scale-95'
          }`}
          title={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
        >
          {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        <button 
          onClick={toggleScreenShare}
          className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
            isScreenShareEnabled 
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 animate-pulse hover:scale-105 active:scale-95' 
              : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:scale-105 active:scale-95'
          }`}
          title={isScreenShareEnabled ? "Stop Sharing" : "Screen Share"}
        >
          <MonitorUp size={18} />
        </button>

        <button 
          onClick={endCall}
          className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 duration-300 flex items-center justify-center"
          title="Hang Up"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
};

export const ActiveCallOverlay: React.FC = () => {
  const { isCallActive, callToken, endCall, setToken, setStatus } = useCallStore();
  const localUserName = useSheetStore(state => state.localUserName);
  const [isMinimized, setIsMinimized] = useState(false);

  const workbookId = getWorkbookIdFromUrl();
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  const fetchToken = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL ||
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3002' : 'https://dora-sheet-api.onrender.com');
      const response = await fetch(`${apiUrl}/api/v1/call/token?room=${workbookId}&userName=${encodeURIComponent(localUserName)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
      endCall();
    }
  }, [workbookId, localUserName, setToken, setStatus, endCall]);

  useEffect(() => {
    if (isCallActive && !callToken) {
      fetchToken();
    }
  }, [isCallActive, callToken, fetchToken]);

  if (!isCallActive) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[120] pointer-events-none select-none">
      <div className="pointer-events-auto">
        {!callToken ? (
          <div className="w-[180px] bg-surface/90 backdrop-blur-md border border-accent/20 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-xl animate-pulse">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Connecting...</span>
          </div>
        ) : (
          <LiveKitRoom
            video={true}
            audio={true}
            token={callToken}
            serverUrl={livekitUrl}
            onDisconnected={() => endCall()}
            className="overflow-hidden bg-transparent"
            style={{ '--lk-bg': 'transparent' } as React.CSSProperties}
          >
            <CallOverlayContent isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
};
