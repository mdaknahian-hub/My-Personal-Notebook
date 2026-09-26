"use client";

import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Field, Input, MoneyInput, TagPicker, Textarea } from "@/components/ui/fields";
import { Avatar } from "@/components/ui/bits";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/components/providers/store";
import { CUSTOMER_TAGS, type CustomerLite } from "@/lib/types";
import { AVATAR_COLOR_KEYS, cn } from "@/lib/utils";

export function CustomerForm({
  editing,
  onDone,
  onCancel,
  onDelete,
}: {
  editing?: CustomerLite | null;
  onDone: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const { temp } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: editing?.name ?? "",
    phone: editing?.phone ?? "",
    address: editing?.address ?? "",
    note: editing?.note ?? "",
    tag: editing?.tag ?? "নিয়মিত",
    color: editing?.color ?? "emerald",
    openingBalance: editing?.openingBalance ?? 0,
    creditLimit: editing?.creditLimit ?? 0,
    isActive: editing?.isActive ?? true,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("কাস্টমারের নাম দিন");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
      tag: form.tag,
      color: form.color,
      openingBalance: form.openingBalance,
      creditLimit: form.creditLimit > 0 ? form.creditLimit : null,
      isActive: form.isActive,
    };
    const result = editing
      ? await temp.updateCustomer(editing.id, payload)
      : await temp.addCustomer(payload);
    setSaving(false);
    if (result.ok) {
      toast.success(editing ? "তথ্য হালনাগাদ হয়েছে" : "কাস্টমার যোগ হয়েছে", form.name);
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
        <Avatar name={form.name || "নতুন"} color={form.color} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-bold">{form.name || "নতুন কাস্টমার"}</p>
          <p className="text-xs text-muted">{form.tag}</p>
        </div>
      </div>

      <Field label="নাম" required>
        <Input
          autoFocus
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="যেমন: করিম মিয়া"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="মোবাইল নম্বর" hint="তাগাদা পাঠাতে কাজে লাগবে">
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
            placeholder="পাড়া / রোড / বাজার"
          />
        </Field>
      </div>

      <Field label="ট্যাগ" hint="কার আত্মীয়, পাইকারি না নিয়মিত — আলাদা করে রাখুন">
        <TagPicker
          value={form.tag}
          onChange={(v) => set("tag", v)}
          suggestions={CUSTOMER_TAGS}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="আগের বাকি" hint="পুরনো খাতার বাকি">
          <MoneyInput
            value={form.openingBalance}
            onChange={(v) => set("openingBalance", v)}
          />
        </Field>
        <Field label="বাকির সীমা" hint="এর বেশি হলে অ্যাপ সতর্ক করবে">
          <MoneyInput
            value={form.creditLimit ?? 0}
            onChange={(v) => set("creditLimit", v)}
          />
        </Field>
      </div>

      <Field label="রঙ">
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => set("color", key)}
              className={cn(
                "size-8 rounded-xl ring-offset-2 transition",
                form.color === key ? "ring-2 ring-brand-500" : "",
                key === "emerald" && "bg-gradient-to-br from-emerald-400 to-teal-600",
                key === "sky" && "bg-gradient-to-br from-sky-400 to-blue-600",
                key === "violet" && "bg-gradient-to-br from-violet-400 to-purple-600",
                key === "amber" && "bg-gradient-to-br from-amber-400 to-orange-600",
                key === "rose" && "bg-gradient-to-br from-rose-400 to-pink-600",
                key === "cyan" && "bg-gradient-to-br from-cyan-400 to-teal-600",
                key === "lime" && "bg-gradient-to-br from-lime-400 to-green-600",
                key === "fuchsia" && "bg-gradient-to-br from-fuchsia-400 to-purple-600",
                key === "indigo" && "bg-gradient-to-br from-indigo-400 to-blue-700",
                key === "orange" && "bg-gradient-to-br from-orange-400 to-red-600",
              )}
              aria-label={key}
            />
          ))}
        </div>
      </Field>

      <Field label="নোট">
        <Textarea
          value={form.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
          rows={2}
          placeholder="যেমন: প্রতি মাসের ৫ তারিখে হিসাব মিটিয়ে দেন"
        />
      </Field>

      <label className="flex items-center gap-2.5 rounded-2xl border p-3 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="size-4 accent-emerald-600"
        />
        <span>
          <span className="font-semibold">চলমান কাস্টমার</span>
          <span className="block text-xs text-muted">
            বন্ধ করলে খাতা মুছে যাবে না, শুধু তালিকার নিচে চলে যাবে
          </span>
        </span>
      </label>

      <div className="flex gap-2.5">
        {onCancel ? (
          <button type="button" className="btn btn-ghost flex-1" onClick={onCancel}>
            বাতিল
          </button>
        ) : null}
        {editing && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-ghost text-rose-500"
            aria-label="মুছে ফেলুন"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="btn btn-primary flex-1 py-3"
        >
          <Save className="size-4" />
          {saving ? "সংরক্ষণ হচ্ছে..." : editing ? "আপডেট করুন" : "যোগ করুন"}
        </button>
      </div>
    </div>
  );
}
