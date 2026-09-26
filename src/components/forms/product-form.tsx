"use client";

import { useState } from "react";
import { Save, Package, Plus } from "lucide-react";
import { Badge } from "@/components/ui/bits";
import { Combobox, Field, Input, MoneyInput } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/components/providers/store";
import { PRODUCT_CATEGORIES, type ProductLite } from "@/lib/types";
import { fmtMoney } from "@/lib/format";

const UNITS = ["কেজি", "পিস", "প্যাকেট", "বোতল", "ডজন", "লিটার", "ব্যাগ", "গ্রাম", "১০০ গ্রাম"];

export function ProductForm({
  editing,
  onDone,
  onCancel,
}: {
  editing?: ProductLite | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { temp, bn } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    category: editing?.category ?? "মুদি",
    unit: editing?.unit ?? "পিস",
    sellPrice: editing?.sellPrice ?? 0,
    buyPrice: editing?.buyPrice ?? 0,
    stock: editing?.stock ?? 0,
    lowStockAt: editing?.lowStockAt ?? 5,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const margin =
    form.sellPrice > 0
      ? Math.round(((form.sellPrice - form.buyPrice) / form.sellPrice) * 1000) / 10
      : 0;

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("পণ্যের নাম দিন");
      return;
    }
    setSaving(true);
    const payload = { ...form, name: form.name.trim() };
    const result = editing
      ? await temp.updateProduct(editing.id, payload)
      : await temp.addProduct(payload);
    setSaving(false);
    if (result.ok) {
      toast.success(editing ? "পণ্য হালনাগাদ হয়েছে" : "নতুন পণ্য যোগ হয়েছে", form.name);
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <Field label="পণ্যের নাম" required>
        <Input
          autoFocus
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="যেমন: মিনিকেট চাল"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ক্যাটাগরি">
          <Combobox
            options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            value={form.category}
            onChange={(v) => set("category", v ?? "মুদি")}
            placeholder="ক্যাটাগরি"
          />
        </Field>
        <Field label="একক">
          <Combobox
            options={UNITS.map((u) => ({ value: u, label: u }))}
            value={form.unit}
            onChange={(v) => set("unit", v ?? "পিস")}
            placeholder="একক"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ক্রয় দাম" hint="যে দামে কিনেছেন">
          <MoneyInput value={form.buyPrice} onChange={(v) => set("buyPrice", v)} />
        </Field>
        <Field label="বিক্রয় দাম" hint="যে দামে বিক্রি করবেন">
          <MoneyInput value={form.sellPrice} onChange={(v) => set("sellPrice", v)} />
        </Field>
      </div>

      {form.sellPrice > 0 && form.buyPrice > 0 ? (
        <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] p-3 text-sm">
          <Badge tone={margin > 0 ? "emerald" : "rose"}>
            লাভ {margin > 0 ? "+" : ""}
            {margin}%
          </Badge>
          <span className="text-xs text-muted">
            প্রতি {form.unit} এ {fmtMoney(form.sellPrice - form.buyPrice, { bn })} লাভ
          </span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="বর্তমান স্টক">
          <Input
            inputMode="decimal"
            value={form.stock}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/[^0-9.-]/g, ""));
              set("stock", Number.isFinite(v) ? v : 0);
            }}
            className="tabular-nums"
          />
        </Field>
        <Field label="কম স্টকের সতর্কতা" hint="এর নিচে গেলে অ্যাপ জানাবে">
          <Input
            inputMode="decimal"
            value={form.lowStockAt}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/[^0-9.]/g, ""));
              set("lowStockAt", Number.isFinite(v) ? v : 0);
            }}
            className="tabular-nums"
          />
        </Field>
      </div>

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
          {saving ? "সংরক্ষণ হচ্ছে..." : editing ? "আপডেট করুন" : "পণ্য যোগ করুন"}
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Package className="size-3.5" />
        বিক্রির সময় এই পণ্য বাছাই করলে স্টক নিজে থেকেই কমে যাবে।
      </p>
    </div>
  );
}
