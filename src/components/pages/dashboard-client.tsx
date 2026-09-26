"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  Clock,
  Eye,
  MoreVertical,
  Pencil,
  Phone,
  Receipt,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Avatar, Badge, EmptyState, TONES } from "@/components/ui/bits";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { ReminderSheet } from "@/components/reminder-sheet";
import { TransactionForm } from "@/components/forms/transaction-form";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtDateNumeric, fmtMoney, fmtRelative, prettyPhone, toIntlPhone, typeLabel } from "@/lib/format";
import { dueSeverity, SEVERITY_META } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type { CustomerWithBalance } from "@/lib/queries";
import type { Transaction } from "@/lib/models";

/* ------------------------------------------------------------------ বাকি বেশি যাদের */

export function TopDueList({ rows }: { rows: CustomerWithBalance[] }) {
  const { bn } = useStore();
  const [reminderFor, setReminderFor] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="কারো কাছে বাকি নেই"
        description="সব কাস্টমারের হিসাব পরিষ্কার। নতুন বাকি লিখতে বাকি অপশনটি বেছে নিন।"
        className="border-0"
      />
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((c) => {
        const severity = SEVERITY_META[dueSeverity(c.due, c.creditLimit)];
        return (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-2xl border p-3 transition hover:border-brand-300"
          >
            <Link href={`/customers/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={c.name} color={c.color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                  <span className={cn("size-1.5 rounded-full", severity.dot)} />
                  {c.lastActivityAt
                    ? `${fmtRelative(c.lastActivityAt, bn)} লেনদেন`
                    : "এখনো লেনদেন হয়নি"}
                  {c.phone ? ` • ${prettyPhone(c.phone, bn)}` : ""}
                </p>
              </div>
              <span className={cn("text-sm font-bold tabular-nums", severity.text)}>
                {fmtMoney(c.due, { bn })}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setReminderFor(c.id)}
              className="rounded-xl border p-2 text-brand-600 transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
              aria-label="তাগাদা পাঠান"
            >
              <BellRing className="size-4" />
            </button>
          </div>
        );
      })}
      <ReminderSheet
        open={!!reminderFor}
        onClose={() => setReminderFor(null)}
        customerId={reminderFor}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ আজকের লেনদেন */

export function TodayTransactions({ transactions }: { transactions: Transaction[] }) {
  const { bn, temp, customers } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const result = await temp.removeTransaction(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) {
      toast.success("লেনদেন মুছে ফেলা হয়েছে");
      router.refresh();
    }
  };

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="আজ এখনো কোনো লেনদেন নেই"
        description="আজকের বাকি বা জমা লিখলে এখানে দেখা যাবে।"
        className="border-0"
      />
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((t) => {
        const tone =
          t.type === "PAYMENT"
            ? TONES.emerald
            : t.type === "DUE"
              ? TONES.rose
              : t.type === "DISCOUNT"
                ? TONES.amber
                : TONES.sky;
        const isPending = (t as { _pending?: boolean })._pending;
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3",
              isPending && "opacity-60",
            )}
          >
            <Link
              href={t.customerId ? `/customers/${t.customerId}` : "/transactions"}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Avatar
                name={t.customer?.name ?? "নগদ"}
                color={t.customer?.color}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {t.customer?.name ?? "নগদ ক্রেতা"}
                </p>
                <p className="truncate text-xs text-muted">
                  {t.items.length > 0
                    ? t.items.map((i) => `${i.name} (${i.qty})`).join(", ")
                    : (t.note ?? typeLabel(t.type))}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-1.5">
              <span className={cn("chip tabular-nums", tone)}>{fmtMoney(t.amount, { bn })}</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuFor(menuFor === t.id ? null : t.id)}
                  className="rounded-xl p-1.5 text-muted transition hover:bg-[var(--surface-2)]"
                  aria-label="অপশন"
                >
                  <MoreVertical className="size-4" />
                </button>
                {menuFor === t.id ? (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                    <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(t);
                          setMenuFor(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-[var(--surface-2)]"
                      >
                        <Pencil className="size-4" /> সম্পাদনা
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleting(t);
                          setMenuFor(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-4" /> মুছে ফেলুন
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="লেনদেন সম্পাদনা"
        size="lg"
      >
        {editing ? (
          <TransactionForm
            editing={editing}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="লেনদেনটি মুছে ফেলবেন?"
        message={
          <span>
            {deleting?.customer?.name ?? "নগদ ক্রেতা"} — {fmtMoney(deleting?.amount ?? 0, { bn })}।
            মুছে ফেললে বাকির হিসাবও সমন্বয় হয়ে যাবে।
          </span>
        }
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ দ্রুত তাগাদা কার্ড */

export function QuickReminderRow({ rows }: { rows: CustomerWithBalance[] }) {
  const { bn } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = rows.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="কাস্টমার খুঁজুন..."
        className="input-base mb-2 py-2 text-sm"
      />
      <div className="max-h-72 space-y-1.5 overflow-y-auto">
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl border p-2.5">
            <Avatar name={c.name} color={c.color} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="text-[11px] text-muted">
                {c.phone ? prettyPhone(c.phone, bn) : "নম্বর নেই"}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {fmtMoney(c.due, { bn })}
            </span>
            <div className="flex gap-1">
              {c.phone ? (
                <a
                  href={`tel:${toIntlPhone(c.phone)}`}
                  className="rounded-lg border p-1.5 text-muted transition hover:text-[var(--text)]"
                  aria-label="কল করুন"
                >
                  <Phone className="size-3.5" />
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(c.id)}
                className="rounded-lg border p-1.5 text-brand-600"
                aria-label="তাগাদা"
              >
                <BellRing className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">কাস্টমার পাওয়া যায়নি</p>
        ) : null}
      </div>
      <ReminderSheet open={!!open} onClose={() => setOpen(null)} customerId={open} />
    </div>
  );
}

/* ------------------------------------------------------------------ কার্ড হেডার লিংক */

export function SeeAllLink({ href, label = "সব দেখুন" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 transition hover:gap-2 dark:text-brand-400"
    >
      {label} <ArrowRight className="size-3.5" />
    </Link>
  );
}

/* ------------------------------------------------------------------ মিনি সামারি */

export function MiniStat({
  icon,
  label,
  value,
  hint,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border p-3">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted">{label}</p>
        <p className="truncate text-sm font-bold tabular-nums">{value}</p>
        {hint ? <p className="truncate text-[11px] text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export const DashboardIcons = { Clock, Receipt, TrendingUp, Eye, ArrowRight, fmtDateNumeric };
