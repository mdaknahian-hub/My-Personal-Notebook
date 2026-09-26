"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** মোবাইলে নিচ থেকে শিট আকারে খোলে (ডিফল্ট: সত্য) */
  sheetOnMobile?: boolean;
};

const SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  sheetOnMobile = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div
        className="animate-fade-in absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden border shadow-2xl",
          "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
          sheetOnMobile
            ? "animate-sheet rounded-t-3xl sm:animate-scale-in sm:rounded-3xl"
            : "animate-scale-in rounded-3xl",
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-lg font-bold leading-tight">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="-mr-1 -mt-1 rounded-xl p-2 text-muted transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="safe-bottom border-t bg-[var(--surface-2)] px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

type ConfirmProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "হ্যাঁ, নিশ্চিত",
  cancelLabel = "বাতিল",
  tone = "danger",
  loading,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="text-sm leading-relaxed text-muted">{message}</div>
      <div className="mt-5 flex gap-2.5">
        <button type="button" className="btn btn-ghost flex-1" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onConfirm}
          className={cn(
            "btn flex-1 text-white",
            tone === "danger" ? "btn-danger" : "btn-primary",
          )}
        >
          {loading ? "একটু অপেক্ষা..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
