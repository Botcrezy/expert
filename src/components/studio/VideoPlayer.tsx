import { useState } from "react";
import { Play, Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoUrl?: string;
  videoType?: "youtube" | "upload";
  videoFileUrl?: string;
  title?: string;
  isLocked?: boolean;
  className?: string;
  aspectRatio?: "16/9" | "4/3";
}

export function VideoPlayer({
  videoUrl,
  videoType = "youtube",
  videoFileUrl,
  title,
  isLocked = false,
  className,
  aspectRatio = "16/9",
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract YouTube video ID
  const getYouTubeId = (url?: string) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(videoUrl);
  const actualVideoUrl = videoType === "upload" ? videoFileUrl : videoUrl;

  if (isLocked) {
    return (
      <div
        className={cn(
          "relative rounded-xl bg-muted flex items-center justify-center",
          className
        )}
        style={{ aspectRatio }}
      >
        <div className="text-center p-6">
          <div className="w-16 h-16 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">المحتوى مقفل</p>
          <p className="text-sm text-muted-foreground/70">
            اشترك في الكورس لمشاهدة الفيديو
          </p>
        </div>
      </div>
    );
  }

  if (!actualVideoUrl && !youtubeId) {
    return (
      <div
        className={cn(
          "relative rounded-xl bg-muted flex items-center justify-center",
          className
        )}
        style={{ aspectRatio }}
      >
        <p className="text-muted-foreground">لا يوجد فيديو</p>
      </div>
    );
  }

  // YouTube embed
  if (videoType === "youtube" && youtubeId) {
    return (
      <div
        className={cn("relative rounded-xl overflow-hidden bg-black", className)}
        style={{ aspectRatio }}
      >
        {!isPlaying ? (
          <div className="absolute inset-0">
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Button
                size="lg"
                className="rounded-full w-20 h-20"
                onClick={() => setIsPlaying(true)}
              >
                <Play className="w-10 h-10 mr-1" fill="currentColor" />
              </Button>
            </div>
            {title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <h4 className="text-white font-medium">{title}</h4>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1&playlist=${youtubeId}`}
              title={title || "Video"}
              className="absolute inset-0 w-full h-full"
              style={{ transform: 'scale(1.01)', transformOrigin: 'center center' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {/* Top overlay to hide channel name */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none" />
          </div>
        )}
      </div>
    );
  }

  // Direct video upload
  return (
    <div
      className={cn("relative rounded-xl overflow-hidden bg-black", className)}
      style={{ aspectRatio }}
    >
      <video
        src={actualVideoUrl}
        controls
        className="w-full h-full object-contain"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
      >
        متصفحك لا يدعم تشغيل الفيديو
      </video>
    </div>
  );
}
