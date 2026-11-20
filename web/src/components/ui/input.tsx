"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, hint, leftIcon, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5 font-sans">
        {label && (
          <label htmlFor={inputId} className="text-xs uppercase tracking-wider font-mono text-ink-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-ink-muted pointer-events-none shrink-0">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              "w-full bg-canvas-card border border-border-subtle rounded-[6px] px-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted transition-colors duration-200 outline-none",
              "hover:border-border-medium focus:border-border-focus focus:ring-1 focus:ring-border-focus/40",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              leftIcon && "pl-9",
              error && "border-duskerror focus:border-duskerror focus:ring-duskerror/30",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-[11px] text-duskerror font-mono">{error}</p>
        ) : hint ? (
          <p className="text-[11px] text-ink-muted font-sans">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

