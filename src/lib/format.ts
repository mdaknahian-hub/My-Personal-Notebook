/**
 * বাংলা সংখ্যা, মুদ্রা, তারিখ ও সময় ফরম্যাটিং।
 * সার্ভার ও ক্লায়েন্ট — দুই জায়গায় একই ফলাফল দেয় (হাইড্রেশন মিসম্যাচ এড়ানোর জন্য hand-rolled)।
 */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

export const BN_MONTHS_SHORT = [
  "জানু",
  "ফেব",
  "মার্চ",
  "এপ্রি",
  "মে",
  "জুন",
  "জুল",
  "আগ",
  "সেপ",
  "অক্টো",
  "নভে",
  "ডিসে",
];

export const BN_WEEKDAYS = [
  "রবিবার",
  "সোমবার",
  "মঙ্গলবার",
  "বুধবার",
  "বৃহস্পতিবার",
  "শুক্রবার",
  "শনিবার",
];

export const BN_WEEKDAYS_SHORT = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

/** ইংরেজি ডিজিট → বাংলা ডিজিট */
export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** বাংলা ডিজিট → ইংরেজি ডিজিট (ইনপুট পার্সের জন্য) */
export function toEnDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** ইন্ডিয়ান গ্রুপিং সহ সংখ্যা: ১২,৩৪,৫৬৭ */
export function groupNumber(value: number, decimals = 0): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const fixed = abs.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  let grouped: string;
  if (intPart.length <= 3) {
    grouped = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  const out = decPart ? `${grouped}.${decPart}` : grouped;
  return negative ? `-${out}` : out;
}

type NumOpts = { bn?: boolean; decimals?: number; signed?: boolean };

/** সংখ্যা — প্রয়োজনে বাংলা ডিজিটে */
export function fmtNum(value: number, opts: NumOpts = {}): string {
  const { bn = true, decimals = 0, signed = false } = opts;
  const rounded =
    Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(decimals || 2));
  const dec = decimals > 0 ? decimals : Number.isInteger(rounded) ? 0 : 2;
  let out = groupNumber(rounded, dec);
  if (signed && rounded > 0) out = `+${out}`;
  return bn ? toBnDigits(out) : out;
}

/** টাকার পরিমাণ: ৳ ১,২৫০ */
export function fmtMoney(value: number, opts: NumOpts = {}): string {
  const { bn = true, decimals = 0, signed = false } = opts;
  return `৳ ${fmtNum(value, { bn, decimals, signed })}`;
}

/** সংক্ষিপ্ত টাকার পরিমাণ: ৳ ১২.৫ হাজার / ৳ ১.২ লক্ষ */
export function fmtMoneyCompact(value: number, bn = true): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const unit = (n: number, label: string) =>
    `${sign}৳ ${n.toFixed(n % 1 === 0 ? 0 : 1)} ${label}`;
  let out: string;
  if (abs >= 1_00_00_000) out = unit(abs / 1_00_00_000, "কোটি");
  else if (abs >= 1_00_000) out = unit(abs / 1_00_000, "লক্ষ");
  else if (abs >= 1000) out = unit(abs / 1000, "হাজার");
  else out = `${sign}৳ ${groupNumber(abs, abs % 1 === 0 ? 0 : 2)}`;
  return bn ? toBnDigits(out) : out;
}

function asDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/** ২৬ সেপ্টেম্বর, ২০২৬ */
export function fmtDate(d: Date | string, bn = true): string {
  const date = asDate(d);
  const out = `${date.getDate()} ${BN_MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
  return bn ? toBnDigits(out) : out;
}

/** ২৬ সেপ, ২০২৬ */
export function fmtDateShort(d: Date | string, bn = true): string {
  const date = asDate(d);
  const out = `${date.getDate()} ${BN_MONTHS_SHORT[date.getMonth()]}, ${date.getFullYear()}`;
  return bn ? toBnDigits(out) : out;
}

/** ২৬/০৯/২০২৬ */
export function fmtDateNumeric(d: Date | string, bn = true): string {
  const date = asDate(d);
  const out = `${`${date.getDate()}`.padStart(2, "0")}/${`${date.getMonth() + 1}`.padStart(2, "0")}/${date.getFullYear()}`;
  return bn ? toBnDigits(out) : out;
}

/** সোমবার, ২৬ সেপ্টেম্বর ২০২৬ */
export function fmtDateLong(d: Date | string, bn = true): string {
  const date = asDate(d);
  const out = `${BN_WEEKDAYS[date.getDay()]}, ${date.getDate()} ${BN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return bn ? toBnDigits(out) : out;
}

/** 2026-09 — রিপোর্টের জন্য */
export function monthKey(d: Date | string): string {
  const date = asDate(d);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

/** সেপ্টেম্বর ২০২৬ */
export function monthLabel(date: Date | string, bn = true): string {
  const d = asDate(date);
  const out = `${BN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return bn ? toBnDigits(out) : out;
}

/** বিকেল ৪:৩০ */
export function fmtTime(d: Date | string, bn = true): string {
  const date = asDate(d);
  const h = date.getHours();
  const m = date.getMinutes();
  const part = h < 6 ? "ভোর" : h < 12 ? "সকাল" : h < 16 ? "দুপুর" : h < 19 ? "বিকেল" : "রাত";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const out = `${part} ${hour12}:${`${m}`.padStart(2, "0")}`;
  return bn ? toBnDigits(out) : out;
}

/** আজ / গতকাল / ৩ দিন আগে */
export function fmtRelative(d: Date | string, bn = true): string {
  const date = asDate(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "এইমাত্র";
  if (diffMin < 60) {
    const out = `${diffMin} মিনিট আগে`;
    return bn ? toBnDigits(out) : out;
  }
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) {
    const out = `${diffHour} ঘণ্টা আগে`;
    return bn ? toBnDigits(out) : out;
  }
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startThat = new Date(date);
  startThat.setHours(0, 0, 0, 0);
  const diffDay = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86400000,
  );
  if (diffDay === 0) return "আজ";
  if (diffDay === 1) return "গতকাল";
  if (diffDay < 7) {
    const out = `${diffDay} দিন আগে`;
    return bn ? toBnDigits(out) : out;
  }
  if (diffDay < 30) {
    const out = `${Math.round(diffDay / 7)} সপ্তাহ আগে`;
    return bn ? toBnDigits(out) : out;
  }
  if (diffDay < 365) {
    const out = `${Math.round(diffDay / 30)} মাস আগে`;
    return bn ? toBnDigits(out) : out;
  }
  const out = `${Math.round(diffDay / 365)} বছর আগে`;
  return bn ? toBnDigits(out) : out;
}

/** ফোন নম্বরকে +৮৮০ ফরম্যাটে (WhatsApp লিংকের জন্য) */
export function toIntlPhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = toEnDigits(phone).replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
}

/** ০১৭১২-৩৪৫৬৭৮ স্টাইলে দেখানো */
export function prettyPhone(phone?: string | null, bn = true): string {
  if (!phone) return "—";
  const raw = toEnDigits(phone).replace(/\s/g, "");
  const out = raw.length === 11 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
  return bn ? toBnDigits(out) : out;
}

export function paymentMethodLabel(m?: string | null) {
  if (!m) return "—";
  const map: Record<string, string> = {
    cash: "নগদ",
    বিকাশ: "বিকাশ",
    নগদ: "নগদ (অ্যাপ)",
    নগদঅ্যাপ: "নগদ (অ্যাপ)",
    nagad: "নগদ (অ্যাপ)",
    rocket: "রকেট",
    bank: "ব্যাংক",
    due: "বাকি",
  };
  return map[m] ?? m;
}

export const TRANSACTION_TYPES = {
  DUE: { label: "বাকি", short: "বাকি", tone: "rose" },
  PAYMENT: { label: "জমা", short: "জমা", tone: "emerald" },
  DISCOUNT: { label: "ছাড় / মাফ", short: "ছাড়", tone: "amber" },
  CASH_SALE: { label: "নগদ বিক্রি", short: "নগদ", tone: "sky" },
} as const;

export type TransactionType = keyof typeof TRANSACTION_TYPES;

export function typeLabel(type: string) {
  return (
    TRANSACTION_TYPES[type as TransactionType]?.label ?? type
  );
}
