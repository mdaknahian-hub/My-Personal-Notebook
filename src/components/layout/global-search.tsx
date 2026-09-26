"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Package, Receipt, Search, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/components/providers/store";
import { Avatar, EmptyState } from "@/components/ui/bits";
import { fmtMoney, prettyPhone } from "@/lib/format";
import { toEnDigits } from "@/lib/format";

export function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { customers, products, transactions, bn } = useStore();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const q = toEnDigits(query.trim().toLowerCase());

  const results = useMemo(() => {
    if (q.length < 1) return { customers: [], products: [], transactions: [] };
    const match = (text?: string | null) =>
      !!text && toEnDigits(text.toLowerCase()).includes(q);

    return {
      customers: customers
        .filter((c) => match(c.name) || match(c.phone) || match(c.address) || match(c.tag))
        .slice(0, 6),
      products: products
        .filter((p) => match(p.name) || match(p.category))
        .slice(0, 5),
      transactions: transactions
        .filter(
          (t) =>
            match(t.note) ||
            match(t.customer?.name) ||
            t.items.some((it) => match(it.name)),
        )
        .slice(0, 5),
    };
  }, [q, customers, products, transactions]);

  const total =
    results.customers.length + results.products.length + results.transactions.length;

  const go = (href: string) => {
    onClose();
    setQuery("");
    router.push(href);
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" sheetOnMobile={false}>
      <div className="-mx-5 -my-4">
        <div className="relative border-b px-5 py-3.5">
          <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="কাস্টমারের নাম, ফোন নম্বর, পণ্য বা নোট খুঁজুন..."
            className="w-full bg-transparent pl-8 text-base outline-none placeholder:text-muted"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {q.length === 0 ? (
            <div className="space-y-2 p-3">
              <p className="text-xs font-semibold text-muted">দ্রুত যাওয়ার লিংক</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: "/customers", label: "কাস্টমার খাতা", icon: <Users className="size-4" /> },
                  { href: "/transactions", label: "সব লেনদেন", icon: <Receipt className="size-4" /> },
                  { href: "/stock", label: "স্টক তালিকা", icon: <Package className="size-4" /> },
                  { href: "/reports", label: "রিপোর্ট দেখুন", icon: <ArrowRight className="size-4" /> },
                ].map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => go(link.href)}
                    className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition hover:border-brand-300"
                  >
                    <span className="text-muted">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          ) : total === 0 ? (
            <EmptyState
              icon={<Search className="size-6" />}
              title="কিছু পাওয়া যায়নি"
              description="অন্য নাম বা নম্বর দিয়ে খুঁজে দেখুন"
              className="border-0"
            />
          ) : (
            <div className="space-y-4">
              {results.customers.length > 0 ? (
                <Group title="কাস্টমার">
                  {results.customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => go(`/customers/${c.id}`)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-[var(--surface-2)]"
                    >
                      <Avatar name={c.name} color={c.color} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {prettyPhone(c.phone, bn)} • {c.tag}
                        </span>
                      </span>
                      <span
                        className={
                          c.due > 0
                            ? "text-sm font-bold text-rose-600 dark:text-rose-400"
                            : "text-xs font-semibold text-emerald-600"
                        }
                      >
                        {c.due > 0 ? fmtMoney(c.due, { bn }) : "পরিষ্কার"}
                      </span>
                    </button>
                  ))}
                </Group>
              ) : null}

              {results.products.length > 0 ? (
                <Group title="পণ্য">
                  {results.products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => go(`/stock?q=${encodeURIComponent(p.name)}`)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-[var(--surface-2)]"
                    >
                      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                        <Package className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.name}</span>
                        <span className="block truncate text-xs text-muted">
                          স্টক: {p.stock} {p.unit} • {p.category}
                        </span>
                      </span>
                      <span className="text-sm font-semibold">{fmtMoney(p.sellPrice, { bn })}</span>
                    </button>
                  ))}
                </Group>
              ) : null}

              {results.transactions.length > 0 ? (
                <Group title="লেনদেন">
                  {results.transactions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        go(t.customerId ? `/customers/${t.customerId}` : "/transactions")
                      }
                      className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-[var(--surface-2)]"
                    >
                      <Avatar name={t.customer?.name ?? "নগদ"} color={t.customer?.color} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {t.customer?.name ?? "নগদ ক্রেতা"}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {t.items.map((i) => i.name).join(", ") || t.note || "—"}
                        </span>
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {fmtMoney(t.amount, { bn })}
                      </span>
                    </button>
                  ))}
                </Group>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
