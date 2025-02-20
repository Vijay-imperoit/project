import { useEffect, useRef } from 'react';

const RemoteVideo = ({ stream, userId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  console.log('stream,userId', stream, userId);

  console.log('Hello');

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef?.current.play();
      };
    }
  }, [stream]);

  return (
    <div className="relative aspect-video">
      <video
        ref={videoRef}
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
