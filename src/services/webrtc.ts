import { io, Socket } from 'socket.io-client';
import { useCallStore } from '../store/useCallStore';

class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private socket: Socket | null = null;
  private userId: string | null = null;
  private pendingOffer: RTCSessionDescription | null = null;
  private pendingCallerId: string | null = null;
  private incomingCallHandler: ((callerId: string) => void) | null = null;
  private socketConnectedPromise: Promise<void> | null = null;
  private pendingCandidates: Map<string, RTCIceCandidate[]> = new Map();

  // constructor() {
  //   const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  //   const host = window.location.hostme;
  //   const port = '4000';
  //   const serverUrl = `${protocol}//${host}:${port}`;
  //   console.log('serverUrl', serverUrl);

  //   this.socket = io(serverUrl, {
  //     transports: ['websocket'],
  //     upgrade: false,
  //     reconnection: true,
  //     reconnectionAttempts: 10,
  //   });
  //   this.socketConnectedPromise = new Promise((resolve, reject) => {
  //     this.socket?.on('connect', () => {
  //       console.log('Socket connected with ID:', this.socket?.id);
  //       resolve();
  //     });

  //     this.socket?.on('connect_error', (error) => {
  //       console.error('Connection error:', error);
  //       reject(error);
  //     });
  //   });

  //   console.log('this.socket', this.socket);
  //   this.setupSocketListeners();
  // }

  public initializeSocket() {
    // if (this.socket) return;

    if (this.socket && this.socket.connected) {
      console.log('Socket already initialized and connected');
      return;
    }

    // const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const protocol = 'http';
    // const host = window.location.hostname;
    // const port = '4000';
    // const serverUrl = `${protocol}//${host}:${port}`;
    // const serverUrl = `http://localhost:4000`;
    const serverUrl = `https://7b3a-2401-4900-1f3e-4491-1497-b216-2c13-cde4.ngrok-free.app`;
    console.log('serverUrl', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    this.socketConnectedPromise = new Promise((resolve, reject) => {
      this.socket?.on('connect', () => {
        console.log('Socket connected with ID:', this.socket?.id);
        resolve();
      });

      this.socket?.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });
      this.socket?.on('disconnect', () => {
        console.log('Socket disconnected. Attempting to reconnect...');
        setTimeout(() => {
          this.socket?.connect();
        }, 5000);
      });
    });

    console.log('this.socket', this.socket);
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) {
      console.error('Socket is not initialized!');
      return;
    }

    // if (!this.socket.connected) {
    //   console.warn('Socket is not connected, retrying...');
    //   this.socket.connect(); // Attempt reconnection
    //   return;
    // }
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      console.log('this.socket', this.socket);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setTimeout(() => {
        this.socket?.connect();
      }, 5000);
    });

    this.socket.on('incoming-call', async ({ from, offer }) => {
      console.log('Incoming call from:', from);
      this.pendingOffer = offer;
      this.pendingCallerId = from;
      if (this.incomingCallHandler) {
        this.incomingCallHandler(from);
      }
    });

    this.socket.on('call-accepted', async ({ answer, from }) => {
      console.log('Call accepted, setting remote description');
      const peerConnection = this.peerConnections.get(from);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          console.log('Remote description set successfully');
          // Add any pending candidates after remote description is set
          const pendingCandidates = this.pendingCandidates.get(from) || [];
          console.log(
            `Adding ${pendingCandidates.length} pending candidates for ${from}`
          );

          for (const candidate of pendingCandidates) {
            try {
              await peerConnection.addIceCandidate(candidate);
              console.log('Added pending candidate successfully');
            } catch (error) {
              console.error('Error adding pending candidate:', error);
            }
          }
          this.pendingCandidates.delete(from);
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    this.socket.on('call-rejected', ({ from }) => {
      this.removePeerConnection(from);
      useCallStore.getState().removeRemoteStream(from);
    });

    this.socket.on('ice-candidate', async ({ candidate, from }) => {
      console.log('Received ICE candidate from:', from);
      console.log(`🔹 Received ICE Candidate from ${from}:`, candidate);
      const peerConnection = this.peerConnections.get(from);
      if (peerConnection) {
        try {
          if (
            peerConnection.remoteDescription &&
            peerConnection.remoteDescription.type
          ) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log('Added ICE candidate immediately');
          } else {
            // Store candidate if remote description is not set yet
            const pendingCandidates = this.pendingCandidates.get(from) || [];
            pendingCandidates.push(new RTCIceCandidate(candidate));
            this.pendingCandidates.set(from, pendingCandidates);
            console.log('Stored ICE candidate for later');
          }
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    this.socket.on('user-disconnected', ({ userId }) => {
      this.removePeerConnection(userId);
      useCallStore.getState().removeRemoteStream(userId);
    });
  }

  public onIncomingCall(handler: (callerId: string) => void) {
    this.incomingCallHandler = handler;
  }

  public async register(userId: string, deviceType: 'web' | 'mobile') {
    await this.socketConnectedPromise;
    this.userId = userId;
    this.socket?.emit('register', { userId, deviceType });
  }

  private async setupPeerConnection(targetUserId: string) {
    const configuration = {
      iceServers: [
        // { urls: 'stun:stun.l.google.com:19302' },
        // { urls: 'stun:stun1.l.google.com:19302' },
        // { urls: 'stun:stun2.l.google.com:19302' },
        // { urls: 'stun:stun3.l.google.com:19302' },
        // { urls: 'stun:stun4.l.google.com:19302' },
        {
          urls: ['stun:eu-turn4.xirsys.com'],
        },
        {
          username:
            'ml0jh0qMKZKd9P_9C0UIBY2G0nSQMCFBUXGlk6IXDJf8G2uiCymg9WwbEJTMwVeiAAAAAF2__hNSaW5vbGVl',
          credential: '4dd454a6-feee-11e9-b185-6adcafebbb45',
          urls: [
            'turn:eu-turn4.xirsys.com:80?transport=udp',
            'turn:eu-turn4.xirsys.com:3478?transport=tcp',
          ],
        },
        // {
        //   urls: 'turn:numb.viagenie.ca',
        //   username: 'webrtc@live.com',
        //   credential: 'muazkh',
        // },
        // {
        //   urls: 'turn:numb.viagenie.ca',
        //   credential: 'muazkh',
        //   username: 'webrtc@live.com',
        // },
        // {
        //   urls: 'turn:192.158.29.39:3478?transport=udp',
        //   credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        //   username: '28224511:1379330808',
        // },
        // {
        //   urls: 'turn:numb.viagenie.ca:443?transport=tcp',
        //   credential: 'muazkh',
        //   username: 'webrtc@live.com',
        // },
        // {
        //   urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
        //   username: 'webrtc',
        //   credential: 'webrtc',
        // },
      ],
      iceCandidatePoolSize: 10,
      // bundlePolicy: 'max-bundle',
      // rtcpMuxPolicy: 'require',
      // iceTransportPolicy: 'all',
    };

    const peerConnection = new RTCPeerConnection(configuration);
    this.peerConnections.set(targetUserId, peerConnection);

    const localStream = useCallStore.getState().localStream;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log('Adding track to peer connection:', track.kind);
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.ontrack = (event) => {
      console.log(
        'Received remote track from:',
        targetUserId,
        'Stream:',
        event.streams[0]
      );
      console.log('Received remote track:', event.track.kind);
      if (event.track.kind === 'video') {
        console.log('Adding remote video stream for:', targetUserId);
      }
      if (event.streams && event.streams[0]) {
        console.log('Adding remote stream for user:', targetUserId);
        useCallStore.getState().addRemoteStream(targetUserId, event.streams[0]);
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(
          'Sending ICE candidate to:',
          targetUserId,
          'Candidate:',
          event.candidate
        );

        console.log('🔹 Sending ICE Candidate:', event.candidate);
        if (peerConnection.remoteDescription) {
          this.socket?.emit('ice-candidate', {
            targetUserId,
            candidate: event.candidate,
          });
        } else {
          // Store candidate for later
          const pendingCandidates =
            this.pendingCandidates.get(targetUserId) || [];
          pendingCandidates.push(event.candidate);
          this.pendingCandidates.set(targetUserId, pendingCandidates);
        }

        // this.sendCandidateToRemote(event.candidate);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
      if (
        peerConnection.iceConnectionState === 'disconnected' ||
        peerConnection.iceConnectionState === 'failed'
      ) {
        console.log('Attempting to reconnect...');
        this.restartIce(targetUserId, peerConnection);
      }
      if (peerConnection.iceConnectionState === 'disconnected') {
        this.removePeerConnection(targetUserId);
        useCallStore.getState().removeRemoteStream(targetUserId);
      } else if (peerConnection.iceConnectionState === 'failed') {
        console.error(`Peer connection with ${targetUserId} failed`);
      } else if (peerConnection.iceConnectionState === 'connected') {
        console.log(`Peer connection with ${targetUserId} established`);
      }
    };

    return peerConnection;
  }

  // private sendCandidateToRemote(candidate: RTCIceCandidate) {
  //   console.log('Sending candidate to remote:', candidate);
  // }

  private async restartIce(
    targetUserId: string,
    peerConnection: RTCPeerConnection
  ) {
    try {
      const offer = await peerConnection.createOffer({ iceRestart: true });
      await peerConnection.setLocalDescription(offer);
      this.socket?.emit('call-user', {
        targetUserId,
        offer,
      });
    } catch (error) {
      console.error('Error restarting ICE:', error);
    }
  }

  private removePeerConnection(userId: string) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
  }

  public async initiateCall(targetUserId: string) {
    console.log('Initiating call to:', targetUserId);
    const peerConnection = await this.setupPeerConnection(targetUserId);

    if (!peerConnection) {
      console.error('Peer connection setup failed');
      return;
    }

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peerConnection.setLocalDescription(offer);

    if (!this.socket) {
      console.error('Socket is not initialized!');
      return;
    }
    if (!this.socket.connected) {
      console.error('Socket is not connected!');
      return;
    }

    this.socket?.emit('call-user', {
      targetUserId,
      offer,
    });
  }

  public async acceptCall() {
    if (!this.pendingOffer || !this.pendingCallerId) return;

    try {
      const peerConnection = await this.setupPeerConnection(
        this.pendingCallerId
      );
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(this.pendingOffer)
      );

      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true, // Ensure video is accepted
      });
      await peerConnection.setLocalDescription(answer);

      this.socket?.emit('call-accepted', {
        targetUserId: this.pendingCallerId,
        answer,
      });

      // Add any pending candidates after remote description is set
      const pendingCandidates =
        this.pendingCandidates.get(this.pendingCallerId) || [];
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(candidate);
      }
      this.pendingCandidates.delete(this.pendingCallerId);
    } catch (error) {
      console.error('Error accepting call:', error);
      this.removePeerConnection(this.pendingCallerId);
      // var candidate = new RTCIceCandidate(msg.candidate);
    } finally {
      this.pendingOffer = null;
      this.pendingCallerId = null;
    }
  }

  public rejectCall() {
    if (!this.pendingCallerId) return;

    this.socket?.emit('call-rejected', {
      targetUserId: this.pendingCallerId,
    });

    this.pendingOffer = null;
    this.pendingCallerId = null;
  }

  public endCall() {
    for (const [userId, peerConnection] of this.peerConnections) {
      peerConnection.close();
      useCallStore.getState().removeRemoteStream(userId);
    }
    this.peerConnections.clear();
    useCallStore.getState().setCallActive(false);
  }

  public cleanup() {
    this.endCall();
    this.socket?.disconnect();
  }
}

export const webRTCService = new WebRTCService();
