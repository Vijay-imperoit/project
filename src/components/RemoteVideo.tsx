import { useEffect, useRef } from 'react';

const RemoteVideo = ({ stream, userId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  console.log('stream,userId', stream, userId);

  console.log('Hello');
  console.log('Attaching stream to video:', videoRef.current, stream);

  // useEffect(() => {
  //   if (videoRef.current && stream) {
  //     videoRef.current.srcObject = null;
  //     const video = videoRef.current;
  //     // 1️⃣ Detach previous stream if any
  //     if (video.srcObject) {
  //       console.log('🔄 Clearing existing video stream...');
  //       (video.srcObject as MediaStream)
  //         .getTracks()
  //         .forEach((track) => track.stop());
  //       video.srcObject = null;
  //     }

  //     // 2️⃣ Attach new stream
  //     console.log('🎥 Attaching new MediaStream:', stream.id);
  //     video.srcObject = stream;

  //     // 3️⃣ Use `oncanplay` to ensure video plays only when ready
  //     // video.oncanplay = () => {
  //     //   console.log('✅ Video can play, attempting to start...');
  //     //   video.play().catch((err) => {
  //     //     console.error('🚨 Video playback error (Retrying...):', err);
  //     //     setTimeout(
  //     //       () =>
  //     //         video.play().catch((e) => console.error('🔥 Still failed:', e)),
  //     //       500
  //     //     );
  //     //   });
  //     // };

  //     console.log('Video track enabled:', stream.getVideoTracks()[0]?.enabled);

  //     console.log('Attached Stream', videoRef.current.srcObject);
  //     if (videoRef.current.srcObject) {
  //       console.log('Stream attached to video:', videoRef.current.srcObject.id);
  //       console.log('Remote user stream ID:', stream.id);
  //       if (videoRef.current.srcObject.id === stream.id) {
  //         console.log('✅ Remote stream is correctly attached!');
  //       } else {
  //         console.warn('⚠️ Stream mismatch! Check your assignment logic.');
  //       }
  //     }
  //     // videoRef.current
  //     //   .play()
  //     //   .catch((error) => console.error('Error playing video:', error));
  //     console.log('Video ReadyState:', videoRef.current?.readyState);
  //     console.log('Video Paused:', videoRef.current?.paused);
  //     if (stream && stream.active) {
  //       console.log('✅ MediaStream is active');
  //     } else {
  //       console.warn('⚠️ MediaStream is inactive or undefined');
  //     }
  //     if (!stream) {
  //       console.error('🚨 No MediaStream available!');
  //     } else {
  //       console.log('🎥 Stream ID:', stream.id);
  //       console.log('🎵 Audio Tracks:', stream.getAudioTracks());
  //       console.log('📹 Video Tracks:', stream.getVideoTracks());

  //       if (stream.getVideoTracks().length === 0) {
  //         console.warn('⚠️ No video tracks found in the stream!');
  //       }
  //     }
  //     // if (videoRef.current) {
  //     //   videoRef.current.onloadedmetadata = () => {
  //     //     console.log('📌 Metadata loaded, attempting to play');
  //     //     videoRef.current
  //     //       .play()
  //     //       .catch((err) => console.error('Error playing video:', err));
  //     //   };
  //     // }
  //     return () => {
  //       console.log('🛑 Cleanup: Stopping video playback.');
  //       video.pause();
  //       video.srcObject = null;
  //     };
  //   }
  // }, [stream]);

  useEffect(() => {
    const videoElement = document.getElementById(
      `video-${userId}`
    ) as HTMLVideoElement;
    if (videoElement && stream) {
      videoElement.srcObject = stream;
      videoElement.play();
      console.log(`✅ Stream attached to video-${userId}`);
    }
  }, [stream, userId]);

  return (
    <div className="relative aspect-video">
      <video
        // ref={videoRef}
        id={`video-${userId}`}
        autoPlay
        playsInline
        className="w-full h-full object-cover rounded-lg bg-gray-800"
      />
      <div className="absolute bottom-4 left-4 text-sm bg-gray-800 px-2 py-1 rounded">
        {userId}
      </div>
    </div>
  );
};

export default RemoteVideo;
