"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status-dot";

export interface VideoTileProps {
  quote: string;
  duration?: number | string;
  resolution?: string;
  videoSrc?: string;
  posterSrc?: string;
  status?: "success" | "warning" | "error" | "neutral";
  statusText?: string;
  onClick?: () => void;
  className?: string;
}

export function VideoTile({
  quote,
  duration = "11.5s",
  resolution = "1080×1920",
  videoSrc,
  posterSrc,
  status = "neutral",
  statusText,
  onClick,
  className,
}: VideoTileProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative aspect-[9/16] w-full max-w-[280px] rounded-lg overflow-hidden bg-surface border border-border cursor-pointer select-none transition-fast flex flex-col justify-end",
        "hover:border-border-strong",
        className
      )}
    >
      {/* Background Video / Poster */}
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          muted
          playsInline
          loop
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        /* Subtle architectural background if no video source */
        <div className="absolute inset-0 w-full h-full bg-subtle flex items-center justify-center p-4">
          <p className="font-serif italic text-xs text-ink-muted text-center line-clamp-3">
            &ldquo;{quote}&rdquo;
          </p>
        </div>
      )}

      {/* Subtle Bottom Scrim for Meta Row Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#16150F]/70 via-transparent to-transparent pointer-events-none" />

      {/* Small Meta Row at Bottom */}
      <div className="relative z-10 p-3 pt-6 flex items-center justify-between text-[11px] font-mono text-white/95">
        <div className="flex items-center gap-1.5">
          <StatusDot status={status} />
          {statusText && <span className="font-sans font-medium text-[10px]">{statusText}</span>}
        </div>

        <div className="flex items-center gap-2 text-white/80">
          <span>{resolution}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-white/70" />
            <span>{duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
