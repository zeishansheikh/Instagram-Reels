"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface QuoteTextProps extends React.HTMLAttributes<HTMLQuoteElement> {
  children: React.ReactNode;
  theme?: string;
  author?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function QuoteText({
  children,
  theme,
  author,
  size = "md",
  className,
  ...props
}: QuoteTextProps) {
  const sizes = {
    sm: "text-base md:text-lg leading-relaxed",
    md: "text-xl md:text-2xl leading-snug",
    lg: "text-2xl md:text-3xl leading-snug",
    xl: "text-3xl md:text-4xl leading-tight",
  };

  return (
    <div className="flex flex-col gap-3 font-serif">
      <blockquote
        className={cn(
          "italic text-ink-primary font-normal tracking-tight [text-wrap:balance]",
          sizes[size],
          className
        )}
        {...props}
      >
        &ldquo;{children}&rdquo;
      </blockquote>

      {(theme || author) && (
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
          {theme && <span className="text-alpenglow">#{theme}</span>}
          {theme && author && <span>·</span>}
          {author && <span>{author}</span>}
        </div>
      )}
    </div>
  );
}

