/** খতিয়ান ও হিসাবের গণনা — ক্লায়েন্ট ও সার্ভার দুই দিকেই ব্যবহারযোগ্য (pure functions) */

export type LedgerLike = {
  id: string;
  type: string;
  amount: number;
  discount?: number | null;
  date: Date | string;
  note?: string | null;
  createdAt?: Date | string;
};

/** কাস্টমারের বাকিতে এই লেনদেনের প্রভাব */
export function signedDue(t: Pick<LedgerLike, "type" | "amount" | "discount">): number {
  switch (t.type) {
    case "DUE":
      return t.amount;
    case "PAYMENT":
      return -t.amount;
    case "DISCOUNT":
      return -t.amount;
    default:
      return 0; // CASH_SALE — কাস্টমারের খতিয়ানে প্রভাব নেই
  }
}

export function computeDue(opening: number, txns: LedgerLike[]): number {
  const delta = txns.reduce((sum, t) => sum + signedDue(t), 0);
  return round2(opening + delta);
}

export type LedgerRow = LedgerLike & { balance: number };

/** পুরনো → নতুন ক্রমে সাজানো লেনদেনে চলমান ব্যালেন্স যোগ করে */
export function withRunningBalance(
  opening: number,
  txnsAscending: LedgerLike[],
): LedgerRow[] {
  let balance = opening;
  return txnsAscending.map((t) => {
    balance = round2(balance + signedDue(t));
    return { ...t, balance };
  });
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type DueSeverity = "clear" | "low" | "medium" | "high";

export function dueSeverity(
  due: number,
  creditLimit?: number | null,
): DueSeverity {
  if (due <= 0.5) return "clear";
  if (creditLimit && creditLimit > 0) {
    const ratio = due / creditLimit;
    if (ratio >= 1) return "high";
    if (ratio >= 0.6) return "medium";
    return "low";
  }
  if (due >= 5000) return "high";
  if (due >= 1500) return "medium";
  return "low";
}

export const SEVERITY_META: Record<
  DueSeverity,
  { label: string; text: string; bg: string; ring: string; dot: string }
> = {
  clear: {
    label: "হিসাব পরিষ্কার",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    ring: "ring-emerald-200 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  low: {
    label: "স্বাভাবিক",
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    ring: "ring-sky-200 dark:ring-sky-500/30",
    dot: "bg-sky-500",
  },
  medium: {
    label: "নজর রাখুন",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    ring: "ring-amber-200 dark:ring-amber-500/30",
    dot: "bg-amber-500",
  },
  high: {
    label: "বেশি বাকি",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    ring: "ring-rose-200 dark:ring-rose-500/30",
    dot: "bg-rose-500",
  },
};

export type DayPoint = { date: string; label: string; due: number; paid: number; sale: number };

/** শেষ n দিনের সিরিজ (রিপোর্ট/ড্যাশবোর্ড চার্টের জন্য) */
export function buildDailySeries(
  txns: { type: string; amount: number; date: Date | string }[],
  days: number,
): DayPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: DayPoint[] = [];
  const index = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
    const point: DayPoint = {
      date: key,
      label: `${d.getDate()}`,
      due: 0,
      paid: 0,
      sale: 0,
    };
    buckets.push(point);
    index.set(key, point);
  }
  for (const t of txns) {
    const d = typeof t.date === "string" ? new Date(t.date) : t.date;
    const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
    const bucket = index.get(key);
    if (!bucket) continue;
    if (t.type === "DUE") {
      bucket.due += t.amount;
      bucket.sale += t.amount;
    } else if (t.type === "CASH_SALE") {
      bucket.sale += t.amount;
    } else if (t.type === "PAYMENT") {
      bucket.paid += t.amount;
    }
  }
  return buckets.map((b) => ({
    ...b,
    due: round2(b.due),
    paid: round2(b.paid),
    sale: round2(b.sale),
  }));
}

/** আনুমানিক লাভ — বিক্রির পরিমাণ × গড় মার্জিন (পণ্যের ক্রয়-বিক্রয় দাম থেকে) */
export function estimateProfit(
  saleAmount: number,
  avgMarginPercent: number,
): number {
  return round2((saleAmount * avgMarginPercent) / 100);
}
