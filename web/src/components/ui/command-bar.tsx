"use client";

import * as React from "react";
import { Sparkles, Play, Search, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./badge";
import { Button } from "./button";

export interface CommandBarProps {
  onGenerate?: () => void;
  onReview?: () => void;
  onPublish?: () => void;
  onSearch?: () => void;
  activePreset?: string;
  isPublishReady?: boolean;
  className?: string;
}

export function CommandBar({
  onGenerate,
  onReview,
  onPublish,
  onSearch,
  activePreset = "degraaf",
  isPublishReady = true,
  className,
}: CommandBarProps) {
  return (
    <header
      className={cn(
        "sticky top-5 z-40 mx-auto max-w-3xl w-full px-4 select-none",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-canvas-surface/90 border border-border-medium backdrop-blur-xl shadow-floating transition-all duration-300 hover:border-border-focus/40">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 shrink-0 pl-1">
          <div className="w-5 h-5 rounded-full bg-alpenglow/20 border border-alpenglow/40 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-alpenglow" />
          </div>
          <span className="font-serif italic text-sm text-ink-primary font-medium tracking-tight">
            Reel Forge
          </span>
          <span className="hidden sm:inline-block w-px h-3.5 bg-border-subtle mx-1" />
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-ink-muted">
            <Sliders className="w-3 h-3 text-alpenglow/80" />
            <span>{activePreset}</span>
          </div>
        </div>

        {/* Central Search / Trigger */}
        <button
          onClick={onSearch}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-canvas-card border border-border-subtle text-xs text-ink-muted hover:text-ink-primary hover:border-border-medium transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search reels or commands...</span>
          <span className="inline md:hidden">Search</span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-canvas-surface px-1.5 py-0.5 rounded border border-border-subtle text-ink-muted">
            ⌘K
          </kbd>
        </button>

        {/* Quick Action Buttons & Status */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onReview}
            className="hidden sm:inline-flex"
          >
            Review
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={onGenerate}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Generate
          </Button>

          {/* Instagram Graph API Status */}
          <div
            title={isPublishReady ? "Instagram API Connected" : "Instagram API Disconnected"}
            className="flex items-center pl-1 pr-1.5 py-1 rounded-full bg-canvas-card/80 border border-border-subtle"
          >
            <StatusDot status={isPublishReady ? "mist" : "neutral"} pulse={isPublishReady} />
          </div>
        </div>
      </div>
    </header>
  );
}

