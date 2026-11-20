"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "quiet";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, children, disabled, ...props }, ref) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-sans font-medium transition-all duration-200 select-none outline-none focus-visible:ring-1 focus-visible:ring-alpenglow focus-visible:ring-offset-1 focus-visible:ring-offset-canvas disabled:opacity-40 disabled:pointer-events-none cursor-pointer";

    const variants = {
      primary:
        "bg-alpenglow text-[#120F0D] font-semibold hover:bg-alpenglow-hover active:scale-[0.98] shadow-alpenglow rounded-[6px]",
      ghost:
        "bg-canvas-card border border-border-medium text-ink-primary hover:border-border-focus hover:bg-canvas-hover active:scale-[0.98] rounded-[6px]",
      quiet:
        "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-canvas-surface active:scale-[0.98] rounded-[6px]",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5 tracking-wide",
      md: "text-xs px-3.5 py-2 gap-2 tracking-wide",
      lg: "text-sm px-5 py-2.5 gap-2.5 tracking-wide",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";

