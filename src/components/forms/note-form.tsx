"use client";

import { useState } from "react";
import { Pin, Save } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/components/providers/store";
import type { NoteLite } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS = [
  { key: "amber", className: "bg-amber-100 dark:bg-amber-500/15" },
  { key: "emerald", className: "bg-emerald-100 dark:bg-emerald-500/15" },
  { key: "sky", className: "bg-sky-100 dark:bg-sky-500/15" },
  { key: "rose", className: "bg-rose-100 dark:bg-rose-500/15" },
  { key: "violet", className: "bg-violet-100 dark:bg-violet-500/15" },
];

export function NoteForm({
  editing,
  onDone,
  onCancel,
}: {
  editing?: NoteLite | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { temp } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: editing?.title ?? "",
    body: editing?.body ?? "",
    color: editing?.color ?? "amber",
    pinned: editing?.pinned ?? false,
    tags: editing?.tags ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error("শিরোনাম দিন");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      body: form.body,
      color: form.color,
      pinned: form.pinned,
      tags: form.tags.trim() || null,
    };
    const result = editing
      ? await temp.updateNote(editing.id, payload)
      : await temp.addNote(payload);
    setSaving(false);
    if (result.ok) {
      toast.success(editing ? "নোট হালনাগাদ হয়েছে" : "নোট যোগ হয়েছে");
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <Field label="শিরোনাম" required>
        <Input
          autoFocus
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="যেমন: আগামী সপ্তাহের কাজ"
        />
      </Field>
      <Field label="বিস্তারিত">
        <Textarea
          rows={6}
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          placeholder="এখানে লিখুন..."
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="রঙ">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => set("color", c.key)}
                className={cn(
                  "size-9 rounded-xl ring-offset-2 transition",
                  c.className,
                  form.color === c.key && "ring-2 ring-brand-500",
                )}
                aria-label={c.key}
              />
            ))}
          </div>
        </Field>
        <Field label="ট্যাগ" hint="কমা দিয়ে আলাদা করুন">
          <Input
            value={form.tags ?? ""}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="কাজ, হিসাব"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2.5 rounded-2xl border p-3 text-sm">
        <input
          type="checkbox"
          checked={form.pinned}
          onChange={(e) => set("pinned", e.target.checked)}
          className="size-4 accent-emerald-600"
        />
        <span className="flex items-center gap-1.5 font-semibold">
          <Pin className="size-4" /> উপরে পিন করে রাখুন
        </span>
      </label>
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
          {saving ? "সংরক্ষণ হচ্ছে..." : editing ? "আপডেট করুন" : "নোট যোগ করুন"}
        </button>
      </div>
    </div>
  );
}
