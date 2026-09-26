"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toBnDigits, toEnDigits } from "@/lib/format";

/* ------------------------------------------------------------------ লেবেল র‍্যাপার */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="mb-1.5 flex items-center gap-1 text-[0.8rem] font-semibold">
          {label}
          {required ? <span className="text-rose-500">*</span> : null}
        </span>
      ) : null}
      {children}
      {hint && !error ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ ইনপুট */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn("input-base", className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={3}
      className={cn("input-base resize-y leading-relaxed", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "input-base appearance-none pr-10 [&>option]:bg-[var(--surface)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
});

/* ------------------------------------------------------------------ টাকার ইনপুট */

export function MoneyInput({
  value,
  onChange,
  placeholder = "০",
  autoFocus,
  className,
  name,
  disabled,
}: {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  name?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState<string>(
    value === "" || value === undefined || Number(value) === 0 ? "" : String(value),
  );
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    setText(
      value === "" || value === undefined || Number(value) === 0 ? "" : String(value),
    );
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-brand-600 dark:text-brand-400">
        ৳
      </span>
      <input
        name={name}
        disabled={disabled}
        inputMode="decimal"
        autoFocus={autoFocus}
        value={text === "" ? "" : toBnDigits(text)}
        onFocus={(e) => {
          focused.current = true;
          e.currentTarget.select();
        }}
        onBlur={() => {
          focused.current = false;
          const parsed = Number(toEnDigits(text).replace(/[^0-9.]/g, ""));
          const clean = Number.isFinite(parsed) ? parsed : 0;
          setText(clean === 0 ? "" : String(clean));
          onChange(clean);
        }}
        onChange={(e) => {
          const raw = toEnDigits(e.target.value).replace(/[^0-9.]/g, "");
          setText(raw);
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        placeholder={placeholder}
        className="input-base pl-9 text-lg font-bold tabular-nums"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ সার্চ */

export function SearchInput({
  value,
  onChange,
  placeholder = "খুঁজুন...",
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pl-10 pr-9"
      />
      {value ? (
        <button
          type="button"
          aria-label="মুছুন"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ সার্চেবল সিলেক্ট */

export type Option = { value: string; label: string; hint?: string; meta?: ReactNode };

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "নির্বাচন করুন",
  emptyText = "কিছু পাওয়া যায়নি",
  className,
}: {
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 60);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.hint ?? "").toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [options, query]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className={cn(
          "input-base flex items-center justify-between gap-2 text-left",
          !selected && "text-muted",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.meta}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted transition", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-xl">
          <div className="relative border-b p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="নাম লিখে খুঁজুন..."
              className="input-base py-2 pl-9 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">{emptyText}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-[var(--surface-2)]",
                    value === o.value && "bg-[var(--surface-2)]",
                  )}
                >
                  {o.meta}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.label}</span>
                    {o.hint ? (
                      <span className="block truncate text-xs text-muted">{o.hint}</span>
                    ) : null}
                  </span>
                  {value === o.value ? (
                    <Check className="size-4 shrink-0 text-brand-600" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ সেগমেন্ট কন্ট্রোল */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: Array<{ value: T; label: string; icon?: ReactNode; tone?: string }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex w-full gap-1 rounded-2xl border bg-[var(--surface-2)] p-1",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl font-semibold transition",
            size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
            value === o.value
              ? "bg-[var(--surface)] shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              : "text-muted hover:text-[var(--text)]",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ ট্যাগ ইনপুট */

export function TagPicker({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
}) {
  const [custom, setCustom] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "chip border transition",
              value === s
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                : "border-[var(--border)] text-muted hover:border-brand-300",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="নতুন ট্যাগ লিখুন"
          className="input-base py-2 text-sm"
        />
        <button
          type="button"
          disabled={!custom.trim()}
          onClick={() => {
            onChange(custom.trim());
            setCustom("");
          }}
          className="btn btn-ghost px-3 py-2 text-sm"
        >
          যোগ
        </button>
      </div>
    </div>
  );
}
