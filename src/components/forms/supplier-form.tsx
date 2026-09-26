"use client";

import { useState } from "react";
import { Save, Truck, Minus, Plus } from "lucide-react";
import { Field, Input, MoneyInput, Segmented, Textarea } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/components/providers/store";
import type { SupplierLite } from "@/lib/types";
import { toDateInput } from "@/lib/utils";

export function SupplierForm({
  editing,
  onDone,
  onCancel,
}: {
  editing?: SupplierLite | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { temp } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    phone: editing?.phone ?? "",
    address: editing?.address ?? "",
    note: editing?.note ?? "",
    openingBalance: editing?.openingBalance ?? 0,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("সাপ্লায়ারের নাম দিন");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
      openingBalance: form.openingBalance,
    };
    const result = editing
      ? await temp.updateSupplier(editing.id, payload)
      : await temp.addSupplier(payload);
    setSaving(false);
    if (result.ok) {
      toast.success(editing ? "সাপ্লায়ার হালনাগাদ" : "সাপ্লায়ার যোগ হয়েছে", form.name);
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <Field label="সাপ্লায়ারের নাম" required>
        <Input
          autoFocus
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="যেমন: হক ট্রেডার্স"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="মোবাইল নম্বর">
          <Input
            value={form.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="০১৭XXXXXXXX"
            inputMode="tel"
          />
        </Field>
        <Field label="ঠিকানা">
          <Input
            value={form.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="মার্কেট / এলাকা"
          />
        </Field>
      </div>
      <Field label="আমাদের কাছে তার পাওনা" hint="আগে থেকে বাকি থাকলে">
        <MoneyInput
          value={form.openingBalance}
          onChange={(v) => set("openingBalance", v)}
        />
      </Field>
      <Field label="নোট">
        <Textarea
          value={form.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
          rows={2}
          placeholder="যেমন: চাল-ডাল পাইকারিতে দেন"
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
          <Save className="size-4" />
          {saving ? "সংরক্ষণ হচ্ছে..." : editing ? "আপডেট করুন" : "সাপ্লায়ার যোগ করুন"}
        </button>
      </div>
    </div>
  );
}

export function SupplierTxnForm({
  supplier,
  onDone,
  onCancel,
}: {
  supplier: SupplierLite;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { temp } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"PURCHASE" | "PAYMENT">("PURCHASE");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));

  const submit = async () => {
    if (amount <= 0) {
      toast.error("টাকার পরিমাণ দিন");
      return;
    }
    setSaving(true);
    const result = await temp.addSupplierTxn(supplier.id, {
      type,
      amount,
      note: note.trim() || null,
      date,
    });
    setSaving(false);
    if (result.ok) {
      toast.success(type === "PURCHASE" ? "মাল কেনা লেখা হয়েছে" : "পরিশোধ লেখা হয়েছে");
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
          <Truck className="size-5" />
        </div>
        <div>
          <p className="font-semibold">{supplier.name}</p>
          <p className="text-xs text-muted">
            বর্তমান পাওনা ৳{(supplier.payable ?? 0).toLocaleString("bn-BD")}
          </p>
        </div>
      </div>

      <Segmented
        options={[
          { value: "PURCHASE", label: "মাল কেনা", icon: <Plus className="size-4" /> },
          { value: "PAYMENT", label: "টাকা পরিশোধ", icon: <Minus className="size-4" /> },
        ]}
        value={type}
        onChange={setType}
      />

      <Field label="টাকার পরিমাণ" required>
        <MoneyInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      <Field label="তারিখ">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="নোট">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={type === "PURCHASE" ? "যেমন: ৫ বস্তা চাল" : "যেমন: বিকাশে পাঠানো হলো"}
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
          {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </button>
      </div>
    </div>
  );
}
