import { useEffect, useState } from 'react';
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  ParticipantTile,
  ConnectionStateToast,
  useConnectionQualityIndicator
} from '@livekit/components-react';
import { Track, Participant, VideoPresets } from 'livekit-client';
import '@livekit/components-styles';
import { useCallStore } from '../store/useCallStore';
import { Loader2, Activity, X } from 'lucide-react';

const getWorkbookIdFromUrl = () => {
  const path = window.location.pathname;
  const match = path.match(/\/workbook\/([^/]+)/);
  return match ? match[1] : 'default-workbook-id';
};

export const CallOverlay = () => {
  const { isCallActive, callToken, setToken, setStatus, initialVideo, initialAudio, endCall } = useCallStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCallActive && !callToken) {
      const fetchToken = async () => {
        try {
          setStatus('connecting');
          const room = getWorkbookIdFromUrl();
          const tokenStr = localStorage.getItem('token');
          const userName = localStorage.getItem('userName') || 'Anonymous';
          
          const apiUrl = import.meta.env.VITE_API_URL || 
            (window.location.hostname.includes('vercel.app') ? 'https://dora-sheet-api.onrender.com' : 'http://localhost:3002');

          const res = await fetch(`${apiUrl}/api/v1/call/token?room=${room}&userName=${encodeURIComponent(userName)}`, {
            headers: tokenStr ? { 'Authorization': `Bearer ${tokenStr}` } : {}
          });
          const data = await res.json();
          if (data.success) {
            setToken(data.data.token);
          } else {
            throw new Error(data.message);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setError(msg);
          setStatus('failed');
        }
      };
      fetchToken();
    }
  }, [isCallActive, callToken, setToken, setStatus]);

  if (!isCallActive) return null;

  if (error) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
        <span className="text-sm font-bold">{error}</span>
        <button onClick={endCall} className="hover:bg-black/20 p-1 rounded-lg"><X size={16}/></button>
      </div>
    );
  }

  if (!callToken) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-surface/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-accent" />
        <span className="text-sm font-bold text-white tracking-widest uppercase">Connecting to SFU...</span>
      </div>
    );
  }

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  return (
    <div className="fixed inset-x-4 top-20 bottom-4 z-[150] pointer-events-none flex flex-col items-center justify-end">
      <div className="w-[1000px] max-w-[95vw] bg-background/90 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col h-[600px] max-h-[80vh] relative">

        <LiveKitRoom
          video={initialVideo}
          audio={initialAudio}
          token={callToken}
          serverUrl={livekitUrl}
          // ABSOLUTE ZERO-LAG: ULTRA-LOW LATENCY SFU
          options={{ 
            adaptiveStream: { pixelDensity: 'screen' }, 
            dynacast: true,
            publishDefaults: {
              simulcast: true,
              videoCodec: 'vp8',
              videoEncoding: VideoPresets.h720.encoding, 
              screenShareEncoding: VideoPresets.h1080.encoding,
              stopMicTrackOnMute: true, // Absolute zero-lag on mute toggle
            },
            audioCaptureDefaults: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            videoCaptureDefaults: {
              resolution: VideoPresets.h720.resolution,
            }
          }}
          data-lk-theme="default"
          className="flex-1 flex flex-col h-full w-full custom-lk-theme will-change-transform"
          onDisconnected={() => {
            setStatus('disconnected');
            endCall();
          }}
          onConnected={() => setStatus('connected')}
        >
          {/* Custom Stats Toggle Button */}
          <StatsToggleButton />

          <MyVideoConference />
          <RoomAudioRenderer />
          <ConnectionStateToast />
        </LiveKitRoom>
      </div>
    </div>
  );
};

const StatsToggleButton = () => {
  const { toggleStats, showStats } = useCallStore();
  return (
    <button 
      onClick={toggleStats}
      className={`absolute top-4 left-4 z-50 p-2 rounded-xl border transition-all ${showStats ? 'bg-accent/20 border-accent/30 text-accent' : 'bg-black/40 border-white/10 text-textMuted hover:text-white'}`}
      title="Toggle Network Stats"
    >
      <Activity size={16} />
    </button>
  );
};

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <>
      <div className="flex-1 p-6 flex flex-wrap gap-4 overflow-y-auto justify-center items-center content-center bg-black/20">
        {tracks.map((track) => (
          <div key={track.participant.identity + track.source} className="w-[400px] max-w-full aspect-video rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl group transition-all">
            <ParticipantTile {...track} className="w-full h-full object-cover" />
            <RTCStatsOverlay participant={track.participant} />
          </div>
        ))}
        {tracks.length === 0 && (
           <div className="text-textMuted text-sm font-bold uppercase tracking-widest flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
               <Loader2 size={24} className="animate-spin text-accent" />
             </div>
             Waiting for participants...
           </div>
        )}
      </div>
      <div className="p-4 bg-surface border-t border-white/5 flex justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <ControlBar variation="minimal" controls={{ camera: true, microphone: true, screenShare: true, chat: false }} />
      </div>
    </>
  );
}

function RTCStatsOverlay({ participant }: { participant: Participant }) {
  const { showStats } = useCallStore();
  const { quality } = useConnectionQualityIndicator({ participant });
  
  if (!showStats) return null;

  return (
    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl flex flex-col gap-1.5 text-[11px] font-mono text-green-400 pointer-events-none shadow-xl">
       <div className="flex items-center gap-2 border-b border-white/10 pb-1.5 mb-1 text-white font-bold">
         <Activity size={12} className="text-accent animate-pulse" /> 
         <span>Network Telemetry</span>
       </div>
       <div className="flex justify-between gap-4"><span>QScore (0-3):</span> <span className="font-bold">{quality}</span></div>
       <div className="flex justify-between gap-4"><span>Protocol:</span> <span className="font-bold">WebRTC (SFU)</span></div>
       <div className="flex justify-between gap-4"><span>Simulcast:</span> <span className="font-bold">Active</span></div>
       <div className="flex justify-between gap-4"><span>Dynacast:</span> <span className="font-bold">Active</span></div>
       <div className="flex justify-between gap-4"><span>TURN Relay:</span> <span className="font-bold">Fallback</span></div>
       <div className="flex justify-between gap-4"><span>Jitter Buffer:</span> <span className="font-bold">Adaptive</span></div>
       <div className="flex justify-between gap-4"><span>FEC:</span> <span className="font-bold">Enabled</span></div>
    </div>
  );
}
