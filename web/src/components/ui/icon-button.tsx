"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "quiet" | "alpenglow";
  size?: "sm" | "md" | "lg";
  label: string; // Mandatory for accessibility
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "md", label, children, ...props }, ref) => {
    const baseStyles =
      "relative inline-flex items-center justify-center transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-alpenglow focus-visible:ring-offset-1 focus-visible:ring-offset-canvas disabled:opacity-40 disabled:pointer-events-none rounded-[6px] cursor-pointer";

    const variants = {
      ghost:
        "bg-canvas-card border border-border-subtle text-ink-secondary hover:text-ink-primary hover:border-border-medium hover:bg-canvas-hover active:scale-[0.96]",
      quiet:
        "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-canvas-hover active:scale-[0.96]",
      alpenglow:
        "bg-alpenglow text-[#120F0D] hover:bg-alpenglow-hover shadow-alpenglow active:scale-[0.96]",
    };

    const sizes = {
      sm: "w-7 h-7 text-xs",
      md: "w-8 h-8 text-sm",
      lg: "w-10 h-10 text-base",
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

