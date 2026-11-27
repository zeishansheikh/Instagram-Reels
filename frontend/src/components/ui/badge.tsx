"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status-dot";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "moss" | "warning" | "error";
  dot?: boolean;
  dotStatus?: "success" | "warning" | "error" | "neutral";
  pulse?: boolean;
}

export function Badge({
  className,
  variant = "default",
  dot = false,
  dotStatus,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-subtle text-ink-secondary border-border-subtle",
    moss: "bg-moss-subtle text-moss border-moss/20",
    warning: "bg-subtle text-status-warning border-border-subtle",
    error: "bg-subtle text-status-error border-border-subtle",
  };

  // Determine dot color based on variant if not explicitly given
  const derivedDotStatus =
    dotStatus || (variant === "moss" ? "success" : variant === "warning" ? "warning" : variant === "error" ? "error" : "neutral");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-sans font-medium border border-border select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <StatusDot status={derivedDotStatus} pulse={pulse} />}
      <span>{children}</span>
    </span>
  );
}
