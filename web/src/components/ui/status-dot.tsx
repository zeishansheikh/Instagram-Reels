"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatusDotProps {
  status?: "success" | "warning" | "error" | "neutral";
  pulse?: boolean;
  className?: string;
}

export function StatusDot({
  status = "neutral",
  pulse = false,
  className,
}: StatusDotProps) {
  const colorMap = {
    success: "bg-status-success",
    warning: "bg-status-warning",
    error: "bg-status-error",
    neutral: "bg-ink-muted",
  };

  return (
    <span className={cn("relative inline-flex items-center justify-center shrink-0 w-2 h-2", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute w-full h-full rounded-full opacity-60 animate-ping",
            colorMap[status]
          )}
        />
      )}
      <span className={cn("relative w-1.5 h-1.5 rounded-full", colorMap[status])} />
    </span>
  );
}
