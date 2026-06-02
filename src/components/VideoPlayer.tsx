import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize, FiActivity } from 'react-icons/fi';
import './VideoPlayer.css';

interface VideoPlayerProps {
  url: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const [bufferSecs, setBufferSecs] = useState(0);
  const [delaySecs, setDelaySecs] = useState(0);
  const [isLiveEdge, setIsLiveEdge] = useState(true);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let hls: Hls | null = null;
    setIsPlaying(false);

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        liveSyncDurationCount: 3,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('Auto-play prevented:', e));
      });
      
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
      setHlsInstance(hls);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log('Auto-play prevented:', e));
      });
      setHlsInstance(null);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  // Video Events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const onTimeUpdate = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const current = video.currentTime;
        const bufferLength = bufferedEnd - current;
        setBufferSecs(Math.max(0, bufferLength));
        
        let delay = 0;
        if (hlsInstance && hlsInstance.liveSyncPosition) {
           delay = hlsInstance.liveSyncPosition - current;
        } else {
           delay = bufferedEnd - current;
        }
        
        setDelaySecs(Math.max(0, delay));
        setIsLiveEdge(delay < 4); // 4 seconds margin for Live
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [hlsInstance]);

  // Controls Visibility
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const togglePlay = () => {
    if (videoRef.current?.paused) videoRef.current.play();
    else videoRef.current?.pause();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  const jumpToLive = () => {
    if (videoRef.current) {
        if (hlsInstance && hlsInstance.liveSyncPosition) {
            videoRef.current.currentTime = hlsInstance.liveSyncPosition;
        } else if (videoRef.current.buffered.length > 0) {
            videoRef.current.currentTime = videoRef.current.buffered.end(videoRef.current.buffered.length - 1) - 1;
        }
        videoRef.current.play();
    }
  }

  // Keyboard shortcut inside player (Space = play/pause, F = fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Only handle if we aren't typing in an input
        if (document.activeElement?.tagName === 'INPUT') return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        }
        if (e.code === 'KeyF') {
            e.preventDefault();
            toggleFullscreen();
        }
    };
    
    // Listen to fullscreen changes outside of double-click
    const onFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  if (!url) {
    return (
      <div className="video-placeholder">
        <p>الرجاء اختيار قناة للبدء بالمشاهدة</p>
      </div>
    );
  }

  return (
    <div 
      className={`video-wrapper custom-player ${isFullscreen ? 'is-fullscreen' : ''} ${!showControls && isPlaying ? 'hide-cursor' : ''}`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onDoubleClick={toggleFullscreen}
    >
      <video ref={videoRef} className="video-player" autoPlay />
      
      {/* Network Stats Overlay */}
      <div className={`stats-overlay ${showControls ? 'visible' : ''}`}>
        <FiActivity size={14} /> Buffer: {bufferSecs.toFixed(1)}s
      </div>

      {/* Main Overlay */}
      <div className={`player-controls-overlay ${showControls ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="controls-gradient"></div>
        <div className="controls-bottom" dir="ltr">
          <button className="control-btn play-btn" onClick={togglePlay}>
            {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
          </button>
          
          <div className="volume-container">
            <button className="control-btn" onClick={() => { if(videoRef.current) videoRef.current.muted = !isMuted; }}>
              {isMuted || volume === 0 ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
            </button>
            <input 
              type="range" 
              className="volume-slider" 
              min="0" max="1" step="0.05" 
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                if(videoRef.current) {
                  videoRef.current.volume = parseFloat(e.target.value);
                  videoRef.current.muted = false;
                }
              }}
            />
          </div>

          <div className="spacer"></div>

          <button className={`live-btn ${isLiveEdge ? 'is-live' : 'delayed'}`} onClick={jumpToLive}>
            <span className="live-dot">●</span> LIVE { !isLiveEdge && delaySecs > 1 ? `-${delaySecs.toFixed(0)}s` : ''}
          </button>

          <button className="control-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
