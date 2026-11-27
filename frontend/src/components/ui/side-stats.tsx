"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status-dot";

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
  className,
}: SideStatsProps) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 gap-3.5 select-none",
        className
      )}
    >
      {/* 1. Posts This Week */}
      <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Weekly Cadence
          </span>
          <span className="font-mono tabular-nums text-xs text-moss font-medium">
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
                    "h-2 w-full rounded-sm transition-fast",
                    isDone && "bg-status-success",
                    isCurrent && "bg-moss animate-pulse",
                    !isDone && !isCurrent && "bg-subtle border border-border"
                  )}
                />
                <span className="font-mono text-[9px] text-ink-muted">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Queue Size */}
      <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Publish Queue
          </span>
          <div className="flex items-center gap-1.5">
            <StatusDot status="warning" pulse />
            <span className="font-mono tabular-nums text-xs text-status-warning font-medium">
              {queueSize} Approved
            </span>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <p className="font-serif italic text-xl text-ink-primary font-normal leading-none tabular-nums">
              {queueSize} Reels
            </p>
            <p className="text-[11px] font-sans text-ink-muted mt-1">
              Next: <span className="text-ink-secondary font-mono">{nextScheduledSlot}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Token Health & Cloud Status */}
      <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Engine Health
          </span>
          <span className="font-mono text-[10px] text-status-success">Operational</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <StatusDot status="success" />
              <span className="font-mono text-[11px] text-ink-primary">Gemini</span>
            </div>
            <p className="text-[9px] font-sans text-ink-muted">Flash 3.5</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <StatusDot status="success" />
              <span className="font-mono text-[11px] text-ink-primary">Graph API</span>
            </div>
            <p className="text-[9px] font-sans text-ink-muted">v21.0 Live</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <StatusDot status="success" />
              <span className="font-mono text-[11px] text-ink-primary">Storage</span>
            </div>
            <p className="text-[9px] font-sans text-ink-muted">R2 Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}
