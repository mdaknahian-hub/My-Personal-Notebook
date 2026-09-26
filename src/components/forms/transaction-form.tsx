"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  HandCoins,
  Minus,
  Package,
  Plus,
  Percent,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar, Badge } from "@/components/ui/bits";
import { Combobox, Field, Input, MoneyInput, Segmented, Textarea } from "@/components/ui/fields";
import { useStore } from "@/components/providers/store";
import { PAYMENT_METHODS, type TxnLite } from "@/lib/types";
import { cn, toDateInput } from "@/lib/utils";
import { fmtMoney, paymentMethodLabel } from "@/lib/format";
import { round2 } from "@/lib/calc";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";

type ItemRow = {
  key: string;
  productId: string | null;
  name: string;
  unit: string | null;
  qty: number;
  unitPrice: number;
};

const itemKey = () => `row_${Math.random().toString(36).slice(2, 8)}`;

const TYPES = [
  { value: "DUE", label: "বাকি", icon: <Package className="size-4" /> },
  { value: "PAYMENT", label: "জমা", icon: <HandCoins className="size-4" /> },
  { value: "DISCOUNT", label: "ছাড়", icon: <Percent className="size-4" /> },
  { value: "CASH_SALE", label: "নগদ বিক্রি", icon: <Banknote className="size-4" /> },
] as const;

