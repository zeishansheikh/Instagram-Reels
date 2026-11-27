"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, rows = 3, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <textarea
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={cn(
            "w-full rounded-sm bg-surface p-2.5 font-sans text-sm text-ink-primary placeholder:text-ink-muted border border-border transition-fast resize-y leading-relaxed",
            "focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss/40",
            "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-muted",
            error && "border-status-error focus:border-status-error focus:ring-status-error/30",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[11px] font-sans text-status-error">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
