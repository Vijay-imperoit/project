import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

interface RemoteStream {
  userId: string;
  stream: MediaStream;
}

interface CallState {
  userId: string;
  localStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  isCallActive: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  targetUserId: string;
  setUserId: (id: string) => void;
  setTargetUserId: (id: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  setCallActive: (active: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  userId: uuidv4(),
  targetUserId: '',
  localStream: null,
  remoteStreams: new Map(),
  isCallActive: false,
  isMuted: false,
  isVideoEnabled: true,
  setUserId: (id) => set({ userId: id }),
  setTargetUserId: (id) => set({ targetUserId: id }),
  setLocalStream: (stream) => set({ localStream: stream }),
  addRemoteStream: (userId, stream) =>
    set((state) => ({
      remoteStreams: new Map(state.remoteStreams).set(userId, { userId, stream }),
    })),
  removeRemoteStream: (userId) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams);
      newStreams.delete(userId);
      return { remoteStreams: newStreams };
    }),
  setCallActive: (active) => set({ isCallActive: active }),
  toggleMute: () => set((state) => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    return { isMuted: !state.isMuted };
  }),
  toggleVideo: () => set((state) => {
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    return { isVideoEnabled: !state.isVideoEnabled };
  }),
}));