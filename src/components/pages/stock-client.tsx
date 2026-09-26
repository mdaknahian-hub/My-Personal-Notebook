"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  Minus,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { Badge, Card, EmptyState, TONES } from "@/components/ui/bits";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Field, MoneyInput, SearchInput, Select } from "@/components/ui/fields";
import { ProductForm } from "@/components/forms/product-form";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtMoney, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductLite } from "@/lib/types";

type StockFilter = "all" | "low" | "out";

export function StockClient() {
  const { products, bn, temp } = useStore();
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductLite | null>(null);
  const [deleting, setDeleting] = useState<ProductLite | null>(null);
  const [restocking, setRestocking] = useState<ProductLite | null>(null);
  const [restockQty, setRestockQty] = useState(0);
  const [restockNote, setRestockNote] = useState("");
  const [busy, setBusy] = useState(false);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, "bn")),
    [products],
  );

  const stats = useMemo(
    () => ({
      total: products.length,
      out: products.filter((p) => p.stock <= 0).length,
      low: products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length,
      value: products.reduce((s, p) => s + p.stock * p.buyPrice, 0),
      retail: products.reduce((s, p) => s + p.stock * p.sellPrice, 0),
    }),
    [products],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => {
        if (category && p.category !== category) return false;
        if (filter === "low" && !(p.stock > 0 && p.stock <= p.lowStockAt)) return false;
        if (filter === "out" && p.stock > 0) return false;
        if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort((a, b) => {
        const aLow = a.stock <= a.lowStockAt ? 0 : 1;
        const bLow = b.stock <= b.lowStockAt ? 0 : 1;
        if (aLow !== bLow) return aLow - bLow;
        return a.name.localeCompare(b.name, "bn");
      });
  }, [products, query, category, filter]);

  const adjust = async (product: ProductLite, delta: number) => {
    await temp.updateProduct(product.id, { stock: Math.max(0, product.stock + delta) });
  };

  const doRestock = async () => {
    if (!restocking || restockQty <= 0) {
      toast.error("পরিমাণ দিন");
      return;
    }
    setBusy(true);
    const nextStock = restocking.stock + restockQty;
    const result = await temp.updateProduct(restocking.id, { stock: nextStock });
    setBusy(false);
    if (result.ok) {
      toast.success(
        "স্টক যোগ হয়েছে",
        `${restocking.name} — নতুন স্টক ${toBnDigits(nextStock)} ${restocking.unit}`,
      );
      setRestocking(null);
      setRestockQty(0);
      setRestockNote("");
      router.refresh();
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const result = await temp.removeProduct(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) toast.success("পণ্য মুছে ফেলা হয়েছে");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* স্ট্যাট */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">মোট পণ্য</p>
            <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES.violet)}>
              <Boxes className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold tabular-nums">
            {toBnDigits(stats.total)}
          </p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">স্টক মূল্য</p>
            <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES.emerald)}>
              <Warehouse className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold tabular-nums">{fmtMoney(stats.value, { bn })}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">কম স্টক</p>
            <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES.amber)}>
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
            {toBnDigits(stats.low)}
          </p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">স্টক শেষ</p>
            <span className={cn("flex size-7 items-center justify-center rounded-lg", TONES.rose)}>
              <Package className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
            {toBnDigits(stats.out)}
          </p>
        </div>
      </div>

      {stats.value > 0 ? (
        <p className="rounded-2xl bg-sky-50 p-3 text-xs text-sky-800 dark:bg-sky-500/10 dark:text-sky-300">
          💰 এই স্টক বিক্রি হলে আনুমানিক{" "}
          <b>{fmtMoney(stats.retail - stats.value, { bn })}</b> লাভ হবে (বিক্রয় মূল্য{" "}
          {fmtMoney(stats.retail, { bn })})
        </p>
      ) : null}

      {/* ফিল্টার */}
      <Card className="space-y-3">
        <div className="flex gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="পণ্যের নাম বা ক্যাটাগরি দিয়ে খুঁজুন..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn btn-primary shrink-0 px-3.5"
          >
            <PackagePlus className="size-4" />
            <span className="hidden sm:inline">নতুন পণ্য</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="py-2 text-sm sm:max-w-xs"
          >
            <option value="">সব ক্যাটাগরি</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <div className="flex gap-1.5">
            {(
              [
                { value: "all", label: "সব" },
                { value: "low", label: "কম স্টক" },
                { value: "out", label: "শেষ" },
              ] as Array<{ value: StockFilter; label: string }>
            ).map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "chip border transition",
                  filter === f.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-[var(--border)] text-muted",
                )}
              >
                {f.label}
                {f.value === "low" && stats.low > 0 ? ` (${toBnDigits(stats.low)})` : ""}
                {f.value === "out" && stats.out > 0 ? ` (${toBnDigits(stats.out)})` : ""}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* তালিকা */}
      {list.length === 0 ? (
        <EmptyState
          icon={products.length === 0 ? <Package className="size-6" /> : <Search className="size-6" />}
          title={products.length === 0 ? "এখনো কোনো পণ্য নেই" : "কোনো পণ্য পাওয়া যায়নি"}
          description={
            products.length === 0
              ? "দোকানের পণ্য যোগ করে স্টকের হিসাব রাখুন — বিক্রির সময় স্টক নিজে কমে যাবে।"
              : "খোঁজা শব্দ বা ফিল্টার বদলে দেখুন।"
          }
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> পণ্য যোগ করুন
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {list.map((p) => {
            const isOut = p.stock <= 0;
            const isLow = !isOut && p.stock <= p.lowStockAt;
            const margin = p.sellPrice > 0 ? ((p.sellPrice - p.buyPrice) / p.sellPrice) * 100 : 0;
            return (
              <div
                key={p.id}
                className={cn("card p-3.5", p._pending && "opacity-60")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                      isOut ? TONES.rose : isLow ? TONES.amber : TONES.emerald,
                    )}
                  >
                    <Package className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-bold">{p.name}</p>
                      {isOut ? <Badge tone="rose">স্টক শেষ</Badge> : null}
                      {isLow ? <Badge tone="amber">কম স্টক</Badge> : null}
                    </div>
                    <p className="text-xs text-muted">
                      {p.category} • একক {p.unit} • লাভ {toBnDigits(margin.toFixed(0))}%
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1">
                        ক্রয় {fmtMoney(p.buyPrice, { bn })}
                      </span>
                      <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1 font-semibold">
                        বিক্রয় {fmtMoney(p.sellPrice, { bn })}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        <TrendingUp className="size-3" />
                        {fmtMoney(p.sellPrice - p.buyPrice, { bn })} লাভ
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-muted">স্টক</p>
                    <p
                      className={cn(
                        "text-lg font-extrabold tabular-nums",
                        isOut
                          ? "text-rose-600 dark:text-rose-400"
                          : isLow
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {toBnDigits(p.stock)}
                    </p>
                    <p className="text-[10px] text-muted">{p.unit}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => adjust(p, -1)}
                    className="rounded-xl border p-2 text-muted transition hover:bg-[var(--surface-2)]"
                    aria-label="কমান"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjust(p, 1)}
                    className="rounded-xl border p-2 text-muted transition hover:bg-[var(--surface-2)]"
                    aria-label="বাড়ান"
                  >
                    <Plus className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRestocking(p);
                      setRestockQty(0);
                    }}
                    className="btn btn-ghost px-2.5 py-1.5 text-xs"
                  >
                    <Warehouse className="size-3.5" /> মাল এসেছে
                  </button>
                  <div className="ml-auto flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      className="rounded-xl border p-2 text-muted transition hover:text-[var(--text)]"
                      aria-label="সম্পাদনা"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      className="rounded-xl border p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      aria-label="মুছুন"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "পণ্য সম্পাদনা" : "নতুন পণ্য"}
        description="দাম ও স্টক লিখে রাখুন — হিসাব নিজে হবে"
        size="md"
      >
        <ProductForm
          editing={editing}
          onDone={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={!!restocking}
        onClose={() => setRestocking(null)}
        title="নতুন মাল এসেছে"
        description={restocking ? `${restocking.name} — বর্তমান স্টক ${toBnDigits(restocking.stock)} ${restocking.unit}` : ""}
        size="sm"
      >
        <div className="space-y-3">
          <Field label="কতটা এসেছে?" required>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={restockQty || ""}
                onChange={(e) => setRestockQty(Number(e.target.value))}
                className="input-base text-lg font-bold tabular-nums"
                placeholder="০"
              />
              <span className="text-sm font-semibold text-muted">{restocking?.unit}</span>
            </div>
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[1, 5, 10, 20, 50].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setRestockQty(q)}
                className="chip border border-[var(--border)] text-muted"
              >
                +{toBnDigits(q)}
              </button>
            ))}
          </div>
          {restockQty > 0 ? (
            <p className="rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              নতুন স্টক হবে {toBnDigits((restocking?.stock ?? 0) + restockQty)}{" "}
              {restocking?.unit}
            </p>
          ) : null}
          <Field label="নোট (ঐচ্ছিক)" hint="যেমন: ৫ বস্তা চাল এসেছে">
            <input
              value={restockNote}
              onChange={(e) => setRestockNote(e.target.value)}
              className="input-base"
              placeholder="নোট লিখুন"
            />
          </Field>
          <button type="button" disabled={busy} onClick={doRestock} className="btn btn-primary w-full py-3">
            {busy ? "সংরক্ষণ হচ্ছে..." : "স্টক যোগ করুন"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`${deleting?.name} মুছে ফেলবেন?`}
        message="পণ্যটি মুছে গেলে পুরনো লেনদেনের হিসাব থাকবে, তবে স্টক ট্র্যাকিং বন্ধ হবে।"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
