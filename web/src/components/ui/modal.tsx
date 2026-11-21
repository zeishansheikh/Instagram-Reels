"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;

export const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title?: string;
    description?: string;
    variant?: "center" | "drawer";
  }
>(({ className, children, title, description, variant = "center", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#16150F]/40 backdrop-blur-[2px] transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 bg-surface border border-border shadow-popover outline-none",
        variant === "center" &&
          "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg rounded-md p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        variant === "drawer" &&
          "right-0 top-0 bottom-0 h-full w-full max-w-md p-6 border-l duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        {title && (
          <div>
            <DialogPrimitive.Title className="font-sans text-base font-semibold text-ink-primary tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-xs text-ink-muted mt-0.5 font-sans">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
        )}
        <DialogPrimitive.Close className="rounded-sm p-1 text-ink-muted hover:text-ink-primary hover:bg-subtle transition-fast outline-none focus-visible:ring-1 focus-visible:ring-moss">
          <X className="w-4 h-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
      <div>{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
ModalContent.displayName = "ModalContent";

