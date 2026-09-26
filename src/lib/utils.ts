import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function toDateInput(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date | string = new Date()) {
  const date = typeof d === "string" ? new Date(d) : new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(d: Date | string = new Date()) {
  const date = typeof d === "string" ? new Date(d) : new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(d: Date | string, days: number) {
  const date = typeof d === "string" ? new Date(d) : new Date(d);
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfMonth(d: Date | string = new Date()) {
  const date = typeof d === "string" ? new Date(d) : new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function formatPercent(value: number, digits = 0) {
  return `${value >= 0 ? "" : "-"}${Math.abs(value).toFixed(digits)}%`;
}

/** নির্দিষ্ট অক্ষরের পার্সেন্টাইল রঙ — অ্যাভাটারে ব্যবহারের জন্য */
export const AVATAR_COLORS: Record<string, string> = {
  emerald: "from-emerald-400 to-teal-600",
  sky: "from-sky-400 to-blue-600",
  violet: "from-violet-400 to-purple-600",
  amber: "from-amber-400 to-orange-600",
  rose: "from-rose-400 to-pink-600",
  cyan: "from-cyan-400 to-teal-600",
  lime: "from-lime-400 to-green-600",
  fuchsia: "from-fuchsia-400 to-purple-600",
  indigo: "from-indigo-400 to-blue-700",
  orange: "from-orange-400 to-red-600",
};

export const AVATAR_COLOR_KEYS = Object.keys(AVATAR_COLORS);

export function colorFromString(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return AVATAR_COLOR_KEYS[hash % AVATAR_COLOR_KEYS.length];
}

export function initials(name: string) {
  const clean = name.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? "") + (parts[1][0] ?? "");
}
