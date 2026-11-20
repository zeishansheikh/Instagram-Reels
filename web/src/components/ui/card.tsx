"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  active?: boolean;
}

export function Card({ className, hoverable = false, active = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[10px] bg-canvas-card border border-border-subtle p-5 shadow-card transition-all duration-300",
        hoverable && "hover:border-border-medium hover:bg-canvas-hover hover:shadow-floating cursor-pointer",
        active && "border-border-focus/60 ring-1 ring-border-focus/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between gap-4 pb-3 border-b border-border-subtle/50 mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-serif text-lg font-normal text-ink-primary tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-ink-muted font-sans", className)} {...props}>
      {children}
    </p>
  );
}

