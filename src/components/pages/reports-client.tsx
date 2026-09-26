"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, PiggyBank, Printer, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, SectionHeader, StatCard, TONES } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/fields";
import { Donut, MonthlyBars } from "@/components/charts";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtDateShort, fmtMoney, fmtMoneyCompact, monthLabel, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

type Range = "3" | "6" | "12";

export function ReportsClient() {
  const { transactions, expenses, suppliers, customers, products, bn, user } = useStore();
  const toast = useToast();
  const [range, setRange] = useState<Range>("6");

  const months = Number(range);

  const data = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const monthly = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d,
        sale: 0,
        collection: 0,
        expense: 0,
        purchase: 0,
      };
    });
    const index = new Map(monthly.map((m) => [m.key, m]));
    const keyOf = (d: Date | string) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${date.getMonth()}`;
    };

    const inRange = transactions.filter((t) => new Date(t.date) >= start);
    for (const t of inRange) {
      const m = index.get(keyOf(t.date));
      if (!m) continue;
      if (t.type === "DUE" || t.type === "CASH_SALE") m.sale += t.amount;
      if (t.type === "PAYMENT") m.collection += t.amount;
    }
    for (const e of expenses) {
      if (new Date(e.date) < start) continue;
      const m = index.get(keyOf(e.date));
      if (m) m.expense += e.amount;
    }
    for (const s of suppliers) {
      if (!s.lastActivity || new Date(s.lastActivity) < start) continue;
      const m = index.get(keyOf(s.lastActivity));
      if (m) m.purchase += s.totalPurchase ?? 0;
    }

    const marginProducts = products.filter((p) => p.buyPrice > 0 && p.sellPrice > 0);
    const margin =
      marginProducts.length > 0
        ? marginProducts.reduce(
            (s, p) => s + ((p.sellPrice - p.buyPrice) / p.sellPrice) * 100,
            0,
          ) / marginProducts.length
        : 12;

    const totalSale = monthly.reduce((s, m) => s + m.sale, 0);
    const totalCollection = monthly.reduce((s, m) => s + m.collection, 0);
    const totalExpense = monthly.reduce((s, m) => s + m.expense, 0);
    const profit = (totalSale * margin) / 100 - totalExpense;

    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      if (new Date(e.date) < start) continue;
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    }

    const byCustomer = new Map<string, { sale: number; paid: number }>();
    for (const t of inRange) {
      if (!t.customerId) continue;
      const entry = byCustomer.get(t.customerId) ?? { sale: 0, paid: 0 };
      if (t.type === "DUE" || t.type === "CASH_SALE") entry.sale += t.amount;
      if (t.type === "PAYMENT") entry.paid += t.amount;
      byCustomer.set(t.customerId, entry);
    }

    const byProduct = new Map<string, { qty: number; amount: number }>();
    for (const t of inRange) {
      for (const item of t.items) {
        const entry = byProduct.get(item.name) ?? { qty: 0, amount: 0 };
        entry.qty += item.qty;
        entry.amount += item.qty * item.unitPrice;
        byProduct.set(item.name, entry);
      }
    }

    const dailyMap = new Map<string, number>();
    for (const t of inRange) {
      if (t.type !== "DUE" && t.type !== "CASH_SALE") continue;
      const key = new Date(t.date).toDateString();
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + t.amount);
    }
    const bestDay = [...dailyMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const weekdayTotals = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
    for (const [day, amount] of dailyMap.entries()) {
      const idx = new Date(day).getDay();
      weekdayTotals[idx].total += amount;
      weekdayTotals[idx].count += 1;
    }
    const bestWeekday = weekdayTotals
      .map((v, i) => ({
        index: i,
        avg: v.count ? v.total / v.count : 0,
      }))
      .sort((a, b) => b.avg - a.avg)[0];

    return {
      monthly,
      totals: {
        sale: totalSale,
        collection: totalCollection,
        expense: totalExpense,
        profit,
        margin,
        purchase: monthly.reduce((s, m) => s + m.purchase, 0),
      },
      breakdown: [...byCategory.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      topCustomers: [...byCustomer.entries()]
        .map(([id, v]) => {
          const c = customers.find((x) => x.id === id);
          return { id, name: c?.name ?? "—", color: c?.color ?? "emerald", ...v };
        })
        .sort((a, b) => b.sale - a.sale)
        .slice(0, 8),
      topProducts: [...byProduct.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8),
      bestDay: bestDay ? { day: new Date(bestDay[0]), amount: bestDay[1] } : null,
      bestWeekday,
      bestWeekdayTotals: weekdayTotals,
      txnCount: inRange.length,
    };
  }, [transactions, expenses, suppliers, customers, products, months]);

  const WEEKDAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

  const exportReport = () => {
    const lines: string[] = [];
    lines.push(`${user.shopName} — হিসাব রিপোর্ট`);
    lines.push(`তারিখ: ${new Date().toLocaleDateString("en-GB")}`);
    lines.push("");
    lines.push("মাস,বিক্রি,আদায়,খরচ,লাভ");
    for (const m of data.monthly) {
      lines.push(
        `${m.label.toISOString().slice(0, 7)},${m.sale.toFixed(0)},${m.collection.toFixed(0)},${m.expense.toFixed(0)},${((m.sale * data.totals.margin) / 100 - m.expense).toFixed(0)}`,
      );
    }
    lines.push("");
    lines.push("সেরা কাস্টমার,কেনা,জমা");
    for (const c of data.topCustomers) {
      lines.push(`${c.name},${c.sale.toFixed(0)},${c.paid.toFixed(0)}`);
    }
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("রিপোর্ট ডাউনলোড হয়েছে");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Segmented<Range>
          className="w-auto"
          size="sm"
          options={[
            { value: "3", label: "৩ মাস" },
            { value: "6", label: "৬ মাস" },
            { value: "12", label: "১ বছর" },
          ]}
          value={range}
          onChange={setRange}
        />
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={exportReport}>
            <Download className="size-4" /> CSV
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            <Printer className="size-4" /> প্রিন্ট
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="মোট বিক্রি"
          value={fmtMoney(data.totals.sale, { bn })}
          hint={`${toBnDigits(data.txnCount)} টি লেনদেন`}
          icon={<TrendingUp className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="মোট আদায়"
          value={fmtMoney(data.totals.collection, { bn })}
          hint={
            data.totals.sale > 0
              ? `${toBnDigits(((data.totals.collection / data.totals.sale) * 100).toFixed(0))}% আদায়`
              : undefined
          }
          icon={<Wallet className="size-4" />}
          tone="emerald"
        />
        <StatCard
          label="মোট খরচ"
          value={fmtMoney(data.totals.expense, { bn })}
          hint={`মাল কেনা ${fmtMoneyCompact(data.totals.purchase, bn)}`}
          icon={<TrendingDown className="size-4" />}
          tone="amber"
        />
        <StatCard
          label="আনুমানিক লাভ"
          value={fmtMoney(data.totals.profit, { bn })}
          hint={`গড় মার্জিন ${toBnDigits(data.totals.margin.toFixed(1))}%`}
          icon={<PiggyBank className="size-4" />}
          tone={data.totals.profit >= 0 ? "emerald" : "rose"}
        />
      </div>

      <Card>
        <SectionHeader
          title="মাস অনুযায়ী বিক্রি, আদায় ও খরচ"
          subtitle={`শেষ ${toBnDigits(months)} মাসের তুলনা`}
          icon={<BarChart3 className="size-4" />}
        />
        <div className="space-y-4">
          {data.monthly.map((m) => (
            <div key={m.key}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="font-bold">{monthLabel(m.label, bn)}</span>
                <span className="text-muted">
                  বিক্রি <b className="text-[var(--text)]">{fmtMoney(m.sale, { bn })}</b> • জমা{" "}
                  <b className="text-emerald-600 dark:text-emerald-400">
                    {fmtMoney(m.collection, { bn })}
                  </b>{" "}
                  • খরচ{" "}
                  <b className="text-amber-600 dark:text-amber-400">
                    {fmtMoney(m.expense, { bn })}
                  </b>
                </span>
              </div>
              <MonthlyBars rows={[{ label: "", sale: m.sale, collection: m.collection, expense: m.expense }]} bn={bn} />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="খরচের খাত"
            subtitle="কোন খাতে বেশি টাকা যাচ্ছে"
            icon={<Wallet className="size-4" />}
          />
          {data.breakdown.length === 0 ? (
            <EmptyState title="এই সময়ে কোনো খরচ নেই" className="border-0" />
          ) : (
            <Donut items={data.breakdown} bn={bn} size={156} />
          )}
        </Card>

        <Card>
          <SectionHeader
            title="সেরা কাস্টমার"
            subtitle="যারা সবচেয়ে বেশি কিনেছেন"
            icon={<TrendingUp className="size-4" />}
          />
          {data.topCustomers.length === 0 ? (
            <EmptyState title="এই সময়ে কোনো বিক্রি নেই" className="border-0" />
          ) : (
            <ul className="space-y-2">
              {data.topCustomers.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl border p-2.5">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[11px] font-bold">
                    {toBnDigits(i + 1)}
                  </span>
                  <Avatar name={c.name} color={c.color} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
                  <span className="text-xs text-muted tabular-nums">
                    জমা {fmtMoney(c.paid, { bn })}
                  </span>
                  <span className="text-sm font-bold tabular-nums">{fmtMoney(c.sale, { bn })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader title="সবচেয়ে বেশি বিক্রি হওয়া পণ্য" icon={<TrendingUp className="size-4" />} />
          {data.topProducts.length === 0 ? (
            <EmptyState title="পণ্যের তথ্য নেই" className="border-0" />
          ) : (
            <ul className="space-y-2">
              {data.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[11px] font-bold">
                    {toBnDigits(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <Badge tone="slate">{toBnDigits(p.qty)} একক</Badge>
                  <span className="text-sm font-bold tabular-nums">{fmtMoney(p.amount, { bn })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader title="ব্যবসার ধরন বিশ্লেষণ" icon={<BarChart3 className="size-4" />} />
          <div className="space-y-3 text-sm">
            {data.bestDay ? (
              <div className="rounded-2xl bg-[var(--surface-2)] p-3">
                <p className="text-xs font-semibold text-muted">সবচেয়ে ভালো দিন</p>
                <p className="font-bold">{fmtDateShort(data.bestDay.day, bn)}</p>
                <p className="text-xs text-muted">
                  বিক্রি {fmtMoney(data.bestDay.amount, { bn })}
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl bg-[var(--surface-2)] p-3">
              <p className="text-xs font-semibold text-muted">সবচেয়ে ভালো দিন (সাপ্তাহিক)</p>
              <p className="font-bold">
                {data.bestWeekday ? WEEKDAYS[data.bestWeekday.index] : "—"}
              </p>
              <p className="text-xs text-muted">
                গড় বিক্রি {fmtMoney(data.bestWeekday?.avg ?? 0, { bn })}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.bestWeekdayTotals.map((v, i) => {
                const max = Math.max(...data.bestWeekdayTotals.map((x) => x.total), 1);
                return (
                  <div key={i} className="flex-1">
                    <div className="flex h-20 items-end justify-center rounded-lg bg-[var(--surface-2)] p-1">
                      <div
                        className={cn(
                          "w-full rounded-md transition-all",
                          i === data.bestWeekday?.index ? "bg-brand-500" : "bg-slate-300 dark:bg-slate-600",
                        )}
                        style={{ height: `${Math.max(6, (v.total / max) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-[10px] text-muted">
                      {["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"][i]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <p className="pb-2 text-center text-[11px] text-muted">
        লাভের হিসাব গড় মার্জিন {toBnDigits(data.totals.margin.toFixed(1))}% ধরে করা হয়েছে (পণ্যের
        ক্রয়-বিক্রয় দাম থেকে)।
      </p>
    </div>
  );
}
