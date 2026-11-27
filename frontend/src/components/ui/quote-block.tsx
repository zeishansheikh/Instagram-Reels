"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface QuoteBlockProps extends React.HTMLAttributes<HTMLQuoteElement> {
  children: React.ReactNode;
  theme?: string;
  author?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function QuoteBlock({
  children,
  theme,
  author,
  size = "md",
  className,
  ...props
}: QuoteBlockProps) {
  const sizeMap = {
    sm: "text-base md:text-lg leading-relaxed",
    md: "text-xl md:text-2xl leading-snug",
    lg: "text-2xl md:text-3xl leading-snug",
    xl: "text-3xl md:text-4xl lg:text-[38px] leading-[1.25]",
  };

  return (
    <div className="flex flex-col gap-2.5 font-serif select-text">
      {/* Editorial Blockquote with Optical Hanging Punctuation (-0.42em) */}
      <blockquote
        className={cn(
          "font-serif italic font-normal text-ink-primary tracking-tight [text-wrap:balance]",
          sizeMap[size],
          className
        )}
        {...props}
      >
        <span className="inline-block -ml-[0.42em] mr-[0.08em] select-none text-ink-muted/80">
          “
        </span>
        {children}
        <span className="inline-block ml-[0.08em] select-none text-ink-muted/80">
          ”
        </span>
      </blockquote>

      {(theme || author) && (
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted font-medium">
          {theme && <span className="text-moss">#{theme}</span>}
          {theme && author && <span className="text-border-strong">•</span>}
          {author && <span className="text-ink-secondary">{author}</span>}
        </div>
      )}
    </div>
  );
}
