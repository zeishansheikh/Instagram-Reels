"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-md border border-dashed border-border bg-subtle/20 max-w-lg mx-auto",
        className
      )}
    >
      <div className="w-10 h-10 rounded-sm bg-subtle border border-border flex items-center justify-center text-ink-muted mb-3.5">
        {icon || <Sparkles className="w-4 h-4 text-moss" />}
      </div>
      <h3 className="font-sans text-sm font-semibold text-ink-primary tracking-tight mb-1">
        {title}
      </h3>
      <p className="font-sans text-xs text-ink-secondary leading-relaxed max-w-sm mb-4">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
