"use client";

import { useState } from "react";
import { CalendarDays, Save, Plus } from "lucide-react";
import { Combobox, Field, Input, MoneyInput, Segmented } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/components/providers/store";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, type ExpenseLite } from "@/lib/types";
import { toDateInput } from "@/lib/utils";
import { paymentMethodLabel } from "@/lib/format";

export function ExpenseForm({
  editing,
  onDone,
  onCancel,
}: {
  editing?: ExpenseLite | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { temp } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: editing?.category ?? "পরিবহন",
    amount: editing?.amount ?? 0,
    note: editing?.note ?? "",
    paidTo: editing?.paidTo ?? "",
    method: editing?.method ?? "নগদ",
    date: toDateInput(editing?.date ?? new Date()),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (form.amount <= 0) {
      toast.error("খরচের পরিমাণ দিন");
      return;
    }
    setSaving(true);
    const payload = {
      category: form.category,
      amount: form.amount,
      note: form.note.trim() || null,
      paidTo: form.paidTo.trim() || null,
      method: form.method,
      date: form.date,
    };
    const result = editing
      ? await temp.updateExpense(editing.id, payload)
      : await temp.addExpense(payload);
    setSaving(false);
    if (result.ok) {
      toast.success(editing ? "খরচ হালনাগাদ হয়েছে" : "খরচ যোগ হয়েছে", form.category);
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <Field label="খরচের ধরন" required>
        <Combobox
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={form.category}
          onChange={(v) => set("category", v ?? "অন্যান্য")}
          placeholder="খরচের ধরন"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="টাকার পরিমাণ" required>
          <MoneyInput value={form.amount} onChange={(v) => set("amount", v)} />
        </Field>
        <Field label="তারিখ" required>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="pl-9"
            />
          </div>
        </Field>
      </div>

      <Field label="কাকে দেওয়া হলো">
        <Input
          value={form.paidTo ?? ""}
          onChange={(e) => set("paidTo", e.target.value)}
          placeholder="যেমন: ভ্যান চালক করিম"
        />
      </Field>

      <Field label="যেভাবে দেওয়া হলো">
        <Segmented
          size="sm"
          options={PAYMENT_METHODS.slice(0, 4).map((m) => ({
            value: m,
            label: paymentMethodLabel(m),
          }))}
          value={form.method}
          onChange={(v) => set("method", v)}
        />
      </Field>

      <Field label="নোট">
        <Input
          value={form.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
          placeholder="যেমন: মাল আনানোর ভাড়া"
        />
      </Field>

      <div className="flex gap-2.5">
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
          {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
          {saving ? "সংরক্ষণ হচ্ছে..." : editing ? "আপডেট করুন" : "খরচ যোগ করুন"}
        </button>
      </div>
    </div>
  );
}
