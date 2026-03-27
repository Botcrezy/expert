import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface EnhancedVideoPlayerProps {
  videoUrl?: string | null;
  videoType?: "youtube" | "upload" | "none" | null;
  videoFileUrl?: string | null;
  title?: string;
  onProgress?: (seconds: number, total: number) => void;
  onComplete?: () => void;
  initialTime?: number;
  className?: string;
  autoPlay?: boolean;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// YouTube Player API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function EnhancedVideoPlayer({
  videoUrl,
  videoType = "youtube",
  videoFileUrl,
  title,
  onProgress,
  onComplete,
  initialTime = 0,
  className,
  autoPlay = false,
}: EnhancedVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ytPlayerReady, setYtPlayerReady] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();
  const progressInterval = useRef<NodeJS.Timeout>();

  // Extract YouTube video ID
  const getYouTubeId = (url?: string | null) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(videoUrl);
  const isYouTube = videoType === "youtube" && youtubeId;
  const isUpload = videoType === "upload";
  const actualVideoUrl = isUpload ? (videoFileUrl || videoUrl) : null;
  const hasVideo = isYouTube || (isUpload && actualVideoUrl);

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (!isYouTube) return;

    const loadYTApi = () => {
      if (window.YT && window.YT.Player) {
        initYTPlayer();
        return;
      }

      if (!document.getElementById("youtube-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        initYTPlayer();
      };
    };

    const initYTPlayer = () => {
      if (!ytContainerRef.current || ytPlayerRef.current) return;

      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0, // Disable related videos
          showinfo: 0, // Hide video title and channel info (deprecated but still helps)
          iv_load_policy: 3, // Hide annotations
          cc_load_policy: 0, // Hide closed captions
          playsinline: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          fs: 0, // Disable native fullscreen button
          disablekb: 1, // Disable keyboard controls
          autohide: 1, // Auto-hide controls
          loop: 0,
          playlist: youtubeId, // Required for rel=0 to work properly in some cases
        },
        events: {
          onReady: (event: any) => {
            setYtPlayerReady(true);
            setDuration(event.target.getDuration());
            if (initialTime > 0) {
              event.target.seekTo(initialTime, true);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startYTProgressTracking();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              handleVideoEnd();
            }
          },
        },
      });
    };

    loadYTApi();

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }
    };
  }, [isYouTube, youtubeId, autoPlay, initialTime]);

  const startYTProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    progressInterval.current = setInterval(() => {
      if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
        const current = ytPlayerRef.current.getCurrentTime();
        const total = ytPlayerRef.current.getDuration();
        setCurrentTime(current);
        setDuration(total);
        onProgress?.(current, total);

        // Check for 90% completion
        if (total > 0 && current / total >= 0.9 && !hasCompleted) {
          setHasCompleted(true);
          onComplete?.();
        }
      }
    }, 1000);
  };

  const handleVideoEnd = () => {
    if (!hasCompleted) {
      setHasCompleted(true);
      onComplete?.();
    }
  };

  // Native video handlers
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setCurrentTime(current);
      setDuration(total);
      onProgress?.(current, total);
      
      if (total > 0 && current / total >= 0.9 && !hasCompleted) {
        setHasCompleted(true);
        onComplete?.();
      }
    }
  }, [onProgress, onComplete, hasCompleted]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (initialTime > 0) {
        videoRef.current.currentTime = initialTime;
      }
    }
  };

  const togglePlay = () => {
    if (isYouTube && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(newVolume * 100);
      if (newVolume === 0) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (isYouTube && ytPlayerRef.current) {
      if (isMuted) ytPlayerRef.current.unMute();
      else ytPlayerRef.current.mute();
    } else if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.setPlaybackRate(speed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  if (!hasVideo) {
    return (
      <div
        className={cn("relative rounded-xl overflow-hidden bg-muted", className)}
        style={{ aspectRatio: "16/9" }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <Play className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-sm">لا يوجد فيديو متاح</p>
        </div>
      </div>
    );
  }

  // YouTube Player with custom controls
  if (isYouTube) {
    return (
      <div
        ref={containerRef}
        className={cn("relative rounded-xl overflow-hidden bg-black group", className)}
        style={{ aspectRatio: "16/9" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* YouTube iframe container - with overlay to hide channel info */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Scale up slightly to crop out channel info and suggestions */}
          <div 
            ref={ytContainerRef} 
            className="w-full h-full"
            style={{ 
              transform: 'scale(1.01)',
              transformOrigin: 'center center'
            }} 
          />
          {/* Top overlay to hide channel name */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none" />
          {/* Bottom overlay to hide suggestions when video ends */}
          {!isPlaying && hasCompleted && (
            <div className="absolute inset-0 bg-black/90 z-10 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium">تم إكمال الفيديو</p>
                <p className="text-white/60 text-sm mt-1">يمكنك الانتقال للدرس التالي</p>
              </div>
            </div>
          )}
        </div>

        {/* Clickable overlay for play/pause */}
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={togglePlay}
        />

        {/* Custom Controls */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-end transition-opacity duration-300 z-20 pointer-events-none",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Center Play Button */}
          {!isPlaying && ytPlayerReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
              <Button
                size="lg"
                className="rounded-full w-20 h-20 bg-primary/90 hover:bg-primary shadow-2xl transition-transform hover:scale-110"
                onClick={togglePlay}
              >
                <Play className="w-10 h-10 mr-[-4px]" fill="currentColor" />
              </Button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="relative z-10 p-4 space-y-2 pointer-events-auto">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <span className="text-white text-xs w-12 text-right font-mono">{formatTime(currentTime)}</span>
              <Slider
                value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="flex-1 cursor-pointer"
              />
              <span className="text-white text-xs w-12 text-left font-mono">{formatTime(duration)}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-10 h-10" onClick={togglePlay}>
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-8 h-8" onClick={() => skip(-10)} title="رجوع 10 ثواني">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-8 h-8" onClick={() => skip(10)} title="تقديم 10 ثواني">
                  <SkipForward className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1 group/volume">
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-8 h-8" onClick={toggleMute}>
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-200">
                    <Slider value={[isMuted ? 0 : volume * 100]} onValueChange={handleVolumeChange} max={100} className="w-20" />
                  </div>
                </div>

                {title && <span className="text-white/70 text-xs mr-2">{title}</span>}
              </div>

              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 text-xs gap-1">
                      <Settings className="w-4 h-4" />
                      {playbackSpeed}x
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[100px]">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <DropdownMenuItem
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={cn(playbackSpeed === speed && "bg-primary/10 text-primary")}
                      >
                        {speed}x {speed === 1 && "(عادي)"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-8 h-8" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Native Video Player for uploaded videos
  return (
    <div
      ref={containerRef}
      className={cn("relative rounded-xl overflow-hidden bg-black group", className)}
      style={{ aspectRatio: "16/9" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={actualVideoUrl || ""}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleVideoEnd}
        onClick={togglePlay}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        playsInline
        preload="metadata"
      />

      {/* Custom Controls */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="lg"
              className="rounded-full w-20 h-20 bg-primary/90 hover:bg-primary shadow-2xl transition-transform hover:scale-110"
              onClick={togglePlay}
            >
              <Play className="w-10 h-10 mr-[-4px]" fill="currentColor" />
            </Button>
          </div>
        )}

        <div className="relative z-10 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs w-12 text-right font-mono">{formatTime(currentTime)}</span>
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="flex-1 cursor-pointer"
            />
            <span className="text-white text-xs w-12 text-left font-mono">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-10 h-10" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-8 h-8" onClick={() => skip(-10)}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-8 h-8" onClick={() => skip(10)}>
                <SkipForward className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1 group/volume">
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-8 h-8" onClick={toggleMute}>
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-200">
                  <Slider value={[isMuted ? 0 : volume * 100]} onValueChange={handleVolumeChange} max={100} className="w-20" />
                </div>
              </div>

              {title && <span className="text-white/70 text-xs mr-2">{title}</span>}
            </div>

            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 text-xs gap-1">
                    <Settings className="w-4 h-4" />
                    {playbackSpeed}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[100px]">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={cn(playbackSpeed === speed && "bg-primary/10 text-primary")}
                    >
                      {speed}x {speed === 1 && "(عادي)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 w-8 h-8" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