export function TransactionForm({
  onDone,
  onCancel,
  editing,
  defaultCustomerId,
  defaultType,
  defaultDate,
}: {
  onDone: () => void;
  onCancel?: () => void;
  editing?: TxnLite | null;
  defaultCustomerId?: string | null;
  defaultType?: string;
  defaultDate?: string;
}) {
  const { customers, products, bn, temp } = useStore();
  const toast = useToast();

  const [type, setType] = useState<string>(editing?.type ?? defaultType ?? "DUE");
  const [customerId, setCustomerId] = useState<string | null>(
    editing?.customerId ?? defaultCustomerId ?? null,
  );
  const [amount, setAmount] = useState<number>(editing?.amount ?? 0);
  const [discount, setDiscount] = useState<number>(editing?.discount ?? 0);
  const [method, setMethod] = useState<string>(editing?.method ?? "নগদ");
  const [note, setNote] = useState(editing?.note ?? "");
  const [date, setDate] = useState(
    editing ? toDateInput(editing.date) : (defaultDate ?? toDateInput(new Date())),
  );
  const [adjustStock, setAdjustStock] = useState(true);
  const [items, setItems] = useState<ItemRow[]>(
    editing?.items?.map((it) => ({
      key: itemKey(),
      productId: it.productId,
      name: it.name,
      unit: it.unit,
      qty: it.qty,
      unitPrice: it.unitPrice,
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", opening: 0 });

  const isSale = type === "DUE" || type === "CASH_SALE";
  const itemTotal = useMemo(
    () => round2(items.reduce((s, it) => s + it.qty * it.unitPrice, 0)),
    [items],
  );

  // পণ্যের লাইন যোগ হলে মোট টাকা নিজে থেকে বসে যায়
  useEffect(() => {
    if (isSale && items.length > 0) {
      setAmount(itemTotal);
    }
  }, [itemTotal, items.length, isSale]);

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.name,
        hint: `${c.phone ?? "নম্বর নেই"} • বাকি ${fmtMoney(c.due, { bn })}`,
        meta: <Avatar name={c.name} color={c.color} size="xs" />,
      })),
    [customers, bn],
  );

  const addItemRow = (productId?: string) => {
    const product = productId ? products.find((p) => p.id === productId) : null;
    setItems((prev) => [
      ...prev,
      {
        key: itemKey(),
        productId: product?.id ?? null,
        name: product?.name ?? "",
        unit: product?.unit ?? null,
        qty: 1,
        unitPrice: product?.sellPrice ?? 0,
      },
    ]);
  };

  const submit = async () => {
    if (!isSale && type !== "CASH_SALE" && !customerId) {
      toast.error("কাস্টমার নির্বাচন করুন", "বাকি, জমা বা ছাড় লেখার জন্য কাস্টমার দরকার");
      return;
    }
    if (amount <= 0) {
      toast.error("টাকার পরিমাণ দিন");
      return;
    }
    setSaving(true);

    const payload = {
      customerId: type === "CASH_SALE" && !customerId ? null : customerId,
      type,
      amount,
      discount,
      note: note.trim() || null,
      date,
      method: type === "PAYMENT" ? method : type === "CASH_SALE" ? "নগদ" : null,
      items: items
        .filter((it) => it.name.trim() && it.qty > 0)
        .map((it) => ({
          productId: it.productId,
          name: it.name.trim(),
          unit: it.unit,
          qty: it.qty,
          unitPrice: it.unitPrice,
        })),
      adjustStock,
    };

    const result = editing
      ? await temp.updateTransaction(editing.id, payload)
      : await temp.addTransaction(payload);

    setSaving(false);
    if (result.ok) {
      toast.success(
        editing ? "লেনদেন হালনাগাদ হয়েছে" : "হিসাব লেখা হয়েছে",
        selectedCustomer ? `${selectedCustomer.name} — ${fmtMoney(amount, { bn })}` : undefined,
      );
      onDone();
    }
  };

  const createCustomerInline = async () => {
    if (!newCustomer.name.trim()) {
      toast.error("নাম দিন");
      return;
    }
    const result = await temp.addCustomer({
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim() || null,
      openingBalance: newCustomer.opening,
      tag: "নিয়মিত",
    });
    if (result.ok) {
      setCustomerId(result.data.id);
      setNewCustomerOpen(false);
      setNewCustomer({ name: "", phone: "", opening: 0 });
      toast.success("নতুন কাস্টমার যোগ হয়েছে", result.data.name);
    }
  };

  return (
    <div className="space-y-4">
      <Segmented
        options={TYPES.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
        value={type as (typeof TYPES)[number]["value"]}
        onChange={(v) => {
          setType(v);
          if (v === "CASH_SALE") setCustomerId(null);
          if (v === "PAYMENT" || v === "DISCOUNT") setItems([]);
        }}
      />

      {/* কাস্টমার */}
      {type !== "CASH_SALE" ? (
        <Field label="কাস্টমার" required>
          <div className="flex gap-2">
            <Combobox
              className="flex-1"
              options={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              placeholder="কাস্টমার বাছাই করুন"
              emptyText="কাস্টমার পাওয়া যায়নি — নতুন যোগ করুন"
            />
            <button
              type="button"
              onClick={() => setNewCustomerOpen(true)}
              className="btn btn-ghost shrink-0 px-3"
              aria-label="নতুন কাস্টমার"
            >
              <UserPlus className="size-4" />
            </button>
          </div>
          {selectedCustomer ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Badge tone={selectedCustomer.due > 0 ? "rose" : "emerald"}>
                বর্তমান বাকি {fmtMoney(selectedCustomer.due, { bn })}
              </Badge>
              {selectedCustomer.creditLimit ? (
                <Badge tone="slate">সীমা {fmtMoney(selectedCustomer.creditLimit, { bn })}</Badge>
              ) : null}
              {type === "PAYMENT" && amount > 0 ? (
                <Badge tone="sky">
                  লিখলে বাকি হবে{" "}
                  {fmtMoney(Math.max(0, selectedCustomer.due - amount), { bn })}
                </Badge>
              ) : null}
              {isSale && amount > 0 ? (
                <Badge tone="amber">
                  নতুন বাকি হবে {fmtMoney(selectedCustomer.due + amount, { bn })}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </Field>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-sky-50 p-3 text-xs font-medium text-sky-800 dark:bg-sky-500/10 dark:text-sky-300">
          <Banknote className="size-4 shrink-0" />
          নগদ বিক্রি — কাস্টমারের খাতায় কিছু যোগ হবে না, শুধু দৈনিক আয়ে যুক্ত হবে।
        </div>
      )}

      {/* টাকার পরিমাণ */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={type === "PAYMENT" ? "জমার পরিমাণ" : "টাকার পরিমাণ"} required>
          <MoneyInput value={amount} onChange={setAmount} autoFocus={!items.length} />
        </Field>
        <Field label="তারিখ" required>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            {[
              { label: "আজ", days: 0 },
              { label: "গতকাল", days: 1 },
              { label: "২ দিন আগে", days: 2 },
            ].map((q) => {
              const d = new Date();
              d.setDate(d.getDate() - q.days);
              const value = toDateInput(d);
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setDate(value)}
                  className={cn(
                    "chip border transition",
                    date === value
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                      : "border-[var(--border)] text-muted",
                  )}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {/* পেমেন্ট মেথড */}
      {type === "PAYMENT" ? (
        <Field label="কীভাবে টাকা এসেছে?">
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "chip border transition",
                  method === m
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-[var(--border)] text-muted",
                )}
              >
                {paymentMethodLabel(m)}
              </button>
            ))}
          </div>
        </Field>
      ) : null}

      {/* পণ্যের লাইন */}
      {isSale ? (
        <div className="rounded-2xl border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Package className="size-4 text-brand-600" />
              কোন কোন মাল? (ঐচ্ছিক)
            </p>
            <button
              type="button"
              onClick={() => addItemRow()}
              className="btn btn-ghost px-2.5 py-1.5 text-xs"
            >
              <Plus className="size-3.5" /> লাইন যোগ
            </button>
          </div>

          {items.length === 0 ? (
            <p className="rounded-xl bg-[var(--surface-2)] px-3 py-4 text-center text-xs text-muted">
              পণ্য যোগ করলে স্টক নিজে থেকে কমে যাবে এবং মোট টাকাও হিসাব হয়ে যাবে।
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((row, index) => (
                <div key={row.key} className="rounded-xl bg-[var(--surface-2)] p-2">
                  <div className="flex items-center gap-2">
                    <Combobox
                      className="min-w-0 flex-1"
                      options={products.map((p) => ({
                        value: p.id,
                        label: p.name,
                        hint: `স্টক ${p.stock} ${p.unit} • ${fmtMoney(p.sellPrice, { bn })}`,
                      }))}
                      value={row.productId}
                      onChange={(value) => {
                        const product = products.find((p) => p.id === value);
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  productId: product?.id ?? null,
                                  name: product?.name ?? "",
                                  unit: product?.unit ?? null,
                                  unitPrice: product?.sellPrice ?? r.unitPrice,
                                }
                              : r,
                          ),
                        );
                      }}
                      placeholder="পণ্য বাছাই করুন"
                    />
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      aria-label="লাইন মুছুন"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <QtyStepper
                      value={row.qty}
                      unit={row.unit}
                      onChange={(qty) =>
                        setItems((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, qty } : r)),
                        )
                      }
                    />
                    <Input
                      inputMode="decimal"
                      value={row.unitPrice || ""}
                      onChange={(e) => {
                        const value = Number(e.target.value.replace(/[^0-9.]/g, ""));
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? { ...r, unitPrice: Number.isFinite(value) ? value : 0 }
                              : r,
                          ),
                        );
                      }}
                      className="py-2 text-sm tabular-nums"
                      placeholder="দর"
                    />
                    <span className="whitespace-nowrap text-sm font-bold tabular-nums">
                      {fmtMoney(row.qty * row.unitPrice, { bn })}
                    </span>
                  </div>
                  {!row.productId ? (
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)),
                        )
                      }
                      placeholder="পণ্যের নাম লিখুন"
                      className="mt-2 py-2 text-sm"
                    />
                  ) : null}
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 text-sm">
                <span className="font-semibold text-muted">মোট</span>
                <span className="text-lg font-extrabold tabular-nums">
                  {fmtMoney(itemTotal, { bn })}
                </span>
              </div>
              <label className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={adjustStock}
                  onChange={(e) => setAdjustStock(e.target.checked)}
                  className="size-4 accent-emerald-600"
                />
                বিক্রির হিসাবে স্টক কমিয়ে দিন
              </label>
            </div>
          )}
        </div>
      ) : null}

      {/* নোট */}
      <Field label="নোট (ঐচ্ছিক)" hint="যেমন: ১০ দিনের মধ্যে দিবেন বলেছেন">
        <Textarea
          value={note ?? ""}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="মনে রাখার জন্য কিছু লিখুন..."
        />
      </Field>

      {/* বাটন */}
      <div className="flex gap-2.5 pt-1">
        {onCancel ? (
          <button type="button" className="btn btn-ghost flex-1" onClick={onCancel}>
            বাতিল
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="btn btn-primary flex-1 py-3"
        >
          {saving ? "সংরক্ষণ হচ্ছে..." : editing ? "আপডেট করুন" : "সংরক্ষণ করুন"}
        </button>
      </div>

      {/* নতুন কাস্টমার মোডাল */}
      <Modal
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        title="নতুন কাস্টমার"
        description="হিসাব লেখার সময়েই নতুন কাস্টমার যোগ করুন"
        size="sm"
      >
        <div className="space-y-3">
          <Field label="নাম" required>
            <Input
              autoFocus
              value={newCustomer.name}
              onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
              placeholder="যেমন: করিম মিয়া"
            />
          </Field>
          <Field label="মোবাইল নম্বর">
            <Input
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
              placeholder="০১৭XXXXXXXX"
              inputMode="numeric"
            />
          </Field>
          <Field label="আগের বাকি (থাকলে)" hint="পুরনো খাতার বাকি থাকলে এখানে দিন">
            <MoneyInput
              value={newCustomer.opening}
              onChange={(v) => setNewCustomer((p) => ({ ...p, opening: v }))}
            />
          </Field>
          <button
            type="button"
            onClick={createCustomerInline}
            className="btn btn-primary w-full py-3"
          >
            <UserPlus className="size-4" /> কাস্টমার যোগ করুন
          </button>
        </div>
      </Modal>
    </div>
  );
}

function QtyStepper({
  value,
  unit,
  onChange,
}: {
  value: number;
  unit?: string | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-[var(--surface)] px-1 py-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0.25, round2(value - (unit === "কেজি" ? 0.25 : 1))))}
        className="rounded-lg p-1.5 text-muted transition hover:bg-[var(--surface-2)]"
        aria-label="কমান"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value.replace(/[^0-9.]/g, ""));
          onChange(Number.isFinite(v) ? v : 0);
        }}
        className="w-full min-w-0 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
      />
      <span className="shrink-0 text-[10px] text-muted">{unit}</span>
      <button
        type="button"
        onClick={() => onChange(round2(value + (unit === "কেজি" ? 0.25 : 1)))}
        className="rounded-lg p-1.5 text-muted transition hover:bg-[var(--surface-2)]"
        aria-label="বাড়ান"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function CloseIcon() {
  return <X className="size-4" />;
}
