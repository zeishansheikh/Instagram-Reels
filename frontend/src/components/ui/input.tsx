"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="absolute left-2.5 text-ink-muted pointer-events-none flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={cn(
              "h-8 w-full rounded-sm bg-surface px-3 font-sans text-sm text-ink-primary placeholder:text-ink-muted border border-border transition-fast",
              "focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss/40",
              "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-muted",
              leftIcon && "pl-8",
              rightIcon && "pr-8",
              error && "border-status-error focus:border-status-error focus:ring-status-error/30",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-2.5 text-ink-muted flex items-center justify-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-[11px] font-sans text-status-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
