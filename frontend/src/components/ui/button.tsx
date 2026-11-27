"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      iconRight,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap font-sans font-medium select-none transition-fast outline-none focus-visible:ring-2 focus-visible:ring-moss/40 focus-visible:ring-offset-1 disabled:opacity-40 disabled:pointer-events-none active:bg-subtle";

    const variantStyles = {
      primary: "bg-moss text-white hover:bg-moss-hover border border-moss/90",
      secondary: "bg-surface text-ink-primary border border-border hover:bg-subtle hover:border-border-strong",
      ghost: "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-subtle border border-transparent",
    };

    const sizeStyles = {
      sm: "h-7 px-2.5 text-xs rounded-sm gap-1.5",
      md: "h-8 px-3 text-sm rounded-sm gap-2",
      lg: "h-10 px-4 text-sm rounded-md gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
