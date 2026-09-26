"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/providers/theme";
import {
  OFFLINE_SAVED_MESSAGE,
  REQUEST_SYNC_EVENT,
  enqueue,
  isNetworkFailure,
  isQueued,
  isTmpId,
  loadQueue,
  notifyQueueChange,
  notifySyncState,
  removeFromQueue,
  removeTempFromQueue,
  rewriteQueuedCustomerRefs,
  setLastSyncAt,
  updateQueuedInput,
} from "@/lib/offline-queue";
import { toBnDigits } from "@/lib/format";
import type {
  ActivityLite,
  CustomerLite,
  ExpenseLite,
  NoteLite,
  ProductLite,
  ReminderLite,
  SupplierLite,
  TxnLite,
  UserLite,
} from "@/lib/types";
import { round2, signedDue } from "@/lib/calc";

type StoreState = {
  user: UserLite;
  customers: CustomerLite[];
  products: ProductLite[];
  transactions: TxnLite[];
  activities: ActivityLite[];
  notes: NoteLite[];
  expenses: ExpenseLite[];
  suppliers: SupplierLite[];
  reminders: ReminderLite[];
};

type MutationResult<T> =
  | { ok: true; data: T; queued?: boolean }
  | { ok: false; error: string; offline?: boolean };

type StoreValue = StoreState & {
  /** বাংলা সংখ্যা দেখানো হবে কি না */
  bn: boolean;
  syncing: boolean;
  refresh: () => void;
  /** অফলাইন কিউ-তে জমা এন্ট্রি এখনই সার্ভারে পাঠানোর চেষ্টা */
  syncOffline: () => Promise<void>;
  dueOf: (customerId: string) => number;
  ledgerOf: (customerId: string) => Array<TxnLite & { delta: number; balance: number }>;
  temp: {
    addCustomer: (input: Partial<CustomerLite> & { name: string }) => Promise<MutationResult<CustomerLite>>;
    updateCustomer: (id: string, input: Partial<CustomerLite>) => Promise<MutationResult<CustomerLite>>;
    removeCustomer: (id: string) => Promise<MutationResult<{ id: string }>>;
    addTransaction: (input: TransactionInputT) => Promise<MutationResult<TxnLite>>;
    updateTransaction: (id: string, input: TransactionInputT) => Promise<MutationResult<TxnLite>>;
    removeTransaction: (id: string) => Promise<MutationResult<{ id: string }>>;
    addProduct: (input: Partial<ProductLite> & { name: string }) => Promise<MutationResult<ProductLite>>;
    updateProduct: (id: string, input: Partial<ProductLite>) => Promise<MutationResult<ProductLite>>;
    removeProduct: (id: string) => Promise<MutationResult<{ id: string }>>;
    addExpense: (input: Partial<ExpenseLite> & { amount: number; date: string }) => Promise<MutationResult<ExpenseLite>>;
    updateExpense: (id: string, input: Partial<ExpenseLite>) => Promise<MutationResult<ExpenseLite>>;
    removeExpense: (id: string) => Promise<MutationResult<{ id: string }>>;
    addSupplier: (input: Partial<SupplierLite> & { name: string }) => Promise<MutationResult<SupplierLite>>;
    updateSupplier: (id: string, input: Partial<SupplierLite>) => Promise<MutationResult<SupplierLite>>;
    removeSupplier: (id: string) => Promise<MutationResult<{ id: string }>>;
    addSupplierTxn: (supplierId: string, input: { type: string; amount: number; note?: string | null; date: string }) => Promise<MutationResult<{ id: string }>>;
    addNote: (input: Partial<NoteLite> & { title: string }) => Promise<MutationResult<NoteLite>>;
    updateNote: (id: string, input: Partial<NoteLite>) => Promise<MutationResult<NoteLite>>;
    removeNote: (id: string) => Promise<MutationResult<{ id: string }>>;
    addReminder: (input: Partial<ReminderLite> & { customerId: string }) => Promise<MutationResult<ReminderLite>>;
    updateSettings: (input: Partial<UserLite>) => Promise<MutationResult<UserLite>>;
    resetDemo: () => Promise<MutationResult<{ success: boolean }>>;
  };
};

export type TransactionInputT = {
  customerId: string | null;
  type: string;
  amount: number;
  discount?: number;
  note?: string | null;
  date: string;
  method?: string | null;
  items?: Array<{
    productId?: string | null;
    name: string;
    unit?: string | null;
    qty: number;
    unitPrice: number;
  }>;
  adjustStock?: boolean;
};

const StoreContext = createContext<StoreValue | null>(null);

const tempId = () => `tmp_${Math.random().toString(36).slice(2, 10)}`;

