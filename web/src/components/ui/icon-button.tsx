"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = "secondary", size = "md", children, ...props }, ref) => {
    const variantStyles = {
      primary: "bg-moss text-white hover:bg-moss-hover border border-moss/90",
      secondary: "bg-surface text-ink-secondary hover:text-ink-primary border border-border hover:bg-subtle hover:border-border-strong",
      ghost: "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-subtle border border-transparent",
    };

    const sizeStyles = {
      sm: "w-7 h-7 rounded-sm p-1",
      md: "w-8 h-8 rounded-sm p-1.5",
      lg: "w-10 h-10 rounded-md p-2",
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center transition-fast outline-none select-none focus-visible:ring-2 focus-visible:ring-moss/40 focus-visible:ring-offset-1 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
