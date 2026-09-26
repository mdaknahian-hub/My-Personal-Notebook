"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  MapPin,
  MessageSquare,
  MoreVertical,
  Package,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserX,
} from "lucide-react";
import { Avatar, Badge, Card, EmptyState, SectionHeader, StatCard, TONES } from "@/components/ui/bits";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/fields";
import { CustomerForm } from "@/components/forms/customer-form";
import { TransactionForm } from "@/components/forms/transaction-form";
import { ReminderSheet } from "@/components/reminder-sheet";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { dueSeverity, SEVERITY_META } from "@/lib/calc";
import {
  fmtDateLong,
  fmtDateShort,
  fmtMoney,
  fmtRelative,
  monthLabel,
  paymentMethodLabel,
  prettyPhone,
  toBnDigits,
  toIntlPhone,
  typeLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TxnLite } from "@/lib/types";

type Tab = "ledger" | "summary" | "reminders" | "info";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "হোয়াটসঅ্যাপ",
  sms: "এসএমএস",
  call: "ফোন কল",
  in_person: "সরাসরি",
};

const STATUS_LABELS: Record<string, { label: string; tone: "emerald" | "amber" | "slate" }> = {
  sent: { label: "পাঠানো হয়েছে", tone: "emerald" },
  promised: { label: "কথা দিয়েছেন", tone: "amber" },
  later: { label: "পরে দিবেন", tone: "slate" },
};

