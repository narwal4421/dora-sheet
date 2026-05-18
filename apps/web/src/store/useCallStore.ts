import { create } from 'zustand';

export type CallStateStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface IncomingCallInfo {
  callerName: string;
  video: boolean;
  audio: boolean;
}

interface CallState {
  isCallActive: boolean;
  callToken: string | null;
  callStatus: CallStateStatus;
  showStats: boolean;
  incomingCall: IncomingCallInfo | null;
  
  // Initial device preferences
  initialVideo: boolean;
  initialAudio: boolean;
  
  // Actions
  startCall: (video: boolean, audio: boolean) => void;
  setToken: (token: string) => void;
  setStatus: (status: CallStateStatus) => void;
  endCall: () => void;
  toggleStats: () => void;
  setIncomingCall: (call: IncomingCallInfo) => void;
  clearIncomingCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  isCallActive: false,
  callToken: null,
  callStatus: 'disconnected',
  showStats: false,
  incomingCall: null,
  initialVideo: false,
  initialAudio: true,

  startCall: (video, audio) => set({ 
    isCallActive: true, 
    initialVideo: video, 
    initialAudio: audio,
    callStatus: 'connecting',
    incomingCall: null // Clear incoming call popup once active
  }),
  
  setToken: (token) => set({ callToken: token }),
  
  setStatus: (status) => set({ callStatus: status }),
  
  endCall: () => set({ 
    isCallActive: false, 
    callToken: null, 
    callStatus: 'disconnected'
  }),
  
  toggleStats: () => set((state) => ({ showStats: !state.showStats })),
  
  setIncomingCall: (call) => set({ incomingCall: call }),
  
  clearIncomingCall: () => set({ incomingCall: null })
}));
