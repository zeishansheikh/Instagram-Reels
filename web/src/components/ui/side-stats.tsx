"use client";

import * as React from "react";
import { CheckCircle2, Calendar, Radio, Activity, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./badge";

export interface SideStatsProps {
  postsThisWeek?: number;
  totalWeeklyTarget?: number;
  queueSize?: number;
  nextScheduledSlot?: string;
  geminiHealth?: "healthy" | "warning" | "error";
  instagramHealth?: "connected" | "disconnected";
  storageHealth?: "ready" | "error";
  className?: string;
}

export function SideStats({
  postsThisWeek = 5,
  totalWeeklyTarget = 7,
  queueSize = 3,
  nextScheduledSlot = "Today, 18:00 UTC",
  geminiHealth = "healthy",
  instagramHealth = "connected",
  storageHealth = "ready",
  className,
}: SideStatsProps) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  // Mon-Fri posted (5), Sat scheduled, Sun pending

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 gap-3.5 select-none",
        className
      )}
    >
      {/* 1. Posts This Week */}
      <div className="p-4 rounded-[14px] bg-canvas-surface/80 border border-border-subtle shadow-card backdrop-blur-md flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Weekly Cadence
          </span>
          <span className="font-mono text-xs text-alpenglow font-medium">
            {postsThisWeek}/{totalWeeklyTarget} Published
          </span>
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1">
          {days.map((day, idx) => {
            const isDone = idx < postsThisWeek;
            const isCurrent = idx === postsThisWeek;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "h-2 w-full rounded-[2px] transition-all duration-300",
                    isDone && "bg-mist",
                    isCurrent && "bg-alpenglow animate-pulse-mist",
                    !isDone && !isCurrent && "bg-canvas-card border border-border-subtle"
                  )}
                />
                <span className="font-mono text-[9px] text-ink-muted">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Queue Size */}
      <div className="p-4 rounded-[14px] bg-canvas-surface/80 border border-border-subtle shadow-card backdrop-blur-md flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Publish Queue
          </span>
          <div className="flex items-center gap-1.5">
            <StatusDot status="mist" pulse />
            <span className="font-mono text-xs text-mist font-medium">
              {queueSize} Approved
            </span>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <p className="font-serif italic text-xl text-ink-primary font-normal leading-none">
              {queueSize} Reels
            </p>
            <p className="text-[11px] font-sans text-ink-muted mt-1">
              Next: <span className="text-ink-secondary font-mono">{nextScheduledSlot}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Token Health & Cloud Status */}
      <div className="p-4 rounded-[14px] bg-canvas-surface/80 border border-border-subtle shadow-card backdrop-blur-md flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Engine Health
          </span>
          <span className="font-mono text-[10px] text-mist">All Systems Operational</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <StatusDot status="mist" />
              <span className="font-mono text-[11px] text-ink-primary">Gemini</span>
            </div>
            <p className="text-[9px] font-sans text-ink-muted">Flash 3.5 Active</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <StatusDot status="mist" />
              <span className="font-mono text-[11px] text-ink-primary">Meta Graph</span>
            </div>
            <p className="text-[9px] font-sans text-ink-muted">API v21.0 Live</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <StatusDot status="mist" />
              <span className="font-mono text-[11px] text-ink-primary">Storage</span>
            </div>
            <p className="text-[9px] font-sans text-ink-muted">Supabase Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}