export function StoreProvider({
  initial,
  children,
}: {
  initial: StoreState;
  children: ReactNode;
}) {
  const [state, setState] = useState<StoreState>(initial);
  const [syncing, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const { setTheme } = useTheme();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  /* ------------------------------------------------------- helpers */

  const request = useCallback(
    async <T,>(
      url: string,
      options: RequestInit & { method: string; silentOffline?: boolean },
    ): Promise<MutationResult<T>> => {
      const { silentOffline, ...init } = options;
      try {
        const res = await fetch(url, {
          headers: { "Content-Type": "application/json" },
          ...init,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            (payload as { error?: string })?.error ?? "কিছু একটা ভুল হয়েছে";
          toast.error(message);
          return { ok: false, error: message };
        }
        return { ok: true, data: payload as T };
      } catch (error) {
        const message = "ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না";
        // অফলাইন-সচেতন মিউটেশন (কাস্টমার/লেনদেন) নিজেরাই বার্তা দেখায়
        if (silentOffline && isNetworkFailure(error)) {
          return { ok: false, error: message, offline: true };
        }
        toast.error(message);
        return { ok: false, error: message, offline: isNetworkFailure(error) };
      }
    },
    [toast],
  );

  const patchState = useCallback((patch: Partial<StoreState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  /** সার্ভার থেকে নতুন ডেটা এনে স্টেট মিলিয়ে নেয় (অপটিমিস্টিক ত্রুটি হলে) */
  const resync = useCallback(async () => {
    // কিউ-তে অফলাইন এন্ট্রি থাকলে সার্ভার ডেটা দিয়ে স্টেট মুছে ফেলা যাবে না —
    // তাহলে স্ক্রিন থেকে সিঙ্ক-না-হওয়া এন্ট্রি হারিয়ে যেত
    if (loadQueue().length > 0) return;
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<StoreState>;
      setState((prev) => ({ ...prev, ...data }));
    } catch {
      /* চুপচাপ */
    }
  }, []);

  /* ------------------------------------------------------- লেনদেন হিসাব */

  const adjustCustomerDue = useCallback(
    (customerId: string | null, delta: number) => {
      if (!customerId) return;
      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                due: round2(c.due + delta),
                txnCount: c.txnCount + (delta === 0 ? 0 : 1),
                lastActivityAt: new Date().toISOString(),
              }
            : c,
        ),
      }));
    },
    [],
  );

  const adjustStock = useCallback(
    (items: TransactionInputT["items"], direction: 1 | -1) => {
      if (!items?.length) return;
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => {
          const line = items.find((it) => it.productId === p.id);
          if (!line) return p;
          return { ...p, stock: round2(p.stock + direction * line.qty) };
        }),
      }));
    },
    [],
  );

  /* ------------------------------------------------------- কাস্টমার */

  const addCustomer: StoreValue["temp"]["addCustomer"] = useCallback(
    async (input) => {
      const optimistic: CustomerLite = {
        id: tempId(),
        name: input.name,
        phone: input.phone ?? null,
        address: input.address ?? null,
        note: input.note ?? null,
        tag: input.tag ?? "নিয়মিত",
        color: input.color ?? "emerald",
        openingBalance: input.openingBalance ?? 0,
        creditLimit: input.creditLimit ?? null,
        isActive: input.isActive ?? true,
        createdAt: new Date().toISOString(),
        due: input.openingBalance ?? 0,
        totalSale: 0,
        totalPaid: 0,
        lastActivityAt: null,
        txnCount: 0,
        _pending: true,
      };
      setState((prev) => ({ ...prev, customers: [...prev.customers, optimistic] }));

      // নেট নেই → localStorage কিউ-তে জমা রেখে অপটিমিস্টিক এন্ট্রি স্ক্রিনে রাখো
      const saveOffline = () => {
        setState((prev) => ({
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === optimistic.id ? { ...c, _offline: true } : c,
          ),
          activities: [
            {
              id: tempId(),
              action: "create",
              entity: "customer",
              entityId: optimistic.id,
              title: `নতুন কাস্টমার যোগ করা হয়েছে — ${optimistic.name}`,
              detail: optimistic.phone,
              amount: optimistic.openingBalance || null,
              createdAt: new Date().toISOString(),
            },
            ...prev.activities,
          ].slice(0, 40),
        }));
        enqueue({
          kind: "customer",
          tempId: optimistic.id,
          input: input as unknown as Record<string, unknown>,
          label: `নতুন কাস্টমার — ${optimistic.name}`,
        });
        toast.info(OFFLINE_SAVED_MESSAGE, "নেট ফিরলে নিজে থেকে সার্ভারে জমা হবে");
        return {
          ok: true as const,
          data: { ...optimistic, _offline: true },
          queued: true as const,
        };
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) return saveOffline();

      const result = await request<{ customer: CustomerLite }>("/api/customers", {
        method: "POST",
        silentOffline: true,
        body: JSON.stringify(input),
      });

      if (!result.ok) {
        if (result.offline) return saveOffline();
        setState((prev) => ({
          ...prev,
          customers: prev.customers.filter((c) => c.id !== optimistic.id),
        }));
        return result;
      }

      const saved = result.data.customer;
      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === optimistic.id
            ? {
                ...c,
                ...saved,
                due: saved.openingBalance,
                totalSale: 0,
                totalPaid: 0,
                lastActivityAt: null,
                txnCount: 0,
                _pending: false,
              }
            : c,
        ),
        activities: [
          {
            id: tempId(),
            action: "create",
            entity: "customer",
            entityId: saved.id,
            title: `নতুন কাস্টমার যোগ করা হয়েছে — ${saved.name}`,
            detail: saved.phone,
            amount: saved.openingBalance || null,
            createdAt: new Date().toISOString(),
          },
          ...prev.activities,
        ].slice(0, 40),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh, toast],
  );

  const updateCustomer: StoreValue["temp"]["updateCustomer"] = useCallback(
    async (id, input) => {
      let snapshot: CustomerLite | undefined;
      setState((prev) => {
        snapshot = prev.customers.find((c) => c.id === id);
        return {
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...input,
                  due:
                    input.openingBalance !== undefined
                      ? round2(
                          input.openingBalance +
                            c.totalSale -
                            c.totalPaid -
                            (c.totalDiscount ?? 0),
                        )
                      : c.due,
                  _pending: true,
                }
              : c,
          ),
        };
      });

      // এখনো সিঙ্ক হয়নি এমন অফলাইন এন্ট্রি এডিট হলে কিউ-এর ইনপুটই বদলে যায়,
      // যাতে সিঙ্কের সময় নতুন তথ্যটাই সার্ভারে যায়
      if (isTmpId(id) && isQueued(id)) {
        updateQueuedInput(id, "customer", input as Record<string, unknown>);
        setState((prev) => ({
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === id ? { ...c, _pending: true, _offline: true } : c,
          ),
        }));
        toast.info("অফলাইন এন্ট্রি আপডেট হয়েছে", "সিঙ্কের সময় নতুন তথ্যটাই যাবে");
        return { ok: true, data: { ...snapshot, ...input } as CustomerLite };
      }

      const result = await request<{ customer: CustomerLite }>(
        `/api/customers/${id}`,
        { method: "PATCH", body: JSON.stringify(input) },
      );

      if (!result.ok) {
        if (snapshot) {
          const restore = snapshot;
          setState((prev) => ({
            ...prev,
            customers: prev.customers.map((c) => (c.id === id ? restore : c)),
          }));
        }
        return result;
      }

      const saved = result.data.customer;
      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === id ? { ...c, ...saved, _pending: false } : c,
        ),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh, toast],
  );

  const removeCustomer: StoreValue["temp"]["removeCustomer"] = useCallback(
    async (id) => {
      let snapshot: CustomerLite[] = [];
      let removedTxns: TxnLite[] = [];
      setState((prev) => {
        snapshot = prev.customers;
        removedTxns = prev.transactions.filter((t) => t.customerId === id);
        return {
          ...prev,
          customers: prev.customers.filter((c) => c.id !== id),
          transactions: prev.transactions.filter((t) => t.customerId !== id),
        };
      });

      // সার্ভারে যায়নি এমন অফলাইন কাস্টমার — কিউ থেকে মুছলেই হলো
      if (isTmpId(id)) {
        removeTempFromQueue(id);
        // ওই কাস্টমারের জন্য লেখা অফলাইন লেনদেনগুলোও কিউ + স্ক্রিন থেকে বাদ
        for (const q of loadQueue()) {
          if (q.kind === "transaction" && q.input.customerId === id) {
            removeFromQueue(q.qid);
          }
        }
        setState((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.customerId !== id),
        }));
        toast.info("অফলাইন এন্ট্রি মুছে ফেলা হয়েছে");
        refresh();
        return { ok: true, data: { id } };
      }

      const result = await request<{ success: boolean }>(`/api/customers/${id}`, {
        method: "DELETE",
      });

      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          customers: snapshot,
          transactions: [...removedTxns, ...prev.transactions].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
        }));
        return result;
      }

      refresh();
      return { ok: true, data: { id } };
    },
    [request, refresh, toast],
  );

  /* ------------------------------------------------------- লেনদেন */

  const addTransaction: StoreValue["temp"]["addTransaction"] = useCallback(
    async (input) => {
      const customerRef = input.customerId
        ? state.customers.find((c) => c.id === input.customerId)
        : null;

      const optimistic: TxnLite = {
        id: tempId(),
        customerId: input.customerId,
        type: input.type,
        amount: input.amount,
        discount: input.discount ?? 0,
        note: input.note ?? null,
        date: new Date(`${input.date}T12:00:00`).toISOString(),
        method: input.method ?? null,
        createdAt: new Date().toISOString(),
        items: (input.items ?? []).map((it, i) => ({
          id: `tmp_item_${i}`,
          productId: it.productId ?? null,
          name: it.name,
          unit: it.unit ?? null,
          qty: it.qty,
          unitPrice: it.unitPrice,
        })),
        customer: customerRef
          ? { id: customerRef.id, name: customerRef.name, color: customerRef.color, tag: customerRef.tag }
          : null,
        _pending: true,
      };

      setState((prev) => ({
        ...prev,
        transactions: [optimistic, ...prev.transactions],
        activities: [
          {
            id: tempId(),
            action: "create",
            entity: "transaction",
            entityId: optimistic.id,
            title: describeTxn(optimistic),
            detail: optimistic.note,
            amount: optimistic.amount,
            createdAt: new Date().toISOString(),
          },
          ...prev.activities,
        ].slice(0, 40),
      }));
      adjustCustomerDue(input.customerId, signedDue(optimistic));
      if (input.adjustStock !== false && (input.type === "DUE" || input.type === "CASH_SALE")) {
        adjustStock(input.items, -1);
      }

      // নেট নেই → localStorage কিউ-তে জমা রেখে স্ক্রিনের হিসাব অটুট রাখো
      const saveOffline = () => {
        setState((prev) => ({
          ...prev,
          transactions: prev.transactions.map((t) =>
            t.id === optimistic.id ? { ...t, _offline: true } : t,
          ),
        }));
        enqueue({
          kind: "transaction",
          tempId: optimistic.id,
          input: input as unknown as Record<string, unknown>,
          label: describeTxn(optimistic),
        });
        toast.info(OFFLINE_SAVED_MESSAGE, "নেট ফিরলে নিজে থেকে সার্ভারে জমা হবে");
        return {
          ok: true as const,
          data: { ...optimistic, _offline: true },
          queued: true as const,
        };
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) return saveOffline();

      const result = await request<{ transaction: TxnLite }>("/api/transactions", {
        method: "POST",
        silentOffline: true,
        body: JSON.stringify(input),
      });

      if (!result.ok) {
        if (result.offline) return saveOffline();
        setState((prev) => {
          const failed = prev.transactions.find((t) => t.id === optimistic.id);
          return {
            ...prev,
            transactions: prev.transactions.filter((t) => t.id !== optimistic.id),
            activities: prev.activities.filter((a) => a.entityId !== optimistic.id),
            customers: prev.customers.map((c) =>
              c.id === input.customerId && failed
                ? {
                    ...c,
                    due: round2(c.due - signedDue(failed)),
                    txnCount: Math.max(0, c.txnCount - 1),
                  }
                : c,
            ),
          };
        });
        if (input.adjustStock !== false && (input.type === "DUE" || input.type === "CASH_SALE")) {
          adjustStock(input.items, 1);
        }
        return result;
      }

      const saved = result.data.transaction;
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === optimistic.id ? { ...t, ...saved, _pending: false } : t,
        ),
      }));
      resync();
      refresh();
      return { ok: true, data: saved };
    },
    [state.customers, request, adjustCustomerDue, adjustStock, refresh, resync, toast],
  );

  const updateTransaction: StoreValue["temp"]["updateTransaction"] = useCallback(
    async (id, input) => {
      let snapshot: TxnLite | undefined;
      setState((prev) => {
        snapshot = prev.transactions.find((t) => t.id === id);
        return {
          ...prev,
          transactions: prev.transactions.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...input,
                  items: input.items
                    ? input.items.map((it, i) => ({
                        id: `tmp_item_${i}`,
                        productId: it.productId ?? null,
                        name: it.name,
                        unit: it.unit ?? null,
                        qty: it.qty,
                        unitPrice: it.unitPrice,
                      }))
                    : t.items,
                  date: new Date(`${input.date}T12:00:00`).toISOString(),
                  _pending: true,
                }
              : t,
          ),
        };
      });

      const before = snapshot;
      // পুরনো প্রভাব বাতিল → নতুন প্রভাব প্রয়োগ
      if (before) {
        adjustCustomerDue(before.customerId, -signedDue(before));
        if (before.type === "DUE" || before.type === "CASH_SALE") {
          adjustStock(before.items, 1);
        }
      }
      adjustCustomerDue(input.customerId, signedDue(input));
      if (input.adjustStock !== false && (input.type === "DUE" || input.type === "CASH_SALE")) {
        adjustStock(input.items, -1);
      }

      // এখনো সিঙ্ক হয়নি এমন অফলাইন এন্ট্রি এডিট হলে কিউ-এর ইনপুটই বদলে যায়
      if (isTmpId(id) && isQueued(id)) {
        updateQueuedInput(id, "transaction", input as unknown as Record<string, unknown>);
        setState((prev) => ({
          ...prev,
          transactions: prev.transactions.map((t) =>
            t.id === id ? { ...t, _pending: true, _offline: true } : t,
          ),
        }));
        toast.info("অফলাইন এন্ট্রি আপডেট হয়েছে", "সিঙ্কের সময় নতুন তথ্যটাই যাবে");
        return { ok: true, data: { ...snapshot, ...input } as unknown as TxnLite };
      }

      const result = await request<{ transaction: TxnLite }>(
        `/api/transactions/${id}`,
        { method: "PATCH", body: JSON.stringify(input) },
      );

      if (!result.ok) {
        if (result.offline && snapshot) {
          // নেট নেই — resync করলে অন্য অফলাইন এন্ট্রি মুছে যেত, তাই নিখুঁত রোলব্যাক
          const restore = snapshot;
          setState((prev) => ({
            ...prev,
            transactions: prev.transactions.map((t) => (t.id === id ? restore : t)),
          }));
          adjustCustomerDue(input.customerId, -signedDue(input));
          if (input.adjustStock !== false && (input.type === "DUE" || input.type === "CASH_SALE")) {
            adjustStock(input.items, 1);
          }
          if (before) {
            adjustCustomerDue(before.customerId, signedDue(before));
            if (before.type === "DUE" || before.type === "CASH_SALE") {
              adjustStock(before.items, -1);
            }
          }
          return result;
        }
        await resync();
        return result;
      }
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === id ? { ...t, ...result.data.transaction, _pending: false } : t,
        ),
      }));
      resync();
      refresh();
      return { ok: true, data: result.data.transaction };
    },
    [request, adjustCustomerDue, adjustStock, refresh, resync, toast],
  );

  const removeTransaction: StoreValue["temp"]["removeTransaction"] = useCallback(
    async (id) => {
      let snapshot: TxnLite | undefined;
      setState((prev) => {
        snapshot = prev.transactions.find((t) => t.id === id);
        return {
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== id),
          activities: prev.activities.filter((a) => a.entityId !== id),
        };
      });

      const before = snapshot;
      if (before) {
        adjustCustomerDue(before.customerId, -signedDue(before));
        if (before.type === "DUE" || before.type === "CASH_SALE") {
          adjustStock(before.items, 1);
        }
      }

      // সার্ভারে যায়নি এমন অফলাইন লেনদেন — কিউ থেকে মুছলেই হলো
      if (isTmpId(id)) {
        removeTempFromQueue(id);
        toast.info("অফলাইন এন্ট্রি মুছে ফেলা হয়েছে");
        refresh();
        return { ok: true, data: { id } };
      }

      const result = await request<{ success: boolean }>(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!result.ok) {
        if (result.offline && before) {
          // নেট নেই — resync না করে নিখুঁত রোলব্যাক
          const restore = before;
          setState((prev) => ({
            ...prev,
            transactions: [restore, ...prev.transactions],
          }));
          adjustCustomerDue(restore.customerId, signedDue(restore));
          if (restore.type === "DUE" || restore.type === "CASH_SALE") {
            adjustStock(restore.items, -1);
          }
          return result;
        }
        await resync();
        return result;
      }
      refresh();
      return { ok: true, data: { id } };
    },
    [request, adjustCustomerDue, adjustStock, refresh, resync, toast],
  );

  /* ------------------------------------------------------- পণ্য */

  const addProduct: StoreValue["temp"]["addProduct"] = useCallback(
    async (input) => {
      const optimistic: ProductLite = {
        id: tempId(),
        name: input.name,
        category: input.category ?? "মুদি",
        unit: input.unit ?? "পিস",
        sellPrice: input.sellPrice ?? 0,
        buyPrice: input.buyPrice ?? 0,
        stock: input.stock ?? 0,
        lowStockAt: input.lowStockAt ?? 5,
        isActive: true,
        _pending: true,
      };
      setState((prev) => ({ ...prev, products: [...prev.products, optimistic] }));

      const result = await request<{ product: ProductLite }>("/api/products", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          products: prev.products.filter((p) => p.id !== optimistic.id),
        }));
        return result;
      }
      const saved = result.data.product;
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === optimistic.id ? { ...saved, _pending: false } : p,
        ),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh],
  );

  const updateProduct: StoreValue["temp"]["updateProduct"] = useCallback(
    async (id, input) => {
      let snapshot: ProductLite | undefined;
      setState((prev) => {
        snapshot = prev.products.find((p) => p.id === id);
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === id ? { ...p, ...input, _pending: true } : p,
          ),
        };
      });

      const result = await request<{ product: ProductLite }>(`/api/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        if (snapshot) {
          const restore = snapshot;
          setState((prev) => ({
            ...prev,
            products: prev.products.map((p) => (p.id === id ? restore : p)),
          }));
        }
        return result;
      }
      const saved = result.data.product;
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === id ? { ...saved, _pending: false } : p,
        ),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh],
  );

  const removeProduct: StoreValue["temp"]["removeProduct"] = useCallback(
    async (id) => {
      let snapshot: ProductLite[] = [];
      setState((prev) => {
        snapshot = prev.products;
        return { ...prev, products: prev.products.filter((p) => p.id !== id) };
      });
      const result = await request<{ success: boolean }>(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!result.ok) {
        setState((prev) => ({ ...prev, products: snapshot }));
        return result;
      }
      refresh();
      return { ok: true, data: { id } };
    },
    [request, refresh],
  );

  /* ------------------------------------------------------- খরচ */

  const addExpense: StoreValue["temp"]["addExpense"] = useCallback(
    async (input) => {
      const optimistic: ExpenseLite = {
        id: tempId(),
        category: input.category ?? "অন্যান্য",
        amount: input.amount,
        note: input.note ?? null,
        paidTo: input.paidTo ?? null,
        method: input.method ?? "নগদ",
        date: new Date(`${input.date}T12:00:00`).toISOString(),
        _pending: true,
      };
      setState((prev) => ({ ...prev, expenses: [optimistic, ...prev.expenses] }));

      const result = await request<{ expense: ExpenseLite }>("/api/expenses", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          expenses: prev.expenses.filter((e) => e.id !== optimistic.id),
        }));
        return result;
      }
      const saved = result.data.expense;
      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === optimistic.id ? { ...saved, _pending: false } : e,
        ),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh],
  );

  const updateExpense: StoreValue["temp"]["updateExpense"] = useCallback(
    async (id, input) => {
      let snapshot: ExpenseLite | undefined;
      setState((prev) => {
        snapshot = prev.expenses.find((e) => e.id === id);
        return {
          ...prev,
          expenses: prev.expenses.map((e) =>
            e.id === id ? { ...e, ...input, _pending: true } : e,
          ),
        };
      });
      const result = await request<{ expense: ExpenseLite }>(`/api/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        if (snapshot) {
          const restore = snapshot;
          setState((prev) => ({
            ...prev,
            expenses: prev.expenses.map((e) => (e.id === id ? restore : e)),
          }));
        }
        return result;
      }
      const saved = result.data.expense;
      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === id ? { ...saved, _pending: false } : e,
        ),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh],
  );

  const removeExpense: StoreValue["temp"]["removeExpense"] = useCallback(
    async (id) => {
      let snapshot: ExpenseLite[] = [];
      setState((prev) => {
        snapshot = prev.expenses;
        return { ...prev, expenses: prev.expenses.filter((e) => e.id !== id) };
      });
      const result = await request<{ success: boolean }>(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      if (!result.ok) {
        setState((prev) => ({ ...prev, expenses: snapshot }));
        return result;
      }
      refresh();
      return { ok: true, data: { id } };
    },
    [request, refresh],
  );

  /* ------------------------------------------------------- সাপ্লায়ার */

  const addSupplier: StoreValue["temp"]["addSupplier"] = useCallback(
    async (input) => {
      const optimistic: SupplierLite = {
        id: tempId(),
        name: input.name,
        phone: input.phone ?? null,
        address: input.address ?? null,
        note: input.note ?? null,
        openingBalance: input.openingBalance ?? 0,
        isActive: input.isActive ?? true,
        payable: input.openingBalance ?? 0,
        totalPurchase: 0,
        totalPayment: 0,
        _pending: true,
      };
      setState((prev) => ({ ...prev, suppliers: [...prev.suppliers, optimistic] }));
      const result = await request<{ supplier: SupplierLite }>("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          suppliers: prev.suppliers.filter((s) => s.id !== optimistic.id),
        }));
        return result;
      }
      const saved = result.data.supplier;
      setState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((s) =>
          s.id === optimistic.id ? { ...optimistic, ...saved, _pending: false } : s,
        ),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh],
  );

  const updateSupplier: StoreValue["temp"]["updateSupplier"] = useCallback(
    async (id, input) => {
      let snapshot: SupplierLite | undefined;
      setState((prev) => {
        snapshot = prev.suppliers.find((s) => s.id === id);
        return {
          ...prev,
          suppliers: prev.suppliers.map((s) =>
            s.id === id ? { ...s, ...input, _pending: true } : s,
          ),
        };
      });
      const result = await request<{ supplier: SupplierLite }>(`/api/suppliers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        if (snapshot) {
          const restore = snapshot;
          setState((prev) => ({
            ...prev,
            suppliers: prev.suppliers.map((s) => (s.id === id ? restore : s)),
          }));
        }
        return result;
      }
      const saved = result.data.supplier;
      setState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((s) =>
          s.id === id ? { ...s, ...saved, _pending: false } : s,
        ),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh],
  );

  const removeSupplier: StoreValue["temp"]["removeSupplier"] = useCallback(
    async (id) => {
      let snapshot: SupplierLite[] = [];
      setState((prev) => {
        snapshot = prev.suppliers;
        return { ...prev, suppliers: prev.suppliers.filter((s) => s.id !== id) };
      });
      const result = await request<{ success: boolean }>(`/api/suppliers/${id}`, {
        method: "DELETE",
      });
      if (!result.ok) {
        setState((prev) => ({ ...prev, suppliers: snapshot }));
        return result;
      }
      refresh();
      return { ok: true, data: { id } };
    },
    [request, refresh],
  );

  const addSupplierTxn: StoreValue["temp"]["addSupplierTxn"] = useCallback(
    async (supplierId, input) => {
      setState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((s) =>
          s.id === supplierId
            ? {
                ...s,
                payable: round2(
                  (s.payable ?? 0) +
                    (input.type === "PURCHASE" ? input.amount : -input.amount),
                ),
                totalPurchase: round2(
                  (s.totalPurchase ?? 0) +
                    (input.type === "PURCHASE" ? input.amount : 0),
                ),
                totalPayment: round2(
                  (s.totalPayment ?? 0) + (input.type === "PAYMENT" ? input.amount : 0),
                ),
                lastActivity: new Date().toISOString(),
              }
            : s,
        ),
      }));
      const result = await request<{ transaction: { id: string } }>(
        `/api/suppliers/${supplierId}`,
        { method: "POST", body: JSON.stringify(input) },
      );
      if (!result.ok) {
        await resync();
        return result;
      }
      refresh();
      return { ok: true, data: result.data.transaction };
    },
    [request, refresh, resync],
  );

  /* ------------------------------------------------------- নোটবুক */

  const addNote: StoreValue["temp"]["addNote"] = useCallback(
    async (input) => {
      const optimistic: NoteLite = {
        id: tempId(),
        title: input.title,
        body: input.body ?? "",
        color: input.color ?? "amber",
        pinned: input.pinned ?? false,
        tags: input.tags ?? null,
        updatedAt: new Date().toISOString(),
        _pending: true,
      };
      setState((prev) => ({ ...prev, notes: [optimistic, ...prev.notes] }));
      const result = await request<{ note: NoteLite }>("/api/notes", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          notes: prev.notes.filter((n) => n.id !== optimistic.id),
        }));
        return result;
      }
      const saved = result.data.note;
      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === optimistic.id ? { ...saved, _pending: false } : n,
        ),
      }));
      return { ok: true, data: saved };
    },
    [request],
  );

  const updateNote: StoreValue["temp"]["updateNote"] = useCallback(
    async (id, input) => {
      let snapshot: NoteLite | undefined;
      setState((prev) => {
        snapshot = prev.notes.find((n) => n.id === id);
        return {
          ...prev,
          notes: prev.notes.map((n) =>
            n.id === id
              ? { ...n, ...input, updatedAt: new Date().toISOString(), _pending: true }
              : n,
          ),
        };
      });
      const result = await request<{ note: NoteLite }>(`/api/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        if (snapshot) {
          const restore = snapshot;
          setState((prev) => ({
            ...prev,
            notes: prev.notes.map((n) => (n.id === id ? restore : n)),
          }));
        }
        return result;
      }
      const saved = result.data.note;
      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => (n.id === id ? { ...saved, _pending: false } : n)),
      }));
      return { ok: true, data: saved };
    },
    [request],
  );

  const removeNote: StoreValue["temp"]["removeNote"] = useCallback(
    async (id) => {
      let snapshot: NoteLite[] = [];
      setState((prev) => {
        snapshot = prev.notes;
        return { ...prev, notes: prev.notes.filter((n) => n.id !== id) };
      });
      const result = await request<{ success: boolean }>(`/api/notes/${id}`, {
        method: "DELETE",
      });
      if (!result.ok) {
        setState((prev) => ({ ...prev, notes: snapshot }));
        return result;
      }
      return { ok: true, data: { id } };
    },
    [request],
  );

  /* ------------------------------------------------------- তাগাদা ও সেটিংস */

  const addReminder: StoreValue["temp"]["addReminder"] = useCallback(
    async (input) => {
      const customer = state.customers.find((c) => c.id === input.customerId);
      const optimistic: ReminderLite = {
        id: tempId(),
        customerId: input.customerId,
        channel: input.channel ?? "whatsapp",
        message: input.message ?? null,
        amount: input.amount ?? 0,
        status: input.status ?? "sent",
        createdAt: new Date().toISOString(),
        customer: customer
          ? { id: customer.id, name: customer.name, color: customer.color }
          : null,
        _pending: true,
      };
      setState((prev) => ({ ...prev, reminders: [optimistic, ...prev.reminders] }));
      const result = await request<{ reminder: ReminderLite }>("/api/reminders", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          reminders: prev.reminders.filter((r) => r.id !== optimistic.id),
        }));
        return result;
      }
      const saved = result.data.reminder;
      setState((prev) => ({
        ...prev,
        reminders: prev.reminders.map((r) =>
          r.id === optimistic.id
            ? { ...optimistic, ...saved, customer: optimistic.customer, _pending: false }
            : r,
        ),
      }));
      refresh();
      return { ok: true, data: saved };
    },
    [request, refresh, state.customers],
  );

  const updateSettings: StoreValue["temp"]["updateSettings"] = useCallback(
    async (input) => {
      setState((prev) => ({ ...prev, user: { ...prev.user, ...input } }));
      if (input.theme) setTheme(input.theme as "light" | "dark" | "system");
      const result = await request<{ user: UserLite }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      if (!result.ok) {
        await resync();
        return result;
      }
      setState((prev) => ({ ...prev, user: { ...prev.user, ...result.data.user } }));
      refresh();
      return { ok: true, data: result.data.user };
    },
    [request, refresh, resync, setTheme],
  );

  const resetDemo: StoreValue["temp"]["resetDemo"] = useCallback(async () => {
    const result = await request<{ success: boolean }>("/api/demo/reset", {
      method: "POST",
    });
    if (result.ok) {
      await resync();
      refresh();
    }
    return result;
  }, [request, refresh, resync]);

  /* ------------------------------------------------------- অফলাইন সিঙ্ক */

  const syncingRef = useRef(false);

  /**
   * কিউ-তে জমা বাকি/জমা/কাস্টমার এন্ট্রি ক্রমানুসারে সার্ভারে পাঠায়।
   * সফল হলে স্ক্রিনের অস্থায়ী tmp_ আইডি সার্ভারের আসল আইডিতে বদলে যায়।
   */
  const syncOfflineQueue = useCallback(async () => {
    if (syncingRef.current) return;
    if (typeof window === "undefined") return;
    if (loadQueue().length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    syncingRef.current = true;
    notifySyncState(true);
    // এই রাউন্ডে tmp_ → আসল আইডির ম্যাপ (লেনদেনের customerId মেলাতে লাগে)
    const idMap = new Map<string, string>();
    let synced = 0;
    let failed = 0;
    try {
      try {
        const pong = await fetch("/api/ping", { cache: "no-store" });
        if (!pong.ok) return;
      } catch {
        return; // এখনো নেট নেই — পরে আবার চেষ্টা হবে
      }

      for (const op of loadQueue()) {
        try {
          if (op.kind === "customer") {
            const res = await fetch("/api/customers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(op.input),
            });
            if (!res.ok) {
              // সার্ভার/লগইন সমস্যা হলে বাকিটা পরে — কিউ অটুট থাকবে
              if (res.status >= 500 || res.status === 401 || res.status === 429) return;
              // ভ্যালিডেশন এরর — আটকে রাখলে কিউ জ্যাম হবে, তাই বাদ
              failed += 1;
              removeFromQueue(op.qid);
              setState((prev) => ({
                ...prev,
                customers: prev.customers.map((c) =>
                  c.id === op.tempId ? { ...c, _pending: false, _offline: false } : c,
                ),
              }));
              continue;
            }
            const payload = (await res.json()) as { customer: CustomerLite };
            const saved = payload.customer;
            idMap.set(op.tempId, saved.id);
            rewriteQueuedCustomerRefs(op.tempId, saved.id);
            setState((prev) => ({
              ...prev,
              customers: prev.customers.map((c) =>
                c.id === op.tempId
                  ? {
                      ...c,
                      ...saved,
                      // সার্ভার ব্যালেন্স ছাড়া ফেরত দেয় — স্ক্রিনের চলমান হিসাব রাখো
                      due: c.due,
                      totalSale: c.totalSale,
                      totalPaid: c.totalPaid,
                      txnCount: c.txnCount,
                      lastActivityAt: c.lastActivityAt,
                      _pending: false,
                      _offline: false,
                    }
                  : c,
              ),
              // ওই কাস্টমারের অফলাইন লেনদেনগুলোর customerId-ও আসল আইডিতে বদলাও
              transactions: prev.transactions.map((t) =>
                t.customerId === op.tempId
                  ? {
                      ...t,
                      customerId: saved.id,
                      customer: {
                        id: saved.id,
                        name: saved.name,
                        color: saved.color,
                        tag: saved.tag,
                      },
                    }
                  : t,
              ),
              activities: prev.activities.map((a) =>
                a.entityId === op.tempId ? { ...a, entityId: saved.id } : a,
              ),
            }));
            removeFromQueue(op.qid);
            synced += 1;
          } else {
            const input = { ...(op.input as unknown as TransactionInputT) };
            const cid = input.customerId;
            if (isTmpId(cid)) {
              const resolved = cid ? idMap.get(cid) : undefined;
              if (resolved) {
                input.customerId = resolved;
              } else {
                // কাস্টমার এখনো সিঙ্ক হয়নি (কিউ-তে পরে আছে বা ব্যর্থ) — এই রাউন্ডে বাদ
                continue;
              }
            }
            const res = await fetch("/api/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            if (!res.ok) {
              if (res.status >= 500 || res.status === 401 || res.status === 429) return;
              failed += 1;
              removeFromQueue(op.qid);
              setState((prev) => ({
                ...prev,
                transactions: prev.transactions.map((t) =>
                  t.id === op.tempId
                    ? { ...t, _pending: false, _offline: false, _failed: true }
                    : t,
                ),
              }));
              continue;
            }
            const payload = (await res.json()) as { transaction: TxnLite };
            const saved = payload.transaction;
            idMap.set(op.tempId, saved.id);
            setState((prev) => ({
              ...prev,
              transactions: prev.transactions.map((t) =>
                t.id === op.tempId
                  ? { ...t, ...saved, _pending: false, _offline: false }
                  : t,
              ),
              activities: prev.activities.map((a) =>
                a.entityId === op.tempId ? { ...a, entityId: saved.id } : a,
              ),
            }));
            removeFromQueue(op.qid);
            synced += 1;
          }
        } catch (error) {
          if (isNetworkFailure(error)) return; // মাঝপথে নেট গেছে — বাকিটা পরে
          failed += 1;
          removeFromQueue(op.qid);
        }
      }
    } finally {
      syncingRef.current = false;
      notifySyncState(false);
      notifyQueueChange();
      if (synced > 0) {
        setLastSyncAt();
        await resync();
        refresh();
        toast.success(
          `${toBnDigits(synced)}টি অফলাইন এন্ট্রি সিঙ্ক হয়েছে`,
          "অস্থায়ী আইডি আসল আইডিতে বদলে গেছে",
        );
      }
      if (failed > 0) {
        toast.error(
          `${toBnDigits(failed)}টি এন্ট্রি সিঙ্ক করা যায়নি`,
          "তথ্য যাচাই করে আবার চেষ্টা করুন",
        );
      }
    }
  }, [refresh, resync, toast]);

  // নেট ফিরলে / সিঙ্ক অনুরোধ এলে কিউ সিঙ্ক করো
  useEffect(() => {
    const onSyncRequest = () => void syncOfflineQueue();
    const onOnline = () => void syncOfflineQueue();
    window.addEventListener(REQUEST_SYNC_EVENT, onSyncRequest);
    window.addEventListener("online", onOnline);
    // মাউন্টের সময় কিউ-তে কিছু থাকলে একটু পরে নিজে থেকে সিঙ্ক
    const timer =
      loadQueue().length > 0
        ? setTimeout(() => void syncOfflineQueue(), 2500)
        : null;
    return () => {
      window.removeEventListener(REQUEST_SYNC_EVENT, onSyncRequest);
      window.removeEventListener("online", onOnline);
      if (timer) clearTimeout(timer);
    };
  }, [syncOfflineQueue]);

  /* ------------------------------------------------------- মূল্য */

  const value = useMemo<StoreValue>(() => {
    const byCustomer = new Map<string, TxnLite[]>();
    for (const t of state.transactions) {
      if (!t.customerId) continue;
      const arr = byCustomer.get(t.customerId) ?? [];
      arr.push(t);
      byCustomer.set(t.customerId, arr);
    }

    const ledgerOf = (customerId: string) => {
      const customer = state.customers.find((c) => c.id === customerId);
      const rows = [...(byCustomer.get(customerId) ?? [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      let balance = customer?.openingBalance ?? 0;
      return rows.map((t) => {
        const delta = signedDue(t);
        balance = round2(balance + delta);
        return { ...t, delta, balance };
      });
    };

    const dueOf = (customerId: string) =>
      state.customers.find((c) => c.id === customerId)?.due ??
      round2(ledgerOf(customerId).at(-1)?.balance ?? 0);

    return {
      ...state,
      bn: state.user.bengaliDigits,
      syncing,
      refresh,
      syncOffline: syncOfflineQueue,
      dueOf,
      ledgerOf,
      temp: {
        addCustomer,
        updateCustomer,
        removeCustomer,
        addTransaction,
        updateTransaction,
        removeTransaction,
        addProduct,
        updateProduct,
        removeProduct,
        addExpense,
        updateExpense,
        removeExpense,
        addSupplier,
        updateSupplier,
        removeSupplier,
        addSupplierTxn,
        addNote,
        updateNote,
        removeNote,
        addReminder,
        updateSettings,
        resetDemo,
      },
    };
  }, [
    state,
    syncing,
    refresh,
    syncOfflineQueue,
    addCustomer,
    updateCustomer,
    removeCustomer,
    addTransaction,
    updateTransaction,
    removeTransaction,
    addProduct,
    updateProduct,
    removeProduct,
    addExpense,
    updateExpense,
    removeExpense,
    addSupplier,
    updateSupplier,
    removeSupplier,
    addSupplierTxn,
    addNote,
    updateNote,
    removeNote,
    addReminder,
    updateSettings,
    resetDemo,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ------------------------------------------------------------------ সাহায্য */

export function describeTxn(t: Pick<TxnLite, "type" | "customer">) {
  const name = t.customer?.name ?? "নগদ ক্রেতা";
  switch (t.type) {
    case "DUE":
      return `${name} বাকিতে মাল নিয়েছেন`;
    case "PAYMENT":
      return `${name} জমা দিয়েছেন`;
    case "DISCOUNT":
      return `${name} কে ছাড় দেওয়া হয়েছে`;
    default:
      return "নগদ বিক্রি হয়েছে";
  }
}
