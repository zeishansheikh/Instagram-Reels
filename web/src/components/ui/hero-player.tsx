"use client";

import * as React from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, StatusDot } from "./badge";

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
  title = "Today's Featured Reel",
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
  const [isHovered, setIsHovered] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // Autohide controls after inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2400);
  };

  const statusConfig = {
    ready: { label: "Ready to Publish", variant: "mist" as const },
    queued: { label: "Queued for 18:00", variant: "mist" as const },
    rendering: { label: "Rendering", variant: "alpenglow" as const },
    published: { label: "Published on Instagram", variant: "mist" as const },
    discarded: { label: "Discarded", variant: "error" as const },
  };

  const currentStatus = statusConfig[status] || statusConfig.ready;
  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        setIsHovered(true);
        setShowControls(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isPlaying) setShowControls(false);
      }}
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
      className={cn(
        "group relative aspect-[9/16] w-full max-w-[340px] sm:max-w-[380px] mx-auto rounded-[18px] overflow-hidden bg-canvas-surface border border-border-medium select-none cursor-pointer transition-all duration-500",
        "shadow-floating hover:border-border-focus/70",
        className
      )}
      style={{
        boxShadow: "0 24px 60px -12px rgba(0, 0, 0, 0.85), 0 0 40px -8px rgba(232, 140, 100, 0.08)",
      }}
    >
      {/* Film Grain Texture Backdrop */}
      <div className="absolute inset-0 z-0 bg-canvas-card">
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
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          /* High-aesthetic nature cinematic placeholder */
          <div className="w-full h-full bg-gradient-to-b from-[#1C1A18] via-[#141211] to-[#0D0B0A] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-alpenglow/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-mist/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-canvas-card border border-border-subtle flex items-center justify-center mx-auto text-alpenglow">
                <Sparkles className="w-5 h-5 animate-pulse-mist" />
              </div>
              <p className="font-serif italic text-base text-ink-primary">
                Preview Mode
              </p>
              <p className="text-xs font-sans text-ink-muted max-w-[200px]">
                Click to play or inspect live render stream.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Optical Vignette Overlay */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-300",
          isPlaying ? "opacity-20 bg-gradient-to-t from-black/80 via-transparent to-black/40" : "opacity-60 bg-gradient-to-t from-black/90 via-black/20 to-black/60"
        )}
      />

      {/* Top Header Floating Overlay */}
      <div
        className={cn(
          "absolute top-4 inset-x-4 flex items-center justify-between z-20 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        <Badge variant={currentStatus.variant} dot pulse={status === "rendering"}>
          {currentStatus.label}
        </Badge>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-secondary bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-[4px] border border-white/10">
            9:16 HD
          </span>
        </div>
      </div>

      {/* Center Big Play Button (Fades out when playing) */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-all duration-300",
          isPlaying ? "opacity-0 scale-90" : "opacity-100 scale-100"
        )}
      >
        <div className="w-16 h-16 rounded-full bg-canvas-surface/85 backdrop-blur-md border border-border-medium flex items-center justify-center text-alpenglow shadow-floating transition-transform duration-300 group-hover:scale-110">
          <Play className="w-7 h-7 fill-current ml-1" />
        </div>
      </div>

      {/* Bottom Audio & Scrubber Controls */}
      <div
        className={cn(
          "absolute bottom-0 inset-x-0 p-4 pt-12 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Scrubber Progress Track */}
        <div
          onClick={handleSeek}
          className="relative h-1.5 w-full rounded-full bg-white/20 hover:h-2 transition-all cursor-pointer mb-3 overflow-hidden"
        >
          <div
            className="absolute top-0 left-0 bottom-0 bg-alpenglow rounded-full transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Time counter and secondary action icons */}
        <div className="flex items-center justify-between text-xs font-mono text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <span className="text-ink-primary font-medium">{formatTime(currentTime)}</span>
            <span className="text-ink-muted">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1 rounded-[4px] hover:bg-white/10 text-ink-secondary hover:text-ink-primary transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4 text-alpenglow" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1 rounded-[4px] hover:bg-white/10 text-ink-secondary hover:text-ink-primary transition-colors"
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
