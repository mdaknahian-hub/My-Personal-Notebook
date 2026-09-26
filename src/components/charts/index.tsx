"use client";

import { useMemo, useState } from "react";
import { fmtMoney, fmtMoneyCompact, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ ১৪ দিনের বার চার্ট */

export type SeriesPoint = { date: string; label: string; due: number; paid: number; sale: number };

export function DailyBarChart({
  data,
  bn,
  height = 190,
}: {
  data: SeriesPoint[];
  bn: boolean;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.due, d.paid)));
  const activePoint = active !== null ? data[active] : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-500" /> বাকি লেখা
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" /> জমা আদায়
        </span>
        {activePoint ? (
          <span className="ml-auto rounded-lg bg-[var(--surface-2)] px-2 py-1 tabular-nums">
            {toBnDigits(activePoint.label)} তারিখ — বাকি {fmtMoney(activePoint.due, { bn })} • জমা{" "}
            {fmtMoney(activePoint.paid, { bn })}
          </span>
        ) : null}
      </div>

      <div
        className="flex items-end gap-[3px] sm:gap-1.5"
        style={{ height }}
        role="img"
        aria-label="শেষ ১৪ দিনের বাকি ও জমার চার্ট"
      >
        {data.map((point, i) => {
          const dueH = Math.max(2, (point.due / max) * (height - 24));
          const paidH = Math.max(2, (point.paid / max) * (height - 24));
          return (
            <button
              key={point.date}
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg transition hover:bg-[var(--surface-2)]"
            >
              <span className="flex h-full w-full items-end justify-center gap-[2px]">
                <span
                  className="w-1/2 max-w-[10px] rounded-t-md bg-gradient-to-t from-rose-500/70 to-rose-400 transition-all"
                  style={{ height: dueH }}
                />
                <span
                  className="w-1/2 max-w-[10px] rounded-t-md bg-gradient-to-t from-emerald-600/70 to-emerald-400 transition-all"
                  style={{ height: paidH }}
                />
              </span>
              <span
                className={cn(
                  "text-[9px] font-semibold tabular-nums sm:text-[11px]",
                  active === i ? "text-brand-600" : "text-muted",
                )}
              >
                {toBnDigits(point.label)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ মাসিক বার */

export function MonthlyBars({
  rows,
  bn,
}: {
  rows: Array<{ label: string; sale: number; collection: number; expense: number }>;
  bn: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.sale, r.expense)));
  return (
    <div className="space-y-3.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold">{row.label}</span>
            <span className="text-muted">
              বিক্রি <span className="font-semibold text-[var(--text)]">{fmtMoneyCompact(row.sale, bn)}</span>
            </span>
          </div>
          <div className="space-y-1.5">
            <Bar value={row.sale} max={max} className="bg-gradient-to-r from-brand-500 to-teal-500" />
            <Bar value={row.collection} max={max} className="bg-gradient-to-r from-sky-500 to-cyan-500" />
            <Bar value={row.expense} max={max} className="bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-brand-500" /> বিক্রি
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-sky-500" /> আদায়
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500" /> খরচ
        </span>
      </div>
    </div>
  );
}

function Bar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const width = Math.max(1.5, (value / max) * 100);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div
        className={cn("h-full rounded-full transition-all duration-700", className)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ ডোনাট */

const DONUT_COLORS = [
  "#10b981",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
  "#ec4899",
  "#64748b",
];

export function Donut({
  items,
  bn,
  size = 168,
}: {
  items: Array<{ category: string; amount: number }>;
  bn: boolean;
  size?: number;
}) {
  const total = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);
  const [active, setActive] = useState<number | null>(null);

  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">এই সময়ে কোনো খরচ নেই</p>
    );
  }

  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = items.slice(0, 10).map((item, index) => {
    const fraction = item.amount / total;
    const dash = fraction * circumference;
    const segment = {
      ...item,
      dash,
      offset,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      percent: fraction * 100,
    };
    offset += dash;
    return segment;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={18}
          />
          {segments.map((s, i) => (
            <circle
              key={s.category}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={active === i ? 22 : 18}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              opacity={active === null || active === i ? 1 : 0.45}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] font-semibold text-muted">
            {active !== null ? segments[active].category : "মোট খরচ"}
          </p>
          <p className="text-lg font-extrabold tabular-nums">
            {fmtMoneyCompact(active !== null ? segments[active].amount : total, bn)}
          </p>
          {active !== null ? (
            <p className="text-[11px] text-muted tabular-nums">
              {toBnDigits(segments[active].percent.toFixed(1))}%
            </p>
          ) : null}
        </div>
      </div>

      <ul className="w-full flex-1 space-y-1.5">
        {segments.map((s, i) => (
          <li
            key={s.category}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition",
              active === i && "bg-[var(--surface-2)]",
            )}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate">{s.category}</span>
            <span className="tabular-nums text-muted">{toBnDigits(s.percent.toFixed(1))}%</span>
            <span className="font-semibold tabular-nums">{fmtMoney(s.amount, { bn })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ পাই প্রগ্রেস */

export function ProgressRing({
  value,
  max,
  label,
  sublabel,
  bn,
  size = 132,
}: {
  value: number;
  max: number;
  label: string;
  sublabel?: string;
  bn: boolean;
  size?: number;
}) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={12}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-700"
          />
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-extrabold tabular-nums">
            {fmtMoneyCompact(value, bn)}
          </p>
          <p className="text-[10px] font-semibold text-muted">{label}</p>
        </div>
      </div>
      {sublabel ? <p className="mt-1 text-xs text-muted">{sublabel}</p> : null}
    </div>
  );
}
