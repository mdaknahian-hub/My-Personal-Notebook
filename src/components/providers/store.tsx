"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/providers/theme";
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

type MutationResult<T> = { ok: true; data: T } | { ok: false; error: string };

type StoreValue = StoreState & {
  /** বাংলা সংখ্যা দেখানো হবে কি না */
  bn: boolean;
  syncing: boolean;
  refresh: () => void;
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
      options: RequestInit & { method: string },
    ): Promise<MutationResult<T>> => {
      try {
        const res = await fetch(url, {
          headers: { "Content-Type": "application/json" },
          ...options,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            (payload as { error?: string })?.error ?? "কিছু একটা ভুল হয়েছে";
          toast.error(message);
          return { ok: false, error: message };
        }
        return { ok: true, data: payload as T };
      } catch {
        const message = "ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না";
        toast.error(message);
        return { ok: false, error: message };
      }
    },
    [toast],
  );

  const patchState = useCallback((patch: Partial<StoreState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  /** সার্ভার থেকে নতুন ডেটা এনে স্টেট মিলিয়ে নেয় (অপটিমিস্টিক ত্রুটি হলে) */
  const resync = useCallback(async () => {
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

      const result = await request<{ customer: CustomerLite }>("/api/customers", {
        method: "POST",
        body: JSON.stringify(input),
      });

      if (!result.ok) {
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
    [request, refresh],
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
    [request, refresh],
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
    [request, refresh],
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

      const result = await request<{ transaction: TxnLite }>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      });

      if (!result.ok) {
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
    [state.customers, request, adjustCustomerDue, adjustStock, refresh, resync],
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

      const result = await request<{ transaction: TxnLite }>(
        `/api/transactions/${id}`,
        { method: "PATCH", body: JSON.stringify(input) },
      );

      if (!result.ok) {
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
    [request, adjustCustomerDue, adjustStock, refresh, resync],
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

      const result = await request<{ success: boolean }>(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!result.ok) {
        await resync();
        return result;
      }
      refresh();
      return { ok: true, data: { id } };
    },
    [request, adjustCustomerDue, adjustStock, refresh, resync],
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
