"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Check,
  Clock,
  MessageSquare,
  Phone,
  Send,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { Avatar, Badge, Card, EmptyState, SectionHeader, TONES } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/fields";
import { ReminderSheet } from "@/components/reminder-sheet";
import { useStore } from "@/components/providers/store";
import { fmtMoney, fmtRelative, prettyPhone, toBnDigits, toIntlPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "need" | "history";

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="size-4" />,
  sms: <Smartphone className="size-4" />,
  call: <Phone className="size-4" />,
  in_person: <UserCheck className="size-4" />,
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "হোয়াটসঅ্যাপ",
  sms: "এসএমএস",
  call: "ফোন কল",
  in_person: "সরাসরি",
};

const STATUS_META: Record<string, { label: string; tone: keyof typeof TONES }> = {
  sent: { label: "পাঠানো", tone: "emerald" },
  promised: { label: "কথা দিয়েছেন", tone: "amber" },
  later: { label: "পরে দিবেন", tone: "slate" },
};

export function RemindersClient() {
  const { customers, reminders, bn } = useStore();
  const [tab, setTab] = useState<Tab>("need");
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [filterDays, setFilterDays] = useState<"all" | "7" | "14" | "30">("all");

  const needReminder = useMemo(() => {
    return customers
      .filter((c) => c.due > 0.5)
      .map((c) => {
        const days = c.lastActivityAt
          ? Math.floor((Date.now() - new Date(c.lastActivityAt).getTime()) / 86400000)
          : 999;
        const lastReminder = reminders.find((r) => r.customerId === c.id);
        return { customer: c, days, lastReminder };
      })
      .filter((row) => {
        if (filterDays === "all") return true;
        const limit = Number(filterDays);
        return row.days >= limit;
      })
      .sort((a, b) => b.days - a.days || b.customer.due - a.customer.due);
  }, [customers, reminders, filterDays]);

  const stats = useMemo(() => {
    const total = customers.reduce((s, c) => s + Math.max(0, c.due), 0);
    const thisWeek = reminders.filter(
      (r) => Date.now() - new Date(r.createdAt).getTime() < 7 * 86400000,
    );
    const promised = reminders.filter((r) => r.status === "promised");
    return { total, thisWeek: thisWeek.length, promised: promised.length };
  }, [customers, reminders]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">তাগাদা দরকার</p>
          <p className="text-lg font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
            {toBnDigits(customers.filter((c) => c.due > 0.5).length)} জন
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">এই সপ্তাহে পাঠানো</p>
          <p className="text-lg font-extrabold tabular-nums">{toBnDigits(stats.thisWeek)}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">পাওয়ার কথা দিয়েছেন</p>
          <p className="text-lg font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
            {toBnDigits(stats.promised)}
          </p>
        </div>
      </div>

      <Segmented<Tab>
        options={[
          { value: "need", label: "তাগাদা দরকার" },
          { value: "history", label: `ইতিহাস (${toBnDigits(reminders.length)})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "need" ? (
        <Card>
          <SectionHeader
            title="কাকে কত দিন ধরে বাকি"
            subtitle="যত দিন পুরনো, তত উপরে"
            icon={<BellRing className="size-4" />}
            action={
              <div className="flex gap-1.5">
                {(
                  [
                    { value: "all", label: "সব" },
                    { value: "7", label: "৭+ দিন" },
                    { value: "14", label: "১৪+ দিন" },
                    { value: "30", label: "৩০+ দিন" },
                  ] as Array<{ value: typeof filterDays; label: string }>
                ).map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilterDays(f.value)}
                    className={cn(
                      "chip border transition",
                      filterDays === f.value
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "border-[var(--border)] text-muted",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            }
          />

          {needReminder.length === 0 ? (
            <EmptyState
              icon={<Check className="size-6" />}
              title="সব হিসাব পরিষ্কার!"
              description="এই মুহূর্তে কারো কাছে বাকি নেই — চমৎকার কাজ।"
              className="border-0"
            />
          ) : (
            <div className="space-y-2.5">
              {needReminder.map(({ customer, days, lastReminder }) => (
                <div
                  key={customer.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-2xl border p-3",
                    days >= 60 ? "border-rose-200 dark:border-rose-500/30" : "",
                  )}
                >
                  <Link href={`/customers/${customer.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={customer.name} color={customer.color} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{customer.name}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <Clock className="size-3.5" />
                        {days > 900
                          ? "কোনো লেনদেনই হয়নি"
                          : `${toBnDigits(days)} দিন ধরে বাকি`}
                        {customer.phone ? ` • ${prettyPhone(customer.phone, bn)}` : ""}
                      </p>
                      {lastReminder ? (
                        <p className="mt-0.5 text-[11px] text-muted">
                          শেষ তাগাদা {fmtRelative(lastReminder.createdAt, bn)} (
                          {CHANNEL_LABELS[lastReminder.channel]})
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          এখনো কোনো তাগাদা দেওয়া হয়নি
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
                        {fmtMoney(customer.due, { bn })}
                      </p>
                      <Badge tone={days >= 60 ? "rose" : days >= 30 ? "amber" : "slate"}>
                        {days >= 60 ? "জরুরি" : days >= 30 ? "নজর দিন" : "স্বাভাবিক"}
                      </Badge>
                    </div>
                  </Link>

                  <div className="flex w-full gap-2 sm:w-auto">
                    {customer.phone ? (
                      <>
                        <a
                          href={`https://wa.me/${toIntlPhone(customer.phone)}?text=${encodeURIComponent(
                            `আসসালামু আলাইকুম ${customer.name}, আপনার কাছে আমাদের দোকানের বাকি আছে ৳${customer.due.toFixed(0)}। অনুগ্রহ করে পরিশোধ করুন।`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost flex-1 px-2.5 py-1.5 text-xs sm:flex-none"
                        >
                          <MessageSquare className="size-3.5" /> হোয়াটসঅ্যাপ
                        </a>
                        <a
                          href={`tel:${toIntlPhone(customer.phone)}`}
                          className="btn btn-ghost px-2.5 py-1.5 text-xs"
                        >
                          <Phone className="size-3.5" />
                        </a>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSheetFor(customer.id)}
                      className="btn btn-primary flex-1 px-2.5 py-1.5 text-xs sm:flex-none"
                    >
                      <Send className="size-3.5" /> তাগাদা
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <SectionHeader
            title="তাগাদার ইতিহাস"
            subtitle="কাকে কবে কোন মাধ্যমে জানানো হয়েছে"
            icon={<Clock className="size-4" />}
          />
          {reminders.length === 0 ? (
            <EmptyState
              icon={<BellRing className="size-6" />}
              title="এখনো কোনো তাগাদা পাঠানো হয়নি"
              description="বাকি আদায়ের জন্য কাস্টমারকে মনে করিয়ে দেওয়া খুব কাজে দেয়।"
              className="border-0"
            />
          ) : (
            <ol className="relative space-y-3 border-l pl-4">
              {reminders.map((r) => {
                const status = STATUS_META[r.status] ?? STATUS_META.sent;
                return (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand-500 ring-4 ring-[var(--surface)]" />
                    <div className="flex flex-wrap items-center gap-2">
                      {r.customer ? (
                        <Link
                          href={`/customers/${r.customerId}`}
                          className="text-sm font-bold hover:underline"
                        >
                          {r.customer.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-bold">কাস্টমার</span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        {CHANNEL_ICONS[r.channel]}
                        {CHANNEL_LABELS[r.channel] ?? r.channel}
                      </span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span className="text-[11px] text-muted">{fmtRelative(r.createdAt, bn)}</span>
                      <span className="ml-auto text-xs font-semibold tabular-nums">
                        {fmtMoney(r.amount, { bn })}
                      </span>
                    </div>
                    {r.message ? (
                      <p className="mt-1 rounded-xl bg-[var(--surface-2)] p-2 text-xs leading-relaxed text-muted">
                        {r.message}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      )}

      <ReminderSheet open={!!sheetFor} onClose={() => setSheetFor(null)} customerId={sheetFor} />
    </div>
  );
}
