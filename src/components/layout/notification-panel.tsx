"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  Clock,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/components/providers/store";
import { Avatar, Badge, EmptyState } from "@/components/ui/bits";
import { fmtMoney, fmtRelative } from "@/lib/format";
import { dueSeverity } from "@/lib/calc";

export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { customers, products, activities, bn } = useStore();

  const data = useMemo(() => {
    const overdue = customers
      .filter((c) => c.due > 500)
      .map((c) => {
        const days = c.lastActivityAt
          ? Math.floor((Date.now() - new Date(c.lastActivityAt).getTime()) / 86400000)
          : 999;
        return { customer: c, days };
      })
      .filter((r) => r.days >= 14)
      .sort((a, b) => b.customer.due - a.customer.due)
      .slice(0, 5);

    const lowStock = products
      .filter((p) => p.stock <= p.lowStockAt)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    const bigDue = customers
      .filter((c) => dueSeverity(c.due, c.creditLimit) === "high")
      .sort((a, b) => b.due - a.due)
      .slice(0, 3);

    return { overdue, lowStock, bigDue };
  }, [customers, products]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="স্মার্ট অ্যালার্ট"
      description="আপনার দোকানের জন্য জরুরি খবরগুলো এক নজরে"
      size="lg"
    >
      <div className="space-y-5">
        {data.overdue.length === 0 && data.lowStock.length === 0 && data.bigDue.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="size-6" />}
            title="সব ঠিকঠাক আছে!"
            description="কোনো বকেয়া তাগাদা বা স্টকের সতর্কতা নেই"
            className="border-0"
          />
        ) : null}

        {data.overdue.length > 0 ? (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <BellRing className="size-4 text-rose-500" /> তাগাদা দরকার ({data.overdue.length})
            </h3>
            <div className="space-y-2">
              {data.overdue.map(({ customer, days }) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl border p-3 transition hover:border-brand-300"
                >
                  <Avatar name={customer.name} color={customer.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{customer.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3" />
                      {days > 900
                        ? "কোনো লেনদেন নেই"
                        : `${bn ? days.toLocaleString("bn-BD") : days} দিন ধরে বাকি`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {fmtMoney(customer.due, { bn })}
                  </span>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.bigDue.length > 0 ? (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <AlertTriangle className="size-4 text-amber-500" /> সীমা ছাড়ানো বাকি
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.bigDue.map((c) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition hover:border-amber-300"
                >
                  <span className="font-semibold">{c.name}</span>
                  <Badge tone="amber">{fmtMoney(c.due, { bn })}</Badge>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.lowStock.length > 0 ? (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <PackageCheck className="size-4 text-amber-500" /> স্টক শেষ হয়ে যাচ্ছে
            </h3>
            <div className="space-y-2">
              {data.lowStock.map((p) => (
                <Link
                  key={p.id}
                  href="/stock"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl border p-3 transition hover:border-brand-300"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <PackageCheck className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">{p.category}</p>
                  </div>
                  <Badge tone={p.stock <= 0 ? "rose" : "amber"}>
                    {p.stock <= 0 ? "শেষ" : `${bn ? p.stock.toLocaleString("bn-BD") : p.stock} ${p.unit}`}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {activities.length > 0 ? (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Clock className="size-4 text-sky-500" /> সাম্প্রতিক কাজ
            </h3>
            <ul className="space-y-2">
              {activities.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{a.title}</p>
                    <p className="text-xs text-muted">{fmtRelative(a.createdAt, bn)}</p>
                  </div>
                  {a.amount ? (
                    <span className="text-xs font-semibold text-muted">
                      {fmtMoney(a.amount, { bn })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
