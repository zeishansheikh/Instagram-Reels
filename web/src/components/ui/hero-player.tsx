"use client";

import * as React from "react";
import {
  Play,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

export interface HeroPlayerProps {
  videoSrc?: string;
  posterSrc?: string;
  title?: string;
  duration?: number | string;
  status?: "ready" | "queued" | "rendering" | "published" | "discarded";
  className?: string;
}

export function HeroPlayer({
  videoSrc,
  posterSrc,
  duration = 11.55,
  status = "ready",
  className,
}: HeroPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [totalDuration, setTotalDuration] = React.useState(
    typeof duration === "number" ? duration : 11.55
  );
  const [showControls, setShowControls] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoSrc]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setTotalDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * totalDuration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2400);
  };

  const statusConfig = {
    ready: { label: "Ready to Publish", variant: "moss" as const },
    queued: { label: "Queued for 18:00", variant: "warning" as const },
    rendering: { label: "Rendering", variant: "warning" as const },
    published: { label: "Published on Instagram", variant: "moss" as const },
    discarded: { label: "Discarded", variant: "error" as const },
  };

  const currentStatus = statusConfig[status] || statusConfig.ready;
  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
      className={cn(
        "group relative aspect-[9/16] w-full max-w-[340px] sm:max-w-[380px] mx-auto rounded-lg overflow-hidden bg-surface border border-border select-none cursor-pointer transition-fast",
        "hover:border-border-strong",
        className
      )}
    >
      <div className="absolute inset-0 z-0 bg-subtle">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            playsInline
            loop
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
          />
        ) : (
          <div className="w-full h-full bg-subtle flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <div className="w-10 h-10 rounded-sm bg-surface border border-border flex items-center justify-center mx-auto text-moss">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="font-serif italic text-sm text-ink-primary">
                Preview Reel
              </p>
              <p className="text-xs font-sans text-ink-muted max-w-[200px]">
                Click to stream video or inspect live timeline.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top Header Overlay */}
      <div
        className={cn(
          "absolute top-3 inset-x-3 flex items-center justify-between z-20 transition-opacity duration-200",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        <Badge variant={currentStatus.variant} dot pulse={status === "rendering" || status === "queued"}>
          {currentStatus.label}
        </Badge>

        <span className="font-mono text-[11px] text-white/95 bg-[#16150F]/70 px-2 py-0.5 rounded-sm">
          9:16 HD
        </span>
      </div>

      {/* Center Big Play Button (Stationary, calm) */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-opacity duration-150",
          isPlaying ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="w-12 h-12 rounded-full bg-surface/95 border border-border flex items-center justify-center text-moss">
          <Play className="w-5 h-5 fill-current ml-0.5 text-moss" />
        </div>
      </div>

      {/* Bottom Controls Track (Solid dark scrim, no blurry gradient) */}
      <div
        className={cn(
          "absolute bottom-0 inset-x-0 p-3 z-20 bg-[#16150F]/85 border-t border-white/10 transition-opacity duration-150",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        <div
          onClick={handleSeek}
          className="relative h-1 w-full rounded-full bg-white/30 hover:h-1.5 transition-all cursor-pointer mb-2.5 overflow-hidden"
        >
          <div
            className="absolute top-0 left-0 bottom-0 bg-moss rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-white/90">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-white">{formatTime(currentTime)}</span>
            <span className="text-white/50">/</span>
            <span className="text-white/80">{formatTime(totalDuration)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1 rounded-sm hover:bg-white/10 text-white/90 hover:text-white transition-fast"
              aria-label={isMuted ? "Unmute" : "Mute"}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1 rounded-sm hover:bg-white/10 text-white/90 hover:text-white transition-fast"
              aria-label="Fullscreen"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
