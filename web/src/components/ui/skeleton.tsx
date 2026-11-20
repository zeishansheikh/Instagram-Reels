"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[6px] bg-canvas-card border border-border-subtle/40",
        className
      )}
      {...props}
    />
  );
}

