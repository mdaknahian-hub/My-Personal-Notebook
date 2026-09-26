"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  ChevronRight,
  Filter,
  Phone,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { Avatar, Badge, EmptyState, TONES } from "@/components/ui/bits";
import { Modal } from "@/components/ui/modal";
import { SearchInput, Segmented, Select } from "@/components/ui/fields";
import { CustomerForm } from "@/components/forms/customer-form";
import { ReminderSheet } from "@/components/reminder-sheet";
import { useStore } from "@/components/providers/store";
import { dueSeverity, SEVERITY_META } from "@/lib/calc";
import { fmtMoney, fmtRelative, prettyPhone, toEnDigits, toIntlPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CUSTOMER_TAGS } from "@/lib/types";

type StatusFilter = "all" | "due" | "clear" | "inactive";

export function CustomersClient() {
  const { customers, bn } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("due");
  const [formOpen, setFormOpen] = useState(false);
  const [reminderFor, setReminderFor] = useState<string | null>(null);

  const tags = useMemo(
    () => [...new Set([...CUSTOMER_TAGS, ...customers.map((c) => c.tag)])],
    [customers],
  );

  const list = useMemo(() => {
    const q = toEnDigits(query.trim().toLowerCase());
    let rows = customers.filter((c) => {
      if (status === "due" && c.due <= 0.5) return false;
      if (status === "clear" && c.due > 0.5) return false;
      if (status === "inactive" && c.isActive) return false;
      if (status === "all" && !c.isActive) return false;
      if (tag && c.tag !== tag) return false;
      if (!q) return true;
      return [c.name, c.phone, c.address, c.tag].some((v) =>
        v ? toEnDigits(v.toLowerCase()).includes(q) : false,
      );
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "bn");
      if (sort === "recent")
        return (
          new Date(b.lastActivityAt ?? 0).getTime() - new Date(a.lastActivityAt ?? 0).getTime()
        );
      if (sort === "oldest")
        return (
          new Date(a.lastActivityAt ?? 0).getTime() - new Date(b.lastActivityAt ?? 0).getTime()
        );
      return b.due - a.due;
    });
    return rows;
  }, [customers, query, status, tag, sort]);

  const totals = useMemo(() => {
    const due = customers.filter((c) => c.due > 0.5);
    return {
      due: due.reduce((s, c) => s + c.due, 0),
      dueCount: due.length,
      clearCount: customers.filter((c) => c.due <= 0.5).length,
    };
  }, [customers]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* সারাংশ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">মোট বাকি</p>
          <p className="text-lg font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
            {fmtMoney(totals.due, { bn })}
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">বাকি আছে</p>
          <p className="text-lg font-extrabold tabular-nums">
            {bn ? totals.dueCount.toLocaleString("bn-BD") : totals.dueCount} জন
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">হিসাব পরিষ্কার</p>
          <p className="text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
            {bn ? totals.clearCount.toLocaleString("bn-BD") : totals.clearCount} জন
          </p>
        </div>
      </div>

      {/* ফিল্টার */}
      <div className="card space-y-3 p-3.5">
        <div className="flex gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="নাম, নম্বর বা ঠিকানা দিয়ে খুঁজুন..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="btn btn-primary shrink-0 px-3.5"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">নতুন কাস্টমার</span>
          </button>
        </div>

        <Segmented<StatusFilter>
          size="sm"
          options={[
            { value: "all", label: "সব" },
            { value: "due", label: "বাকি আছে" },
            { value: "clear", label: "পরিষ্কার" },
            { value: "inactive", label: "বন্ধ" },
          ]}
          value={status}
          onChange={setStatus}
        />

        <div className="flex gap-2">
          <Select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="py-2 text-sm"
          >
            <option value="">সব ধরনের কাস্টমার</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="py-2 text-sm"
          >
            <option value="due">বেশি বাকি আগে</option>
            <option value="name">নাম অনুযায়ী</option>
            <option value="recent">সাম্প্রতিক লেনদেন</option>
            <option value="oldest">পুরনো লেনদেন আগে</option>
          </Select>
        </div>
      </div>

      {/* তালিকা */}
      {list.length === 0 ? (
        <EmptyState
          icon={customers.length === 0 ? <UserPlus className="size-6" /> : <Search className="size-6" />}
          title={customers.length === 0 ? "এখনো কোনো কাস্টমার নেই" : "কোনো কাস্টমার পাওয়া যায়নি"}
          description={
            customers.length === 0
              ? "প্রথম কাস্টমার যোগ করে বাকির খাতা শুরু করুন। বিক্রির সময়ও দ্রুত যোগ করা যাবে।"
              : "ফিল্টার বা খোঁজা শব্দ বদলে আবার চেষ্টা করুন।"
          }
          action={
            <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> নতুন কাস্টমার যোগ করুন
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {list.map((c) => {
            const severity = SEVERITY_META[dueSeverity(c.due, c.creditLimit)];
            const limitPercent =
              c.creditLimit && c.creditLimit > 0
                ? Math.min(100, (c.due / c.creditLimit) * 100)
                : null;
            return (
              <div
                key={c.id}
                className={cn(
                  "card flex items-center gap-3 p-3.5 transition hover:shadow-[var(--shadow-lift)]",
                  c._pending && "opacity-60",
                )}
              >
                <Link href={`/customers/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={c.name} color={c.color} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold">{c.name}</p>
                      <Badge tone="slate" className="hidden sm:inline-flex">
                        {c.tag}
                      </Badge>
                      {!c.isActive ? <Badge tone="slate">বন্ধ</Badge> : null}
                    </div>
                    <p className="truncate text-xs text-muted">
                      {prettyPhone(c.phone, bn)}
                      {c.address ? ` • ${c.address}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {c.lastActivityAt
                        ? `শেষ লেনদেন ${fmtRelative(c.lastActivityAt, bn)}`
                        : "এখনো লেনদেন হয়নি"}
                    </p>
                    {limitPercent !== null && c.due > 0 ? (
                      <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            limitPercent >= 100
                              ? "bg-rose-500"
                              : limitPercent >= 60
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                          )}
                          style={{ width: `${Math.max(limitPercent, 4)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-base font-extrabold tabular-nums", severity.text)}>
                      {c.due > 0 ? fmtMoney(c.due, { bn }) : "৳ ০"}
                    </p>
                    <p className="text-[11px] font-semibold text-muted">
                      {c.due > 0 ? "বাকি" : "পরিষ্কার"}
                    </p>
                  </div>
                </Link>

                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  {c.phone ? (
                    <a
                      href={`tel:${toIntlPhone(c.phone)}`}
                      className="rounded-xl border p-2 text-muted transition hover:text-[var(--text)]"
                      aria-label="কল করুন"
                    >
                      <Phone className="size-4" />
                    </a>
                  ) : null}
                  {c.due > 0.5 ? (
                    <button
                      type="button"
                      onClick={() => setReminderFor(c.id)}
                      className={cn("rounded-xl border p-2 transition", TONES.emerald)}
                      aria-label="তাগাদা পাঠান"
                    >
                      <BellRing className="size-4" />
                    </button>
                  ) : null}
                  <Link
                    href={`/customers/${c.id}`}
                    className="rounded-xl border p-2 text-muted transition hover:text-[var(--text)]"
                    aria-label="খাতা দেখুন"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted">
        <Filter className="size-3.5" />
        {bn ? list.length.toLocaleString("bn-BD") : list.length} জন কাস্টমার দেখানো হচ্ছে
      </p>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="নতুন কাস্টমার"
        description="খাতা খুলে ফেলুন — নাম আর নম্বর থাকলেই হবে"
        size="md"
      >
        <CustomerForm onDone={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      </Modal>

      <ReminderSheet
        open={!!reminderFor}
        onClose={() => setReminderFor(null)}
        customerId={reminderFor}
      />
    </div>
  );
}

export function CustomersEmptyIcon() {
  return <Users className="size-6" />;
}
