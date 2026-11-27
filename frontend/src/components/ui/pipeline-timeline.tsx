"use client";

import * as React from "react";
import {
  Check,
  Film,
  Sparkles,
  Layers,
  Clock,
  Send,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status-dot";

export type PipelineStageStatus = "completed" | "active" | "pending" | "failed";

export interface PipelineStage {
  id: string;
  stepNumber: string;
  name: string;
  description: string;
  detail: string;
  status: PipelineStageStatus;
  timestamp?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface PipelineTimelineProps {
  currentStageId?: string;
  stages?: PipelineStage[];
  className?: string;
}

const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: "clip",
    stepNumber: "01",
    name: "Clip Picked",
    description: "Footage matched & verified",
    detail: "local_folder · 1080×1920 · 11.55s",
    status: "completed",
    timestamp: "07:18:22",
    icon: Film,
  },
  {
    id: "quote",
    stepNumber: "02",
    name: "Quote Written",
    description: "AI generation & dedupe",
    detail: "Gemini 3.5 Flash-Lite · #hope · Unique",
    status: "completed",
    timestamp: "07:19:04",
    icon: Sparkles,
  },
  {
    id: "rendered",
    stepNumber: "03",
    name: "Rendered",
    description: "FFmpeg typesetting & grade",
    detail: "CRF 20 · Contrast: 0.22 · 4.78 MB",
    status: "completed",
    timestamp: "07:19:44",
    icon: Layers,
  },
  {
    id: "queued",
    stepNumber: "04",
    name: "Queued",
    description: "Approved for publication",
    detail: "Scheduled for today at 18:00 UTC",
    status: "active",
    timestamp: "12:00:00",
    icon: Clock,
  },
  {
    id: "published",
    stepNumber: "05",
    name: "Published",
    description: "Instagram Reels release",
    detail: "Meta Graph API v21.0 · Baked audio",
    status: "pending",
    timestamp: "18:00:00",
    icon: Send,
  },
];

export function PipelineTimeline({
  stages = DEFAULT_STAGES,
  className,
}: PipelineTimelineProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-surface border border-border p-6 space-y-6 select-none",
        className
      )}
    >
      {/* Header with Title and Current Pipeline Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-moss font-medium">
              Autonomous Pipeline
            </span>
            <span className="text-ink-muted">•</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Live Lifecycle
            </span>
          </div>
          <h3 className="font-serif italic text-lg text-ink-primary font-normal mt-0.5">
            Today’s Production Journey
          </h3>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto px-2.5 py-1 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-secondary">
          <StatusDot status="warning" pulse />
          <span>Stage 04 of 05 Active · Queued</span>
        </div>
      </div>

      {/* Horizontal Staged Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isCompleted = stage.status === "completed";
          const isActive = stage.status === "active";
          const isFailed = stage.status === "failed";
          const isPending = stage.status === "pending";

          return (
            <div
              key={stage.id}
              className={cn(
                "group relative p-3.5 rounded-sm border transition-fast flex flex-col justify-between select-none",
                isActive && "bg-moss-subtle border-moss/30",
                isCompleted && "bg-subtle/50 border-border hover:border-border-strong",
                isPending && "bg-surface border-border/60 opacity-60",
                isFailed && "bg-status-error/10 border-status-error/30"
              )}
            >
              {/* Step indicator and Status Icon */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={cn(
                    "font-mono text-[11px] font-semibold tracking-wider",
                    isActive ? "text-moss" : isCompleted ? "text-status-success" : isFailed ? "text-status-error" : "text-ink-muted"
                  )}
                >
                  {stage.stepNumber}
                </span>

                <div className="flex items-center">
                  {isCompleted && (
                    <div className="w-5 h-5 rounded-full bg-status-success/15 border border-status-success/30 flex items-center justify-center text-status-success">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  )}
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-moss/15 border border-moss/30 flex items-center justify-center text-moss">
                      <span className="w-2 h-2 rounded-full bg-moss animate-pulse" />
                    </div>
                  )}
                  {isPending && (
                    <div className="w-5 h-5 rounded-full bg-subtle border border-border flex items-center justify-center text-ink-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-muted/50" />
                    </div>
                  )}
                  {isFailed && (
                    <div className="w-5 h-5 rounded-full bg-status-error/15 border border-status-error/30 flex items-center justify-center text-status-error">
                      <AlertCircle className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5",
                      isActive ? "text-moss" : isCompleted ? "text-ink-primary" : "text-ink-muted"
                    )}
                  />
                  <h4 className="font-sans text-xs font-semibold text-ink-primary tracking-tight">
                    {stage.name}
                  </h4>
                </div>
                <p className="text-[11px] font-sans text-ink-secondary leading-snug line-clamp-1">
                  {stage.description}
                </p>
              </div>

              {/* Technical Metadata Footer */}
              <div className="pt-2.5 border-t border-border flex items-center justify-between font-mono tabular-nums text-[10px] text-ink-muted">
                <span className="truncate max-w-[110px]" title={stage.detail}>
                  {stage.detail}
                </span>
                {stage.timestamp && (
                  <span className="shrink-0 text-ink-muted">{stage.timestamp}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