export function CustomerDetailClient({ customerId }: { customerId: string }) {
  const { customers, bn, temp, ledgerOf, reminders } = useStore();
  const router = useRouter();
  const toast = useToast();

  const customer = customers.find((c) => c.id === customerId);

  const [tab, setTab] = useState<Tab>("ledger");
  const [editOpen, setEditOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<TxnLite | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [deleteCustomerOpen, setDeleteCustomerOpen] = useState(false);
  const [deleteTxn, setDeleteTxn] = useState<TxnLite | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "due" | "payment">("all");

  const ledger = useMemo(
    () => (customer ? ledgerOf(customer.id) : []),
    [customer, ledgerOf],
  );

  const customerReminders = useMemo(
    () => reminders.filter((r) => r.customerId === customerId),
    [reminders, customerId],
  );

  const summary = useMemo(() => {
    const sale = ledger.filter((t) => t.type === "DUE" || t.type === "CASH_SALE").reduce((s, t) => s + t.amount, 0);
    const paid = ledger.filter((t) => t.type === "PAYMENT").reduce((s, t) => s + t.amount, 0);
    const discount = ledger.filter((t) => t.type === "DISCOUNT").reduce((s, t) => s + t.amount, 0);
    const monthly = new Map<string, { label: Date; sale: number; paid: number }>();
    for (const t of ledger) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = monthly.get(key) ?? {
        label: new Date(d.getFullYear(), d.getMonth(), 1),
        sale: 0,
        paid: 0,
      };
      if (t.type === "DUE" || t.type === "CASH_SALE") entry.sale += t.amount;
      if (t.type === "PAYMENT") entry.paid += t.amount;
      monthly.set(key, entry);
    }
    const products = new Map<string, { name: string; qty: number; amount: number }>();
    for (const t of ledger) {
      for (const item of t.items) {
        const entry = products.get(item.name) ?? { name: item.name, qty: 0, amount: 0 };
        entry.qty += item.qty;
        entry.amount += item.qty * item.unitPrice;
        products.set(item.name, entry);
      }
    }
    return {
      sale,
      paid,
      discount,
      txnCount: ledger.length,
      monthly: [...monthly.values()].sort((a, b) => b.label.getTime() - a.label.getTime()).slice(0, 6),
      favourites: [...products.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
      avgSale: ledger.length ? sale / Math.max(1, ledger.filter((t) => t.type === "DUE").length) : 0,
    };
  }, [ledger]);

  if (!customer) {
    return (
      <EmptyState
        icon={<UserX className="size-6" />}
        title="কাস্টমার খুঁজে পাওয়া যায়নি"
        description="হয়তো মুছে ফেলা হয়েছে অথবা লিংকটি পুরনো।"
        action={
          <Link href="/customers" className="btn btn-primary">
            <ArrowLeft className="size-4" /> কাস্টমার তালিকায় ফিরুন
          </Link>
        }
      />
    );
  }

  const severity = SEVERITY_META[dueSeverity(customer.due, customer.creditLimit)];
  const due = customer.due;

  const removeCustomer = async () => {
    setBusy(true);
    const result = await temp.removeCustomer(customer.id);
    setBusy(false);
    setDeleteCustomerOpen(false);
    if (result.ok) {
      toast.success("কাস্টমার মুছে ফেলা হয়েছে", customer.name);
      router.push("/customers");
    }
  };

  const removeTxn = async () => {
    if (!deleteTxn) return;
    setBusy(true);
    const result = await temp.removeTransaction(deleteTxn.id);
    setBusy(false);
    setDeleteTxn(null);
    if (result.ok) toast.success("লেনদেন মুছে ফেলা হয়েছে");
  };

  const filtered = ledger
    .filter((t) => {
      if (filter === "due") return t.type === "DUE";
      if (filter === "payment") return t.type === "PAYMENT" || t.type === "DISCOUNT";
      return true;
    })
    .reverse();

  const quickPay = async (amount: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await temp.addTransaction({
      customerId: customer.id,
      type: "PAYMENT",
      amount,
      date: today,
      method: "নগদ",
      note: "সম্পূর্ণ হিসাব পরিশোধ",
      items: [],
    });
    setQuickPayOpen(false);
    if (result.ok) toast.success("হিসাব পরিষ্কার!", `${fmtMoney(amount, { bn })} জমা নেওয়া হয়েছে`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-[var(--text)]"
      >
        <ArrowLeft className="size-4" /> কাস্টমার তালিকা
      </Link>

      {/* ------------------------------------------------------ হেডার */}
      <div className="card overflow-hidden">
        <div
          className={cn(
            "flex items-start gap-3 p-4 sm:gap-4 sm:p-5",
            severity.bg,
          )}
        >
          <Avatar name={customer.name} color={customer.color} size="xl" className="shadow-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">{customer.name}</h1>
              <Badge tone="slate">{customer.tag}</Badge>
              {!customer.isActive ? <Badge tone="slate">বন্ধ</Badge> : null}
            </div>
            <div className="mt-1.5 space-y-0.5 text-xs text-muted">
              {customer.phone ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="size-3.5" /> {prettyPhone(customer.phone, bn)}
                </p>
              ) : null}
              {customer.address ? (
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {customer.address}
                </p>
              ) : null}
              <p className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" /> খাতা খোলা হয়েছে {fmtDateShort(customer.createdAt, bn)}
              </p>
            </div>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-xl border bg-[var(--surface)] p-2 text-muted"
              aria-label="অপশন"
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setEditOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-2)]"
                  >
                    <Pencil className="size-4" /> তথ্য সম্পাদনা
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatementOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--surface-2)]"
                  >
                    <Printer className="size-4" /> হিসাব বিবরণী
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteCustomerOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-4" /> কাস্টমার মুছুন
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* বাকির বড় সংখ্যা + অ্যাকশন */}
        <div className="border-t p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">বর্তমান বাকি</p>
              <p className={cn("text-3xl font-extrabold tabular-nums", severity.text)}>
                {fmtMoney(due, { bn })}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className={cn("chip", severity.bg, severity.text, severity.ring, "ring-1")}>
                  <span className={cn("size-1.5 rounded-full", severity.dot)} />
                  {severity.label}
                </span>
                {customer.creditLimit ? (
                  <span className="text-xs text-muted">
                    সীমা {fmtMoney(customer.creditLimit, { bn })}
                    {due > customer.creditLimit ? " — সীমা ছাড়িয়ে গেছে!" : ""}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setEditTxn(null);
                  setTxOpen(true);
                }}
                className="btn btn-primary"
              >
                <Plus className="size-4" /> বাকি লিখুন
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditTxn(null);
                  setTxOpen(true);
                }}
                className="btn btn-ghost"
              >
                <HandCoins className="size-4" /> জমা নিন
              </button>
              <button
                type="button"
                onClick={() => setReminderOpen(true)}
                disabled={due <= 0}
                className="btn btn-ghost"
              >
                <BellRing className="size-4" /> তাগাদা
              </button>
              <button
                type="button"
                onClick={() => setQuickPayOpen(true)}
                disabled={due <= 0}
                className="btn btn-ghost"
              >
                <CheckCircle2 className="size-4" /> পরিশোধ
              </button>
            </div>
          </div>

          {customer.note ? (
            <p className="mt-4 rounded-2xl bg-[var(--surface-2)] p-3 text-sm leading-relaxed">
              📝 {customer.note}
            </p>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------ স্ট্যাট */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="মোট কেনা"
          value={fmtMoney(summary.sale, { bn })}
          hint={`${toBnDigits(summary.txnCount)} টি লেনদেন`}
          icon={<TrendingUp className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="মোট জমা"
          value={fmtMoney(summary.paid, { bn })}
          icon={<HandCoins className="size-4" />}
          tone="emerald"
        />
        <StatCard
          label="ছাড় দেওয়া"
          value={fmtMoney(summary.discount, { bn })}
          icon={<TrendingDown className="size-4" />}
          tone="amber"
        />
        <StatCard
          label="আগের বাকি"
          value={fmtMoney(customer.openingBalance, { bn })}
          hint="খাতা খোলার সময়ের"
          icon={<Receipt className="size-4" />}
          tone="slate"
        />
      </div>

      {/* ------------------------------------------------------ ট্যাব */}
      <Segmented<Tab>
        options={[
          { value: "ledger", label: "খতিয়ান" },
          { value: "summary", label: "সারাংশ" },
          { value: "reminders", label: `তাগাদা (${toBnDigits(customerReminders.length)})` },
          { value: "info", label: "তথ্য" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {/* ------------------------------------------------------ খতিয়ান */}
      {tab === "ledger" ? (
        <Card>
          <SectionHeader
            title="চলমান খতিয়ান"
            subtitle="প্রতিটি লেনদেনের পর বাকির পরিমাণ"
            icon={<Receipt className="size-4" />}
            action={
              <Segmented<"all" | "due" | "payment">
                size="sm"
                className="w-auto"
                options={[
                  { value: "all", label: "সব" },
                  { value: "due", label: "বাকি" },
                  { value: "payment", label: "জমা" },
                ]}
                value={filter}
                onChange={setFilter}
              />
            }
          />

          {filtered.length === 0 ? (
            <EmptyState
              title="কোনো লেনদেন নেই"
              description="বাকি বা জমা লিখলে খতিয়ানে দেখা যাবে।"
              className="border-0"
              action={
                <button type="button" className="btn btn-primary" onClick={() => setTxOpen(true)}>
                  <Plus className="size-4" /> প্রথম লেনদেন লিখুন
                </button>
              }
            />
          ) : (
            <div className="divide-y">
              {filtered.map((t) => {
                const tone =
                  t.type === "PAYMENT"
                    ? TONES.emerald
                    : t.type === "DISCOUNT"
                      ? TONES.amber
                      : TONES.rose;
                return (
                  <div key={t.id} className={cn("flex items-start gap-3 py-3", t._pending && "opacity-60")}>
                    <div className="w-16 shrink-0 pt-0.5 text-xs font-semibold text-muted">
                      {fmtDateShort(t.date, bn).split(",")[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("chip", tone)}>{typeLabel(t.type)}</span>
                        {t.method ? (
                          <span className="text-[11px] text-muted">{paymentMethodLabel(t.method)}</span>
                        ) : null}
                      </div>
                      {t.items.length > 0 ? (
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          {t.items
                            .map((i) => `${i.name} — ${toBnDigits(i.qty)} ${i.unit ?? ""} × ${fmtMoney(i.unitPrice, { bn })}`)
                            .join(", ")}
                        </p>
                      ) : null}
                      {t.note ? <p className="mt-1 text-xs italic text-muted">{t.note}</p> : null}
                      <p className="mt-0.5 text-[11px] text-muted">{fmtRelative(t.date, bn)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-sm font-bold tabular-nums", tone === TONES.rose ? "text-rose-600 dark:text-rose-400" : tone === TONES.emerald ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                        {t.delta > 0 ? "+" : "−"}
                        {fmtMoney(Math.abs(t.delta), { bn })}
                      </p>
                      <p className="text-[11px] font-semibold text-muted tabular-nums">
                        ব্যালেন্স {fmtMoney(t.balance, { bn })}
                      </p>
                      <div className="mt-1 flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditTxn(t);
                            setTxOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-[var(--surface-2)]"
                          aria-label="সম্পাদনা"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTxn(t)}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          aria-label="মুছুন"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}

      {/* ------------------------------------------------------ সারাংশ */}
      {tab === "summary" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader title="মাস অনুযায়ী হিসাব" icon={<CalendarClock className="size-4" />} />
            {summary.monthly.length === 0 ? (
              <EmptyState title="কোনো তথ্য নেই" className="border-0" />
            ) : (
              <div className="space-y-3">
                {summary.monthly.map((m) => {
                  const max = Math.max(m.sale, m.paid, 1);
                  return (
                    <div key={m.label.toISOString()}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold">{monthLabel(m.label, bn)}</span>
                        <span className="text-muted">
                          কেনা {fmtMoney(m.sale, { bn })} • জমা {fmtMoney(m.paid, { bn })}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400"
                            style={{ width: `${Math.max(3, (m.sale / max) * 100)}%` }}
                          />
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                            style={{ width: `${Math.max(3, (m.paid / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader
              title="প্রায়ই কেনা পণ্য"
              subtitle="এই কাস্টমার কোন মাল বেশি নেন"
              icon={<Package className="size-4" />}
            />
            {summary.favourites.length === 0 ? (
              <EmptyState title="পণ্যের তথ্য নেই" className="border-0" />
            ) : (
              <ul className="space-y-2">
                {summary.favourites.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3 rounded-2xl border p-3">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-[var(--surface-2)] text-xs font-bold">
                      {toBnDigits(i + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">
                        মোট {toBnDigits(p.qty)} একক
                      </p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">
                      {fmtMoney(p.amount, { bn })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {/* ------------------------------------------------------ তাগাদা */}
      {tab === "reminders" ? (
        <Card>
          <SectionHeader
            title="তাগাদার ইতিহাস"
            subtitle="কবে কীভাবে মনে করিয়ে দেওয়া হয়েছে"
            icon={<BellRing className="size-4" />}
            action={
              <button
                type="button"
                onClick={() => setReminderOpen(true)}
                className="btn btn-primary px-3 py-2 text-xs"
              >
                <BellRing className="size-3.5" /> নতুন তাগাদা
              </button>
            }
          />
          {customerReminders.length === 0 ? (
            <EmptyState
              icon={<BellRing className="size-6" />}
              title="এখনো তাগাদা পাঠানো হয়নি"
              description="হোয়াটসঅ্যাপে এক ট্যাপে বাকির কথা মনে করিয়ে দিন।"
              className="border-0"
              action={
                <button type="button" className="btn btn-primary" onClick={() => setReminderOpen(true)}>
                  তাগাদা পাঠান
                </button>
              }
            />
          ) : (
            <ol className="relative space-y-3 border-l pl-4">
              {customerReminders.map((r) => {
                const status = STATUS_LABELS[r.status] ?? STATUS_LABELS.sent;
                return (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand-500 ring-4 ring-[var(--surface)]" />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {CHANNEL_LABELS[r.channel] ?? r.channel}
                      </p>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span className="text-xs text-muted">{fmtRelative(r.createdAt, bn)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      বাকির পরিমাণ ছিল {fmtMoney(r.amount, { bn })}
                    </p>
                    {r.message ? (
                      <p className="mt-1 rounded-xl bg-[var(--surface-2)] p-2 text-xs leading-relaxed">
                        {r.message}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      ) : null}

      {/* ------------------------------------------------------ তথ্য */}
      {tab === "info" ? (
        <Card>
          <SectionHeader title="কাস্টমারের তথ্য" icon={<MapPin className="size-4" />} />
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "নাম", value: customer.name },
              { label: "ট্যাগ", value: customer.tag },
              { label: "মোবাইল", value: prettyPhone(customer.phone, bn) },
              { label: "ঠিকানা", value: customer.address ?? "—" },
              { label: "আগের বাকি", value: fmtMoney(customer.openingBalance, { bn }) },
              { label: "বাকির সীমা", value: customer.creditLimit ? fmtMoney(customer.creditLimit, { bn }) : "নির্ধারিত নয়" },
              { label: "সর্বশেষ লেনদেন", value: customer.lastActivityAt ? fmtDateLong(customer.lastActivityAt, bn) : "—" },
              { label: "নোট", value: customer.note ?? "—" },
            ].map((row) => (
              <div key={row.label} className="rounded-2xl bg-[var(--surface-2)] p-3">
                <dt className="text-[11px] font-semibold text-muted">{row.label}</dt>
                <dd className="mt-0.5 text-sm font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> তথ্য সম্পাদনা করুন
            </button>
            {customer.phone ? (
              <>
                <a
                  href={`tel:${toIntlPhone(customer.phone)}`}
                  className="btn btn-ghost"
                >
                  <Phone className="size-4" /> কল করুন
                </a>
                <a
                  href={`https://wa.me/${toIntlPhone(customer.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                >
                  <MessageSquare className="size-4" /> হোয়াটসঅ্যাপ
                </a>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* ------------------------------------------------------ মোডালসমূহ */}
      <Modal
        open={txOpen}
        onClose={() => {
          setTxOpen(false);
          setEditTxn(null);
        }}
        title={editTxn ? "লেনদেন সম্পাদনা" : `${customer.name} — নতুন হিসাব`}
        description="বাকি, জমা, ছাড় বা নগদ বিক্রি লিখুন"
        size="lg"
      >
        <TransactionForm
          editing={editTxn}
          defaultCustomerId={customer.id}
          onDone={() => {
            setTxOpen(false);
            setEditTxn(null);
            router.refresh();
          }}
          onCancel={() => {
            setTxOpen(false);
            setEditTxn(null);
          }}
        />
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="কাস্টমারের তথ্য সম্পাদনা" size="md">
        <CustomerForm
          editing={customer}
          onDone={() => setEditOpen(false)}
          onCancel={() => setEditOpen(false)}
          onDelete={() => {
            setEditOpen(false);
            setDeleteCustomerOpen(true);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTxn}
        title="লেনদেনটি মুছে ফেলবেন?"
        message={`${typeLabel(deleteTxn?.type ?? "")} — ${fmtMoney(deleteTxn?.amount ?? 0, { bn })}। বাকির হিসাবও সমন্বয় হবে।`}
        loading={busy}
        onConfirm={removeTxn}
        onCancel={() => setDeleteTxn(null)}
      />

      <ConfirmDialog
        open={deleteCustomerOpen}
        title={`${customer.name} কে মুছে ফেলবেন?`}
        message="এই কাস্টমারের সব লেনদেনের হিসাব মুছে যাবে। এটি ফিরিয়ে আনা যাবে না।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        loading={busy}
        onConfirm={removeCustomer}
        onCancel={() => setDeleteCustomerOpen(false)}
      />

      <ConfirmDialog
        open={quickPayOpen}
        title="সম্পূর্ণ হিসাব পরিশোধ"
        message={`${fmtMoney(due, { bn })} জমা হিসেবে লিখে খাতা পরিষ্কার করে দিবেন?`}
        confirmLabel="হ্যাঁ, পরিশোধ হয়েছে"
        tone="primary"
        loading={busy}
        onConfirm={() => quickPay(due)}
        onCancel={() => setQuickPayOpen(false)}
      />

      <ReminderSheet
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        customerId={customer.id}
      />

      <StatementModal
        open={statementOpen}
        onClose={() => setStatementOpen(false)}
        customerName={customer.name}
        customerPhone={customer.phone}
        address={customer.address}
        rows={ledger}
        due={due}
        opening={customer.openingBalance}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ বিবরণী */

function StatementModal({
  open,
  onClose,
  customerName,
  customerPhone,
  address,
  rows,
  due,
  opening,
}: {
  open: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string | null;
  address: string | null;
  rows: Array<TxnLite & { delta: number; balance: number }>;
  due: number;
  opening: number;
}) {
  const { user, bn } = useStore();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="হিসাব বিবরণী"
      description="প্রিন্ট করুন বা স্ক্রিনশট নিয়ে কাস্টমারকে দেখান"
      size="lg"
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
            বন্ধ করুন
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={() => window.print()}>
            <Printer className="size-4" /> প্রিন্ট / PDF
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-2xl border p-4">
          <p className="text-center text-lg font-extrabold">{user.shopName}</p>
          {user.shopAddress ? (
            <p className="text-center text-xs text-muted">{user.shopAddress}</p>
          ) : null}
          {user.shopPhone ? (
            <p className="text-center text-xs text-muted">মোবাইল: {prettyPhone(user.shopPhone, bn)}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-between gap-2 rounded-2xl bg-[var(--surface-2)] p-3 text-xs">
          <div>
            <p className="font-bold text-sm">{customerName}</p>
            {customerPhone ? <p>{prettyPhone(customerPhone, bn)}</p> : null}
            {address ? <p>{address}</p> : null}
          </div>
          <div className="text-right">
            <p>তারিখ: {fmtDateShort(new Date(), bn)}</p>
            <p>আগের বাকি: {fmtMoney(opening, { bn })}</p>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted">
              <th className="py-2">তারিখ</th>
              <th className="py-2">বিবরণ</th>
              <th className="py-2 text-right">টাকা</th>
              <th className="py-2 text-right">বাকি</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="py-2 whitespace-nowrap">{fmtDateShort(row.date, bn)}</td>
                <td className="py-2">
                  {typeLabel(row.type)}
                  {row.items.length > 0
                    ? ` — ${row.items.map((i) => i.name).join(", ")}`
                    : row.note
                      ? ` — ${row.note}`
                      : ""}
                </td>
                <td
                  className={cn(
                    "py-2 text-right font-semibold tabular-nums",
                    row.delta > 0 ? "text-rose-600" : "text-emerald-600",
                  )}
                >
                  {row.delta > 0 ? "+" : "−"}
                  {fmtMoney(Math.abs(row.delta), { bn })}
                </td>
                <td className="py-2 text-right tabular-nums">{fmtMoney(row.balance, { bn })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between rounded-2xl bg-rose-50 p-3 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          <span className="font-bold">সর্বমোট বাকি</span>
          <span className="text-xl font-extrabold tabular-nums">{fmtMoney(due, { bn })}</span>
        </div>
        <p className="text-center text-[11px] text-muted">
          ধন্যবাদ — আপনার ব্যবসার জন্য শুভকামনা। হিসাবের কোনো প্রশ্ন থাকলে যোগাযোগ করুন।
        </p>
      </div>
    </Modal>
  );
}
