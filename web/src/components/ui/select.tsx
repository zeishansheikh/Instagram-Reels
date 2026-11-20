"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Select an option...",
  label,
  disabled,
  className,
}: SelectProps) {
  return (
    <div className="w-full flex flex-col gap-1.5 font-sans">
      {label && (
        <span className="text-xs uppercase tracking-wider font-mono text-ink-muted">
          {label}
        </span>
      )}
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "w-full inline-flex items-center justify-between bg-canvas-card border border-border-subtle rounded-[6px] px-3 py-2 text-xs text-ink-primary transition-colors duration-200 outline-none",
            "hover:border-border-medium focus:border-border-focus focus:ring-1 focus:ring-border-focus/40",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 min-w-[8rem] overflow-hidden rounded-[8px] bg-canvas-surface border border-border-medium shadow-card animate-in fade-in-80"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    "relative flex items-center justify-between px-3 py-1.5 text-xs text-ink-primary rounded-[4px] cursor-pointer outline-none select-none",
                    "focus:bg-canvas-hover focus:text-alpenglow data-[disabled]:opacity-40"
                  )}
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="w-3.5 h-3.5 text-alpenglow" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

