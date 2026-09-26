"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
import { Avatar, Badge, Card, EmptyState, SectionHeader } from "@/components/ui/bits";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/fields";
import { SupplierForm, SupplierTxnForm } from "@/components/forms/supplier-form";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtDateShort, fmtMoney, prettyPhone, toBnDigits, toIntlPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SupplierLite } from "@/lib/types";

export function SuppliersClient() {
  const { suppliers, bn, temp } = useStore();
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierLite | null>(null);
  const [deleting, setDeleting] = useState<SupplierLite | null>(null);
  const [txnFor, setTxnFor] = useState<SupplierLite | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers
      .filter((s) =>
        q ? [s.name, s.phone, s.address].some((v) => v?.toLowerCase().includes(q)) : true,
      )
      .sort((a, b) => (b.payable ?? 0) - (a.payable ?? 0));
  }, [suppliers, query]);

  const totals = useMemo(
    () => ({
      payable: suppliers.reduce((s, x) => s + Math.max(0, x.payable ?? 0), 0),
      purchase: suppliers.reduce((s, x) => s + (x.totalPurchase ?? 0), 0),
      payment: suppliers.reduce((s, x) => s + (x.totalPayment ?? 0), 0),
    }),
    [suppliers],
  );

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const result = await temp.removeSupplier(deleting.id);
    setBusy(false);
    setDeleting(null);
    if (result.ok) {
      toast.success("সাপ্লায়ার মুছে ফেলা হয়েছে");
      router.refresh();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">মোট পাওনা</p>
          <p className="text-lg font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
            {fmtMoney(totals.payable, { bn })}
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">এই মাসে কেনা</p>
          <p className="text-lg font-extrabold tabular-nums">{fmtMoney(totals.purchase, { bn })}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-muted">মোট পরিশোধ</p>
          <p className="text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmtMoney(totals.payment, { bn })}
          </p>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="সাপ্লায়ারের নাম বা নম্বর..."
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
            <Plus className="size-4" />
            <span className="hidden sm:inline">নতুন সাপ্লায়ার</span>
          </button>
        </div>
      </Card>

      {list.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-6" />}
          title={suppliers.length === 0 ? "কোনো সাপ্লায়ার নেই" : "কিছু পাওয়া যায়নি"}
          description={
            suppliers.length === 0
              ? "যাদের কাছ থেকে মাল কেনেন তাদের যোগ করে পাওনার হিসাব রাখুন।"
              : "অন্য নাম দিয়ে খুঁজে দেখুন।"
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
              <Plus className="size-4" /> সাপ্লায়ার যোগ করুন
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {list.map((s) => (
            <Card key={s.id} className={cn("p-3.5", s._pending && "opacity-60")}>
              <div className="flex items-start gap-3">
                <Avatar name={s.name} color="sky" size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{s.name}</p>
                  <p className="truncate text-xs text-muted">
                    {prettyPhone(s.phone, bn)}
                    {s.address ? ` • ${s.address}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1">
                      কেনা {fmtMoney(s.totalPurchase ?? 0, { bn })}
                    </span>
                    <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1">
                      পরিশোধ {fmtMoney(s.totalPayment ?? 0, { bn })}
                    </span>
                    {s.lastActivity ? (
                      <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1">
                        শেষ লেনদেন {fmtDateShort(s.lastActivity, bn)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold text-muted">আমাদের দেনা</p>
                  <p
                    className={cn(
                      "text-lg font-extrabold tabular-nums",
                      (s.payable ?? 0) > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {fmtMoney(s.payable ?? 0, { bn })}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setTxnFor(s)}
                  className="btn btn-ghost px-2.5 py-1.5 text-xs"
                >
                  <ArrowUpRight className="size-3.5" /> মাল কেনা
                </button>
                <button
                  type="button"
                  onClick={() => setTxnFor(s)}
                  className="btn btn-ghost px-2.5 py-1.5 text-xs"
                >
                  <ArrowDownLeft className="size-3.5" /> টাকা পরিশোধ
                </button>
                {s.phone ? (
                  <a href={`tel:${toIntlPhone(s.phone)}`} className="btn btn-ghost px-2.5 py-1.5 text-xs">
                    <Phone className="size-3.5" /> কল
                  </a>
                ) : null}
                <div className="ml-auto flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(s);
                      setFormOpen(true);
                    }}
                    className="rounded-xl border p-2 text-muted transition hover:text-[var(--text)]"
                    aria-label="সম্পাদনা"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(s)}
                    className="rounded-xl border p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    aria-label="মুছুন"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-sky-50 dark:bg-sky-500/10">
        <SectionHeader
          title="স্মার্ট মনে রাখা"
          subtitle="সাপ্লায়ারের পাওনা ঠিক সময়ে পরিশোধ করলে ভালো দাম ও অগ্রাধিকার পাওয়া যায়"
          icon={<BadgeDollarSign className="size-4" />}
        />
        <p className="text-xs leading-relaxed text-muted">
          মোট {toBnDigits(suppliers.length)} জন সাপ্লায়ারের কাছে আপনার পাওনা{" "}
          <b>{fmtMoney(totals.payable, { bn })}</b>। এই মাসে মাল কেনা হয়েছে{" "}
          <b>{fmtMoney(totals.purchase, { bn })}</b> এবং পরিশোধ করেছেন{" "}
          <b>{fmtMoney(totals.payment, { bn })}</b>।
        </p>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "সাপ্লায়ার সম্পাদনা" : "নতুন সাপ্লায়ার"}
        size="md"
      >
        <SupplierForm
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
        open={!!txnFor}
        onClose={() => setTxnFor(null)}
        title="সাপ্লায়ারের লেনদেন"
        description="মাল কেনা বা টাকা পরিশোধ লিখুন"
        size="md"
      >
        {txnFor ? (
          <SupplierTxnForm
            supplier={txnFor}
            onDone={() => {
              setTxnFor(null);
              router.refresh();
            }}
            onCancel={() => setTxnFor(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`${deleting?.name} মুছে ফেলবেন?`}
        message="এই সাপ্লায়ারের সব কেনা-বেচার হিসাব মুছে যাবে।"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
