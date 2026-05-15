import { create } from 'zustand';

export type CallStateStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface CallState {
  isCallActive: boolean;
  callToken: string | null;
  callStatus: CallStateStatus;
  showStats: boolean;
  
  // Initial device preferences
  initialVideo: boolean;
  initialAudio: boolean;
  
  // Actions
  startCall: (video: boolean, audio: boolean) => void;
  setToken: (token: string) => void;
  setStatus: (status: CallStateStatus) => void;
  endCall: () => void;
  toggleStats: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  isCallActive: false,
  callToken: null,
  callStatus: 'disconnected',
  showStats: false,
  initialVideo: false,
  initialAudio: true,

  startCall: (video, audio) => set({ 
    isCallActive: true, 
    initialVideo: video, 
    initialAudio: audio,
    callStatus: 'connecting'
  }),
  
  setToken: (token) => set({ callToken: token }),
  
  setStatus: (status) => set({ callStatus: status }),
  
  endCall: () => set({ 
    isCallActive: false, 
    callToken: null, 
    callStatus: 'disconnected'
  }),
  
  toggleStats: () => set((state) => ({ showStats: !state.showStats }))
}));
