"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatusDotProps {
  status?: "mist" | "alpenglow" | "error" | "neutral";
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status = "mist", pulse = false, className }: StatusDotProps) {
  const dotColors = {
    mist: "bg-mist",
    alpenglow: "bg-alpenglow",
    error: "bg-duskerror",
    neutral: "bg-ink-muted",
  };

  const ringColors = {
    mist: "border-mist/40 bg-mist/20",
    alpenglow: "border-alpenglow/40 bg-alpenglow/20",
    error: "border-duskerror/40 bg-duskerror/20",
    neutral: "border-ink-muted/40 bg-ink-muted/20",
  };

  return (
    <span className={cn("relative inline-flex items-center justify-center shrink-0 w-2.5 h-2.5", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-60",
            dotColors[status]
          )}
        />
      )}
      <span className={cn("relative inline-block w-1.5 h-1.5 rounded-full", dotColors[status])} />
    </span>
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "mist" | "alpenglow" | "error" | "subtle";
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({
  className,
  variant = "default",
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-canvas-card border border-border-subtle text-ink-secondary",
    mist: "bg-mist/10 border border-mist/20 text-mist",
    alpenglow: "bg-alpenglow/10 border border-alpenglow/20 text-alpenglow",
    error: "bg-duskerror/10 border border-duskerror/20 text-duskerror",
    subtle: "bg-transparent text-ink-muted border border-border-subtle",
  };

  const dotStatusMap: Record<string, "mist" | "alpenglow" | "error" | "neutral"> = {
    mist: "mist",
    alpenglow: "alpenglow",
    error: "error",
    default: "neutral",
    subtle: "neutral",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] font-mono text-[10px] uppercase tracking-wider select-none font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <StatusDot status={dotStatusMap[variant]} pulse={pulse} />}
      {children}
    </span>
  );
}

