"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarRange,
  Download,
  HandCoins,
  MoreVertical,
  Pencil,
  Percent,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { Avatar, Badge, Card, EmptyState, TONES } from "@/components/ui/bits";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SearchInput, Segmented } from "@/components/ui/fields";
import { TransactionForm } from "@/components/forms/transaction-form";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import {
  fmtDateLong,
  fmtMoney,
  fmtTime,
  paymentMethodLabel,
  toBnDigits,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TxnLite } from "@/lib/types";

type TypeFilter = "all" | "DUE" | "PAYMENT" | "DISCOUNT" | "CASH_SALE";
type RangeFilter = "today" | "7d" | "30d" | "all";

const TYPE_META: Record<string, { label: string; tone: keyof typeof TONES; icon: React.ReactNode }> = {
  DUE: { label: "বাকি", tone: "rose", icon: <ArrowUpRight className="size-3.5" /> },
  PAYMENT: { label: "জমা", tone: "emerald", icon: <ArrowDownLeft className="size-3.5" /> },
  DISCOUNT: { label: "ছাড়", tone: "amber", icon: <Percent className="size-3.5" /> },
  CASH_SALE: { label: "নগদ বিক্রি", tone: "sky", icon: <Banknote className="size-3.5" /> },
};

export function TransactionsClient() {
  const { transactions, bn, temp, customers } = useStore();
  const router = useRouter();
  const toast = useToast();

  const [type, setType] = useState<TypeFilter>("all");
  const [range, setRange] = useState<RangeFilter>("30d");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TxnLite | null>(null);
  const [deleting, setDeleting] = useState<TxnLite | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<TxnLite | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    if (from || to) {
      start = from ? new Date(`${from}T00:00:00`) : null;
    } else if (range === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "7d") {
      start = new Date(now.getTime() - 7 * 86400000);
    } else if (range === "30d") {
      start = new Date(now.getTime() - 30 * 86400000);
    }
    const end = to ? new Date(`${to}T23:59:59`) : null;
    const q = query.trim().toLowerCase();

    return transactions.filter((t) => {
      const d = new Date(t.date).getTime();
      if (start && d < start.getTime()) return false;
      if (end && d > end.getTime()) return false;
      if (type !== "all" && t.type !== type) return false;
      if (!q) return true;
      return (
        t.customer?.name.toLowerCase().includes(q) ||
        t.note?.toLowerCase().includes(q) ||
        t.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [transactions, type, range, query, from, to]);

  const totals = useMemo(() => {
    const sum = (t: string) =>
      filtered.filter((x) => x.type === t).reduce((s, x) => s + x.amount, 0);
    return {
      due: sum("DUE"),
      payment: sum("PAYMENT"),
      cash: sum("CASH_SALE"),
      discount: sum("DISCOUNT"),
      count: filtered.length,
    };
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, TxnLite[]>();
    for (const t of filtered) {
      const key = new Date(t.date).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [filtered]);

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

  const exportCsv = () => {
    const header = ["তারিখ", "কাস্টমার", "ধরন", "টাকা", "মাধ্যম", "নোট"];
    const rows = filtered.map((t) => [
      new Date(t.date).toISOString().slice(0, 10),
      t.customer?.name ?? "নগদ ক্রেতা",
      TYPE_META[t.type]?.label ?? t.type,
      String(t.amount),
      t.method ?? "",
      (t.note ?? "").replace(/,/g, " "),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lenodan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ফাইল ডাউনলোড হয়েছে");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* সামারি */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "বাকি লেখা", value: totals.due, tone: TONES.rose, icon: <ArrowUpRight className="size-4" /> },
          { label: "জমা আদায়", value: totals.payment, tone: TONES.emerald, icon: <HandCoins className="size-4" /> },
          { label: "নগদ বিক্রি", value: totals.cash, tone: TONES.sky, icon: <Banknote className="size-4" /> },
          { label: "ছাড় দেওয়া", value: totals.discount, tone: TONES.amber, icon: <Percent className="size-4" /> },
        ].map((s) => (
          <div key={s.label} className="card p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted">{s.label}</p>
              <span className={cn("flex size-7 items-center justify-center rounded-lg", s.tone)}>
                {s.icon}
              </span>
            </div>
            <p className="mt-1 text-lg font-extrabold tabular-nums">{fmtMoney(s.value, { bn })}</p>
          </div>
        ))}
      </div>

      {/* ফিল্টার */}
      <Card className="space-y-3">
        <div className="flex gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="কাস্টমার, পণ্য বা নোট দিয়ে খুঁজুন..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn btn-primary shrink-0 px-3.5"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">নতুন এন্ট্রি</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Segmented<TypeFilter>
            size="sm"
            className="flex-1 min-w-[280px]"
            options={[
              { value: "all", label: "সব" },
              { value: "DUE", label: "বাকি" },
              { value: "PAYMENT", label: "জমা" },
              { value: "DISCOUNT", label: "ছাড়" },
              { value: "CASH_SALE", label: "নগদ" },
            ]}
            value={type}
            onChange={setType}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: "today", label: "আজ" },
              { value: "7d", label: "৭ দিন" },
              { value: "30d", label: "৩০ দিন" },
              { value: "all", label: "সব সময়" },
            ] as Array<{ value: RangeFilter; label: string }>
          ).map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setRange(r.value);
                setFrom("");
                setTo("");
              }}
              className={cn(
                "chip border transition",
                range === r.value && !from && !to
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : "border-[var(--border)] text-muted",
              )}
            >
              {r.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1.5">
            <CalendarRange className="size-4 text-muted" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input-base py-1.5 text-xs"
            />
            <span className="text-xs text-muted">থেকে</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input-base py-1.5 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Receipt className="size-3.5" />
            {bn ? totals.count.toLocaleString("bn-BD") : totals.count} টি লেনদেন
          </span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-400"
          >
            <Download className="size-3.5" /> CSV ডাউনলোড
          </button>
        </div>
      </Card>

      {/* তালিকা */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-6" />}
          title="কোনো লেনদেন পাওয়া যায়নি"
          description="ফিল্টার বদলে দেখুন অথবা নতুন এন্ট্রি লিখুন।"
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> নতুন লেনদেন লিখুন
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([day, rows]) => {
            const dayTotal = rows
              .filter((r) => r.type === "DUE" || r.type === "CASH_SALE")
              .reduce((s, r) => s + r.amount, 0);
            const dayPaid = rows
              .filter((r) => r.type === "PAYMENT")
              .reduce((s, r) => s + r.amount, 0);
            return (
              <div key={day}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-bold">
                    {fmtDateLong(rows[0].date, bn)}
                  </p>
                  <p className="text-[11px] font-semibold text-muted">
                    বিক্রি {fmtMoney(dayTotal, { bn })} • জমা {fmtMoney(dayPaid, { bn })}
                  </p>
                </div>
                <div className="card divide-y overflow-hidden p-0">
                  {rows.map((t) => {
                    const meta = TYPE_META[t.type] ?? TYPE_META.DUE;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-center gap-3 p-3.5 transition hover:bg-[var(--surface-2)]",
                          t._pending && "opacity-60",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setDetail(t)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <Avatar
                            name={t.customer?.name ?? "নগদ"}
                            color={t.customer?.color}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-semibold">
                                {t.customer?.name ?? "নগদ ক্রেতা"}
                              </p>
                              <span className={cn("chip", TONES[meta.tone])}>
                                {meta.icon}
                                {meta.label}
                              </span>
                              {t._offline ? (
                                <span className={cn("chip", TONES.amber)}>
                                  অফলাইন
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-muted">
                              {t.items.length > 0
                                ? t.items.map((i) => `${i.name} (${toBnDigits(i.qty)})`).join(", ")
                                : (t.note ?? fmtTime(t.date, bn))}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                "text-sm font-bold tabular-nums",
                                t.type === "PAYMENT"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : t.type === "DUE"
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-amber-600 dark:text-amber-400",
                              )}
                            >
                              {fmtMoney(t.amount, { bn })}
                            </p>
                            <p className="text-[11px] text-muted">{fmtTime(t.date, bn)}</p>
                          </div>
                        </button>

                        <div className="relative shrink-0">
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
                                    setFormOpen(true);
                                    setMenuFor(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-2)]"
                                >
                                  <Pencil className="size-4" /> সম্পাদনা
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleting(t);
                                    setMenuFor(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                >
                                  <Trash2 className="size-4" /> মুছে ফেলুন
                                </button>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* মোডাল */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "লেনদেন সম্পাদনা" : "নতুন লেনদেন"}
        description="বাকি, জমা, ছাড় বা নগদ বিক্রি লিখুন"
        size="lg"
      >
        <TransactionForm
          editing={editing}
          onDone={() => {
            setFormOpen(false);
            setEditing(null);
            router.refresh();
          }}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="লেনদেনের বিস্তারিত"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => {
                setEditing(detail);
                setDetail(null);
                setFormOpen(true);
              }}
            >
              <Pencil className="size-4" /> সম্পাদনা
            </button>
            {detail?.customerId ? (
              <Link href={`/customers/${detail.customerId}`} className="btn btn-primary flex-1">
                খাতা দেখুন
              </Link>
            ) : null}
          </div>
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
              <Avatar name={detail.customer?.name ?? "নগদ"} color={detail.customer?.color} />
              <div>
                <p className="font-bold">{detail.customer?.name ?? "নগদ ক্রেতা"}</p>
                <p className="text-xs text-muted">{fmtDateLong(detail.date, bn)} • {fmtTime(detail.date, bn)}</p>
              </div>
              <Badge tone={TYPE_META[detail.type]?.tone ?? "slate"} className="ml-auto">
                {TYPE_META[detail.type]?.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <span className="text-muted">টাকার পরিমাণ</span>
              <span className="text-xl font-extrabold tabular-nums">
                {fmtMoney(detail.amount, { bn })}
              </span>
            </div>
            {detail.method ? (
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="text-muted">মাধ্যম</span>
                <span className="font-semibold">{paymentMethodLabel(detail.method)}</span>
              </div>
            ) : null}
            {detail.items.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-bold text-muted">পণ্যের তালিকা</p>
                <ul className="space-y-1.5">
                  {detail.items.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs"
                    >
                      <span>
                        {i.name} — {toBnDigits(i.qty)} {i.unit ?? ""} ×{" "}
                        {fmtMoney(i.unitPrice, { bn })}
                      </span>
                      <span className="font-bold tabular-nums">
                        {fmtMoney(i.qty * i.unitPrice, { bn })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {detail.note ? (
              <p className="rounded-2xl bg-[var(--surface-2)] p-3 text-xs italic text-muted">
                {detail.note}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="লেনদেনটি মুছে ফেলবেন?"
        message={`${deleting?.customer?.name ?? "নগদ ক্রেতা"} — ${fmtMoney(deleting?.amount ?? 0, { bn })}। বাকির হিসাব সমন্বয় হবে।`}
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
