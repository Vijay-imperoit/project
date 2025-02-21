import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useCallStore } from '../store/useCallStore';
import { webRTCService } from '../services/webrtc';
import RemoteVideo from './RemoteVideo';
// import { io } from 'socket.io-client';

const VideoCall: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [targetId, setTargetId] = useState('');
  const [incomingCall, setIncomingCall] = useState(false);
  const [callerName, setCallerName] = useState('');

  const {
    userId,
    localStream,
    remoteStreams,
    isCallActive,
    isMuted,
    isVideoEnabled,
    setLocalStream,
    setCallActive,
    toggleMute,
    toggleVideo,
  } = useCallStore();

  useEffect(() => {
    webRTCService.initializeSocket();
    const startLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    startLocalStream();
    webRTCService.register(userId, 'web');

    webRTCService.onIncomingCall((callerId) => {
      setIncomingCall(true);
      setCallerName(callerId);
    });

    // const socket = io('http://localhost:4000');

    // socket.on('connect', () => {
    //   console.log('Connected to server, socket ID:', socket.id);
    // });

    // socket.on('disconnect', () => {
    //   console.log('Disconnected from server');
    // });

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      webRTCService.cleanup();
    };
  }, [userId]);

  const handleCall = async () => {
    if (!isCallActive && targetId) {
      await webRTCService.initiateCall(targetId);
      setCallActive(true);
    } else {
      webRTCService.endCall();
      setCallActive(false);
    }
  };

  const handleAcceptCall = async () => {
    await webRTCService.acceptCall();
    setIncomingCall(false);
    setCallActive(true);
  };

  const handleRejectCall = () => {
    webRTCService.rejectCall();
    setIncomingCall(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* User ID and Call Controls */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Your ID: {userId}</h2>
          {!isCallActive && (
            <div className="flex gap-4">
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Enter target user ID"
                className="flex-1 px-4 py-2 rounded bg-gray-700 text-white"
              />
            </div>
          )}
        </div>

        {/* Incoming Call Notification */}
        {incomingCall && (
          <div className="fixed top-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg z-50">
            <h3 className="text-lg font-semibold mb-2">Incoming Call</h3>
            <p className="mb-4">From: {callerName}</p>
            <div className="flex gap-2">
              <button
                onClick={handleAcceptCall}
                className="bg-green-500 px-4 py-2 rounded hover:bg-green-600"
              >
                Accept
              </button>
              <button
                onClick={handleRejectCall}
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Local Video */}
          <div className="relative aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-lg bg-gray-800"
            />
            <div className="absolute bottom-4 left-4 text-sm bg-gray-800 px-2 py-1 rounded">
              You
            </div>
          </div>

          {/* Remote Videos */}
          {Array.from(remoteStreams.values()).map((remote) => (
            // <div
            //   key={remote.userId}
            //   className="relative aspect-video"
            // >
            //   <video
            //     autoPlay
            //     playsInline
            //     className="w-full h-full object-cover rounded-lg bg-gray-800"
            //     srcObject={remote.stream}
            //     // ref={videoRef}
            //   />
            //   <div className="absolute bottom-4 left-4 text-sm bg-gray-800 px-2 py-1 rounded">
            //     {remote.userId}
            //   </div>
            // </div>
            <>
              {console.log(remote.userId, remote.stream)}
              <RemoteVideo
                key={remote.userId}
                stream={remote.stream}
                userId={remote.userId}
              />
            </>
          ))}
        </div>

        {/* Controls */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4">
          <div className="max-w-md mx-auto flex justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full ${
                isMuted ? 'bg-red-500' : 'bg-gray-600'
              }`}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full ${
                !isVideoEnabled ? 'bg-red-500' : 'bg-gray-600'
              }`}
            >
              {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
            <button
              onClick={handleCall}
              disabled={!targetId && !isCallActive}
              className={`p-4 rounded-full ${
                isCallActive ? 'bg-red-500' : 'bg-green-500'
              } ${
                !targetId && !isCallActive
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {isCallActive ? <PhoneOff size={24} /> : <Phone size={24} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
