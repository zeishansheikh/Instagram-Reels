"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <Sparkles className="w-6 h-6 text-alpenglow opacity-75" />,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-12 rounded-[12px] bg-canvas-card/50 border border-dashed border-border-subtle max-w-lg mx-auto",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-canvas-surface border border-border-subtle flex items-center justify-center mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="font-serif text-xl font-normal text-ink-primary tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-ink-muted max-w-sm mb-5 font-sans leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

