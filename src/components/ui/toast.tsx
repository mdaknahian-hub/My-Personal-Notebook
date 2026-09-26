"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration: number;
};

type ToastInput = {
  kind?: ToastKind;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-emerald-400" />,
  error: <AlertTriangle className="size-5 text-rose-400" />,
  warning: <AlertTriangle className="size-5 text-amber-400" />,
  info: <Info className="size-5 text-sky-400" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = {
        id,
        kind: input.kind ?? "info",
        title: input.title,
        description: input.description,
        action: input.action,
        duration: input.duration ?? (input.action ? 6000 : 3600),
      };
      setItems((prev) => [...prev.slice(-3), item]);
      if (item.duration > 0) {
        setTimeout(() => dismiss(id), item.duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ kind: "success", title, description }),
      error: (title, description) => toast({ kind: "error", title, description }),
      info: (title, description) => toast({ kind: "info", title, description }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "animate-scale-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3.5 shadow-[0_18px_40px_-16px_rgba(16,24,40,0.35)] backdrop-blur-xl",
              "bg-white/95 border-slate-200 dark:bg-slate-900/95 dark:border-slate-700",
            )}
          >
            <div className="mt-0.5 shrink-0">{ICONS[item.kind]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs text-muted leading-relaxed">
                  {item.description}
                </p>
              ) : null}
              {item.action ? (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    dismiss(item.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Undo2 className="size-3.5" />
                  {item.action.label}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="বন্ধ করুন"
              onClick={() => dismiss(item.id)}
              className="rounded-lg p-1 text-muted transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
