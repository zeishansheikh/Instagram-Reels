"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  type?: "success" | "warning" | "error" | "info";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    const timeout = toast.duration ?? (toast.action ? 6000 : 4000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, timeout);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast viewport fixed at bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-md bg-surface border border-border p-3.5 shadow-popover animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-status-success" />}
              {t.type === "warning" && <AlertCircle className="w-4 h-4 text-status-warning" />}
              {t.type === "error" && <AlertCircle className="w-4 h-4 text-status-error" />}
              {(!t.type || t.type === "info") && <Info className="w-4 h-4 text-moss" />}
            </div>
            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="font-sans text-xs font-semibold text-ink-primary tracking-tight">{t.title}</p>
              {t.description && <p className="font-sans text-[11px] text-ink-secondary leading-snug">{t.description}</p>}
            </div>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick();
                  removeToast(t.id);
                }}
                className="px-2 py-1 rounded-sm bg-subtle hover:bg-border text-xs font-mono font-medium text-ink-primary border border-border shrink-0 transition-fast"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => removeToast(t.id)}
              className="text-ink-muted hover:text-ink-primary p-0.5 rounded-sm transition-fast shrink-0"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
