"use client";

import * as React from "react";
import { Search, Sparkles, Sliders, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { StatusDot } from "./status-dot";

export interface CommandBarProps {
  onGenerate?: () => void;
  onSearch?: () => void;
  activePreset?: string;
  isPublishReady?: boolean;
  className?: string;
}

export function CommandBar({
  onGenerate,
  onSearch,
  activePreset = "degraaf",
  isPublishReady = true,
  className,
}: CommandBarProps) {
  // Listen for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onSearch?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearch]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-surface border-b border-border select-none",
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand / Logo + Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-moss" />
            <span className="font-sans font-semibold text-sm text-ink-primary tracking-tight">
              Reel Forge
            </span>
          </div>

          <span className="w-px h-3.5 bg-border mx-0.5" />

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-muted font-sans">
            <Sliders className="w-3.5 h-3.5 text-ink-secondary" />
            <span>Style:</span>
            <span className="font-mono text-ink-primary font-medium">{activePreset}</span>
          </div>
        </div>

        {/* Cmd+K Search trigger */}
        <button
          onClick={onSearch}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-subtle border border-border text-xs text-ink-muted hover:text-ink-primary hover:border-border-strong transition-fast w-full max-w-xs"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left truncate">Search reels or commands...</span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded-sm border border-border text-ink-secondary">
            ⌘K
          </kbd>
        </button>

        {/* Primary Generate Action & Status Dot */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            variant="primary"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={onGenerate}
          >
            Generate
          </Button>

          <div
            title={isPublishReady ? "Meta Graph API Connected" : "Meta Graph API Disconnected"}
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-subtle border border-border text-[11px] font-mono text-ink-secondary"
          >
            <StatusDot status={isPublishReady ? "success" : "neutral"} pulse={isPublishReady} />
            <span className="hidden md:inline">{isPublishReady ? "API Connected" : "Offline"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
