"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  Pencil,
  Wallet,
} from "lucide-react";
import { Avatar, Badge, Card, EmptyState, SectionHeader, TONES } from "@/components/ui/bits";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SearchInput, Segmented, Select } from "@/components/ui/fields";
import { ExpenseForm } from "@/components/forms/expense-form";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtDateLong, fmtMoney, monthLabel, paymentMethodLabel, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type ExpenseLite } from "@/lib/types";
import { Donut } from "@/components/charts";

type Range = "today" | "month" | "30d" | "all";

export function ExpensesClient() {
  const { expenses, bn, temp, user } = useStore();
  const router = useRouter();
  const toast = useToast();

  const [range, setRange] = useState<Range>("month");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseLite | null>(null);
  const [deleting, setDeleting] = useState<ExpenseLite | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    if (range === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (range === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (range === "30d") start = new Date(now.getTime() - 30 * 86400000);

    const q = query.trim().toLowerCase();
    return expenses.filter((e) => {
      if (start && new Date(e.date).getTime() < start.getTime()) return false;
      if (category && e.category !== category) return false;
      if (q) {
        const haystack = `${e.category} ${e.note ?? ""} ${e.paidTo ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, range, category, query]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const today = expenses
      .filter((e) => new Date(e.date).toDateString() === new Date().toDateString())
      .reduce((s, e) => s + e.amount, 0);
    const month = expenses
      .filter((e) => {
        const d = new Date(e.date);
        const n = new Date();
        return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
      })
      .reduce((s, e) => s + e.amount, 0);
    const byCategory = new Map<string, number>();
    for (const e of filtered) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    }
    return {
      total,
      today,
      month,
      avg: filtered.length ? total / filtered.length : 0,
      breakdown: [...byCategory.entries()]
        .map(([c, amount]) => ({ category: c, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }, [filtered, expenses]);

  const grouped = useMemo(() => {
    const map = new Map<string, ExpenseLite[]>();
    for (const e of filtered) {
      const key = new Date(e.date).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const result = await temp.removeExpense(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) {
      toast.success("খরচ মুছে ফেলা হয়েছে");
      router.refresh();
    }
  };

  const categories = useMemo(
    () => [...new Set([...EXPENSE_CATEGORIES, ...expenses.map((e) => e.category)])],
    [expenses],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* স্ট্যাট */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">আজকের খরচ</p>
            <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES.amber)}>
              <CalendarDays className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold tabular-nums">{fmtMoney(stats.today, { bn })}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">এই মাসে</p>
            <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES.rose)}>
              <TrendingDown className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold tabular-nums">{fmtMoney(stats.month, { bn })}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">নির্বাচিত সময়ে</p>
            <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES.violet)}>
              <Wallet className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold tabular-nums">{fmtMoney(stats.total, { bn })}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">গড় খরচ</p>
            <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES.slate)}>
              <Receipt className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold tabular-nums">{fmtMoney(stats.avg, { bn })}</p>
        </div>
      </div>

      {/* ফিল্টার */}
      <Card className="space-y-3">
        <div className="flex gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="খরচের ধরন, নোট বা কাকে দেওয়া হলো..."
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
            <span className="hidden sm:inline">খরচ যোগ</span>
          </button>
        </div>
        <Segmented<Range>
          size="sm"
          options={[
            { value: "today", label: "আজ" },
            { value: "month", label: "এই মাস" },
            { value: "30d", label: "৩০ দিন" },
            { value: "all", label: "সব" },
          ]}
          value={range}
          onChange={setRange}
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="py-2 text-sm">
          <option value="">সব ধরনের খরচ</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Card>

      {/* চার্ট + তালিকা */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <SectionHeader
            title="খরচের ধরন"
            subtitle="কোথায় বেশি খরচ হচ্ছে"
            icon={<Wallet className="size-4" />}
          />
          <Donut items={stats.breakdown} bn={bn} size={156} />
        </Card>

        <div className="space-y-3">
          {grouped.length === 0 ? (
            <EmptyState
              icon={<Receipt className="size-6" />}
              title="কোনো খরচ নেই"
              description="দোকানের ভাড়া, বিদ্যুৎ বিল বা পরিবহন খরচ লিখে হিসাব রাখুন।"
              action={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="size-4" /> খরচ যোগ করুন
                </button>
              }
            />
          ) : (
            grouped.map(([day, rows]) => (
              <div key={day}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-bold">{fmtDateLong(day, bn)}</p>
                  <p className="text-[11px] font-semibold text-muted">
                    {fmtMoney(
                      rows.reduce((s, r) => s + r.amount, 0),
                      { bn },
                    )}
                  </p>
                </div>
                <div className="card divide-y overflow-hidden p-0">
                  {rows.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        "flex items-center gap-3 p-3.5",
                        e._pending && "opacity-60",
                      )}
                    >
                      <Avatar name={e.category} size="sm" color="amber" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{e.category}</p>
                          <Badge tone="slate">{paymentMethodLabel(e.method)}</Badge>
                        </div>
                        <p className="truncate text-xs text-muted">
                          {e.note ?? "—"}
                          {e.paidTo ? ` • ${e.paidTo}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums">
                        {fmtMoney(e.amount, { bn })}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(e);
                            setFormOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-[var(--surface-2)]"
                          aria-label="সম্পাদনা"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(e)}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          aria-label="মুছুন"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        এই মাসে মোট খরচ {fmtMoney(stats.month, { bn })} — বিক্রির তুলনায় খরচ কমানো গেলে লাভ
        বাড়বে। {monthLabel(new Date(), bn)} মাসের হিসাব।
      </p>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "খরচ সম্পাদনা" : "নতুন খরচ"}
        description="দোকানের যেকোনো খরচ লিখে রাখুন"
        size="md"
      >
        <ExpenseForm
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

      <ConfirmDialog
        open={!!deleting}
        title="খরচটি মুছে ফেলবেন?"
        message={`${deleting?.category} — ${fmtMoney(deleting?.amount ?? 0, { bn })}`}
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
