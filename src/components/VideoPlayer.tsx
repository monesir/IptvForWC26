import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize, FiActivity, FiSettings, FiMonitor, FiHeadphones, FiMicOff } from 'react-icons/fi';
import { MdPictureInPictureAlt } from 'react-icons/md';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Center Cancel Nodes
  const cancelGainLtoRRef = useRef<GainNode | null>(null);
  const cancelGainRtoLRef = useRef<GainNode | null>(null);
  const directGainLRef = useRef<GainNode | null>(null);
  const directGainRRef = useRef<GainNode | null>(null);

  const [audioBoost, setAudioBoost] = useState(1);
  const [stadiumLevel, setStadiumLevel] = useState<0 | 1 | 2 | 3>(0);
  
  const [bufferSecs, setBufferSecs] = useState(0);
  const [delaySecs, setDelaySecs] = useState(0);
  const [resolution, setResolution] = useState('جارِ الجلب...');
  const [isLiveEdge, setIsLiveEdge] = useState(true);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [_isPip, setIsPip] = useState(false);

  const [latencyProfile, setLatencyProfile] = useState<'stable' | 'balanced' | 'fast' | 'ultra'>(() => {
    return (localStorage.getItem('latency_profile') as any) || 'stable';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAudioDevices, setShowAudioDevices] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('default');
  const [filterMode, setFilterMode] = useState<'normal' | 'hdr' | 'shadow' | 'vivid'>('normal');

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Fetch audio output devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission first to get labels
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        setAudioDevices(outputs);
      } catch (err) {
        console.warn('Could not fetch audio output devices', err);
      }
    };
    fetchDevices();
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
  }, []);

  // Change Audio Sink
  const changeAudioDevice = async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    setShowAudioDevices(false);
    
    // 1. Set Sink ID on Web Audio API Context (since we use it for Stadium/Karaoke mode)
    if (audioCtxRef.current && typeof (audioCtxRef.current as any).setSinkId === 'function') {
      try {
        await (audioCtxRef.current as any).setSinkId(deviceId);
        console.log('AudioContext sink changed successfully');
      } catch (error) {
        console.error('Error setting AudioContext sink', error);
      }
    }

    // 2. Set Sink ID on Video Element (fallback)
    if (videoRef.current && typeof (videoRef.current as any).setSinkId === 'function') {
      try {
        await (videoRef.current as any).setSinkId(deviceId);
        console.log('Video element sink changed successfully');
      } catch (error) {
        console.error('Error setting video element sink', error);
      }
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let hls: Hls | null = null;
    setIsPlaying(false);

    if (Hls.isSupported()) {
      const profileConfigs = {
        stable: {
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: Infinity,
          fragLoadingTimeOut: 15000,
          manifestLoadingTimeOut: 15000,
        },
        balanced: {
          maxBufferLength: 10,
          maxMaxBufferLength: 30,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 10,
          fragLoadingTimeOut: 15000,
          manifestLoadingTimeOut: 15000,
        },
        fast: {
          maxBufferLength: 8,
          maxMaxBufferLength: 12,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 7,
          fragLoadingTimeOut: 12000,
          manifestLoadingTimeOut: 12000,
        },
        ultra: {
          maxBufferLength: 5,
          maxMaxBufferLength: 8,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 5,
          lowLatencyMode: false,
          fragLoadingTimeOut: 8000,
          manifestLoadingTimeOut: 8000,
        }
      };

      hls = new Hls(profileConfigs[latencyProfile]);
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsRecovering(false);
        video.play().catch(e => console.log('Auto-play prevented:', e));
      });
      
      let recoverDecodingErrorDate: number | null = null;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setIsRecovering(true);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[HLS] Network error, recovering...');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLS] Media error, attempting soft recovery...');
              const now = Date.now();
              if (!recoverDecodingErrorDate || now - recoverDecodingErrorDate > 3000) {
                recoverDecodingErrorDate = now;
                hls?.recoverMediaError();
              } else {
                console.log('[HLS] Hard media error, Rebooting Stream...');
                hls?.destroy();
                setTimeout(() => setRetryCounter(prev => prev + 1), 500);
              }
              break;
            default:
              console.log('[HLS] Fatal error, Rebooting Stream...');
              hls?.destroy();
              setTimeout(() => setRetryCounter(prev => prev + 1), 500);
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
  }, [url, latencyProfile, retryCounter]);

  // Video Events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      setIsRecovering(false);
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    const onPause = () => setIsPlaying(false);
    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);

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

      if (video.videoWidth && video.videoHeight) {
         setResolution(`${video.videoWidth}x${video.videoHeight}`);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);

    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      if (!(video as any)._audioRouted) {
        const source = audioCtxRef.current.createMediaElementSource(video);
        
        // Setup Center Cancellation (Karaoke Mode)
        const splitter = audioCtxRef.current.createChannelSplitter(2);
        const merger = audioCtxRef.current.createChannelMerger(2);

        directGainLRef.current = audioCtxRef.current.createGain();
        directGainRRef.current = audioCtxRef.current.createGain();
        cancelGainLtoRRef.current = audioCtxRef.current.createGain();
        cancelGainRtoLRef.current = audioCtxRef.current.createGain();

        // Default: normal stereo pass-through
        directGainLRef.current.gain.value = 1;
        directGainRRef.current.gain.value = 1;
        cancelGainLtoRRef.current.gain.value = 0;
        cancelGainRtoLRef.current.gain.value = 0;

        source.connect(splitter);

        // Left channel routing
        splitter.connect(directGainLRef.current, 0);
        splitter.connect(cancelGainLtoRRef.current, 0);
        
        // Right channel routing
        splitter.connect(directGainRRef.current, 1);
        splitter.connect(cancelGainRtoLRef.current, 1);

        // Merge back
        directGainLRef.current.connect(merger, 0, 0);
        cancelGainRtoLRef.current.connect(merger, 0, 0); // Subtract R from L

        directGainRRef.current.connect(merger, 0, 1);
        cancelGainLtoRRef.current.connect(merger, 0, 1); // Subtract L from R

        gainNodeRef.current = audioCtxRef.current.createGain();
        gainNodeRef.current.gain.value = audioBoost === 1 ? 1 : audioBoost === 2 ? 3 : 6;
        
        merger.connect(gainNodeRef.current);
        gainNodeRef.current.connect(audioCtxRef.current.destination);

        (video as any)._audioRouted = true;
      }
    } catch (e) {
      console.log('Audio Routing Error:', e);
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const cycleAudioBoost = () => {
    const nextBoost = audioBoost >= 3 ? 1 : audioBoost + 1;
    setAudioBoost(nextBoost);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = nextBoost === 1 ? 1 : nextBoost === 2 ? 3 : 6;
    }
  };

  const cycleStadiumLevel = () => {
    const nextLevel = (stadiumLevel + 1) % 4 as 0 | 1 | 2 | 3;
    setStadiumLevel(nextLevel);
    
    if (cancelGainLtoRRef.current && cancelGainRtoLRef.current) {
      // 0 = Normal
      // 1 = 40% Cancellation
      // 2 = 70% Cancellation
      // 3 = 100% Cancellation (L-R / R-L)
      
      const cancelAmount = nextLevel === 0 ? 0 : nextLevel === 1 ? 0.4 : nextLevel === 2 ? 0.7 : 1.0;
      
      // By subtracting the opposite channel, we cancel out any audio that is identical in both channels (the commentator).
      cancelGainLtoRRef.current.gain.value = -cancelAmount;
      cancelGainRtoLRef.current.gain.value = -cancelAmount;
    }
  };

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP Error:', error);
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

  const changeProfile = (p: 'stable' | 'balanced' | 'fast' | 'ultra') => {
    setLatencyProfile(p);
    localStorage.setItem('latency_profile', p);
    setShowSettings(false);
  };

  const getFilterStyle = () => {
    switch(filterMode) {
      case 'hdr': return 'contrast(1.15) saturate(1.2) brightness(1.05)';
      case 'shadow': return 'brightness(1.2) contrast(0.95) saturate(1.1)';
      case 'vivid': return 'saturate(1.4) contrast(1.05)';
      default: return 'none';
    }
  };

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
      <video ref={videoRef} className="video-player" style={{ filter: getFilterStyle(), transition: 'filter 0.3s' }} crossOrigin="anonymous" autoPlay />
      
      {/* Reconnecting Overlay */}
      {isRecovering && (
        <div className="reconnecting-overlay">
          <div className="spinner"></div>
          <span>جاري إعادة الاتصال...</span>
        </div>
      )}

      {/* Network Stats Overlay */}
      <div className={`stats-overlay ${showControls ? 'visible' : ''}`} style={{ fontSize: '0.8rem', padding: '6px 10px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>
          <FiActivity size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> 
          Buffer: <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{bufferSecs.toFixed(1)}s</span>
        </div>
        <div>
          <FiMonitor size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> 
          Res: <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{resolution}</span>
        </div>
      </div>

      {/* Main Overlay */}
      <div className={`player-controls-overlay ${showControls ? 'visible' : ''}`} onClick={(e) => { e.stopPropagation(); setShowSettings(false); setShowFilters(false); setShowAudioDevices(false); }}>
        <div className="controls-gradient"></div>
        <div className="controls-bottom" dir="ltr">
          <button className="control-btn play-btn" onClick={togglePlay}>
            {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
          </button>
          
          <div className="volume-container">
            <button className="control-btn" onClick={() => { 
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              if (videoRef.current) {
                videoRef.current.muted = newMuted;
              }
            }}>
              {isMuted || volume === 0 ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
            </button>
            <input 
              type="range" 
              className="volume-slider"
              min="0" max="1" step="0.05" 
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                setIsMuted(false);
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  videoRef.current.volume = val;
                }
              }}
            />
          </div>

          <button 
            className={`control-btn ${audioBoost > 1 ? 'boosted' : ''}`} 
            onClick={(e) => { e.stopPropagation(); cycleAudioBoost(); }}
            title="مضخم الصوت"
            style={{ fontSize: '0.8rem', fontWeight: 'bold', marginLeft: '4px', color: audioBoost > 1 ? 'var(--accent-color)' : '#fff' }}
          >
            {audioBoost}x
          </button>

          <button 
            className="control-btn" 
            onClick={(e) => { e.stopPropagation(); cycleStadiumLevel(); }}
            title="صوت الملعب (عزل المعلق)"
            style={{ fontSize: '1rem', marginLeft: '8px', position: 'relative', color: stadiumLevel > 0 ? 'var(--accent-color)' : '#fff' }}
          >
            <FiMicOff size={20} />
            {stadiumLevel > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: 'var(--accent-color)', color: '#000', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                {stadiumLevel === 1 ? '30%' : stadiumLevel === 2 ? '60%' : '100%'}
              </span>
            )}
          </button>

          <div className="settings-container" onClick={(e) => e.stopPropagation()}>
            <button className="control-btn" onClick={() => { setShowAudioDevices(!showAudioDevices); setShowSettings(false); setShowFilters(false); }} title="مخرج الصوت">
              <FiHeadphones size={20} color={selectedAudioDevice !== 'default' ? 'var(--accent-color)' : '#fff'} />
            </button>
            {showAudioDevices && (
              <div className="settings-menu" dir="ltr">
                <div className="settings-title">Audio Output</div>
                {audioDevices.length === 0 ? (
                  <div className="setting-opt" style={{ opacity: 0.5 }}>لا توجد أجهزة...</div>
                ) : (
                  audioDevices.map(device => (
                    <button 
                      key={device.deviceId} 
                      className={`setting-opt ${selectedAudioDevice === device.deviceId ? 'active' : ''}`} 
                      onClick={() => changeAudioDevice(device.deviceId)}
                    >
                      {device.label || `Device ${device.deviceId.slice(0, 5)}...`}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="spacer"></div>

          <button className={`live-btn ${isLiveEdge ? 'is-live' : 'delayed'}`} onClick={jumpToLive}>
            <span className="live-dot">●</span> LIVE { !isLiveEdge && delaySecs > 1 ? `-${delaySecs.toFixed(0)}s` : ''}
          </button>

          <button className="control-btn" onClick={togglePip} title="صورة داخل صورة (PiP)">
            <MdPictureInPictureAlt size={20} />
          </button>

          <div className="settings-container" onClick={(e) => e.stopPropagation()}>
            <button className="control-btn" onClick={() => { setShowFilters(!showFilters); setShowSettings(false); setShowAudioDevices(false); }} title="فلاتر كأس العالم 2026">
              <FiMonitor size={20} color={filterMode !== 'normal' ? 'var(--accent-color)' : '#fff'} />
            </button>
            {showFilters && (
              <div className="settings-menu">
                <div className="settings-title">WC 2026 Enhancer</div>
                <button className={`setting-opt ${filterMode === 'normal' ? 'active' : ''}`} onClick={() => { setFilterMode('normal'); setShowFilters(false); }}>طبيعي (بدون فلتر)</button>
                <button className={`setting-opt ${filterMode === 'hdr' ? 'active' : ''}`} onClick={() => { setFilterMode('hdr'); setShowFilters(false); }}>محاكاة 4K HDR (مثالي)</button>
                <button className={`setting-opt ${filterMode === 'shadow' ? 'active' : ''}`} onClick={() => { setFilterMode('shadow'); setShowFilters(false); }}>معالجة الظلال (ملاعب مفتوحة)</button>
                <button className={`setting-opt ${filterMode === 'vivid' ? 'active' : ''}`} onClick={() => { setFilterMode('vivid'); setShowFilters(false); }}>عشب زاهي (Vivid)</button>
              </div>
            )}
          </div>

          <div className="settings-container" onClick={(e) => e.stopPropagation()}>
            <button className="control-btn" onClick={() => { setShowSettings(!showSettings); setShowFilters(false); setShowAudioDevices(false); }}>
              <FiSettings size={20} />
            </button>
            {showSettings && (
              <div className="settings-menu">
                <div className="settings-title">Latency Profile</div>
                <button className={`setting-opt ${latencyProfile === 'stable' ? 'active' : ''}`} onClick={() => changeProfile('stable')}>Stable (بطيء وآمن)</button>
                <button className={`setting-opt ${latencyProfile === 'balanced' ? 'active' : ''}`} onClick={() => changeProfile('balanced')}>Balanced (متوازن)</button>
                <button className={`setting-opt ${latencyProfile === 'fast' ? 'active' : ''}`} onClick={() => changeProfile('fast')}>Fast (سريع 12ث)</button>
                <button className={`setting-opt ${latencyProfile === 'ultra' ? 'active' : ''}`} onClick={() => changeProfile('ultra')}>Ultra Low (الأسرع للرياضة)</button>
              </div>
            )}
          </div>

          <button className="control-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
