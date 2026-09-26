import type { ReactNode } from "react";
import { cn, AVATAR_COLORS, colorFromString, initials as getInitials } from "@/lib/utils";
import { Inbox } from "lucide-react";

/* ------------------------------------------------------------------ অ্যাভাটার */

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const key = color && AVATAR_COLORS[color] ? color : colorFromString(name);
  const sizes = {
    xs: "size-7 text-[10px]",
    sm: "size-9 text-xs",
    md: "size-11 text-sm",
    lg: "size-14 text-base",
    xl: "size-20 text-2xl",
  };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-bold text-white shadow-sm ring-1 ring-black/5",
        AVATAR_COLORS[key],
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}

/* ------------------------------------------------------------------ কার্ড */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={cn("card", padded && "p-4 sm:p-5", className)}>{children}</div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[0.95rem] font-bold leading-tight">{title}</h2>
          {subtitle ? (
            <p className="truncate text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ ব্যাজ */

export const TONES = {
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  sky: "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20",
  slate: "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={cn("chip", TONES[tone], className)}>{children}</span>;
}

/* ------------------------------------------------------------------ খালি অবস্থা */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        {icon ?? <Inbox className="size-7" />}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ স্কেলিটন */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function StatSkeleton() {
  return (
    <div className="card space-y-3 p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card flex items-center gap-3 p-3.5">
          <Skeleton className="size-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ স্ট্যাট কার্ড */

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "emerald",
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  trend?: number | null;
  className?: string;
}) {
  const toneBg: Record<Tone, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  };
  return (
    <div className={cn("card relative overflow-hidden p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-muted">{label}</p>
        {icon ? (
          <div className={cn("flex size-9 items-center justify-center rounded-xl", toneBg[tone])}>
            {icon}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        {typeof trend === "number" ? (
          <span
            className={cn(
              "chip",
              trend >= 0 ? TONES.emerald : TONES.rose,
            )}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
