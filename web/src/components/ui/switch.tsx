"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, description, ...props }, ref) => (
  <div className="flex items-center justify-between gap-4">
    {(label || description) && (
      <div className="flex flex-col">
        {label && <span className="text-xs font-medium text-ink-primary font-sans">{label}</span>}
        {description && (
          <span className="text-[11px] text-ink-muted font-sans">{description}</span>
        )}
      </div>
    )}
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border-subtle transition-colors duration-200 outline-none",
        "focus-visible:ring-1 focus-visible:ring-alpenglow focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "data-[state=checked]:bg-alpenglow data-[state=unchecked]:bg-canvas-card",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-ink-primary shadow-sm transition-transform duration-200",
          "data-[state=checked]:translate-x-4 data-[state=checked]:bg-[#120F0D]",
          "data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-ink-muted"
        )}
      />
    </SwitchPrimitive.Root>
  </div>
));

Switch.displayName = "Switch";

