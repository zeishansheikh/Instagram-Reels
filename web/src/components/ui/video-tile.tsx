"use client";

import * as React from "react";
import { Play, Eye, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, StatusDot } from "./badge";

export interface VideoTileProps {
  id?: string | number;
  title?: string;
  quote: string;
  mood?: string;
  duration?: number | string;
  videoSrc?: string;
  posterSrc?: string;
  status?: "ready" | "published" | "rendering" | "rejected";
  onClick?: () => void;
  className?: string;
}

export function VideoTile({
  quote,
  mood = "nature",
  duration = "08.40s",
  videoSrc,
  posterSrc,
  status = "ready",
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

  const statusMap = {
    ready: { label: "Ready", variant: "mist" as const },
    published: { label: "Published", variant: "mist" as const },
    rendering: { label: "Rendering", variant: "alpenglow" as const },
    rejected: { label: "Rejected", variant: "error" as const },
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative aspect-[9/16] w-full max-w-[280px] rounded-[10px] overflow-hidden bg-canvas-card border border-border-subtle shadow-card cursor-pointer select-none transition-all duration-300",
        "hover:border-border-focus/60 hover:shadow-floating",
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
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        /* Cinematic abstract fallback if no source provided */
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#1C1A18] via-[#151312] to-[#0E0C0B] transition-transform duration-700 group-hover:scale-105">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alpenglow/20 via-transparent to-transparent" />
        </div>
      )}

      {/* Optical Darken & Vignette Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-300 pointer-events-none",
          isPlaying ? "opacity-20" : "opacity-50"
        )}
      />

      {/* Top Header Badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <Badge variant={statusMap[status].variant} dot pulse={status === "rendering"}>
          {statusMap[status].label}
        </Badge>
        <div className="flex items-center gap-1 text-[11px] font-mono text-ink-primary/90 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-[4px] border border-white/10">
          <Clock className="w-3 h-3 text-ink-muted" />
          <span>{duration}</span>
        </div>
      </div>

      {/* Center Hover Play Icon Indicator */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none z-10",
          isPlaying ? "opacity-0" : "opacity-40 group-hover:opacity-90"
        )}
      >
        <div className="w-10 h-10 rounded-full bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center text-ink-primary">
          <Play className="w-4 h-4 ml-0.5 fill-current" />
        </div>
      </div>

      {/* Bottom Quote & Mood Metadata */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 flex flex-col gap-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-alpenglow flex items-center gap-1.5">
          <span>{mood}</span>
        </div>
        <p className="font-serif italic text-sm text-ink-primary leading-snug line-clamp-3 text-balance">
          &ldquo;{quote}&rdquo;
        </p>
      </div>
    </div>
  );
}

