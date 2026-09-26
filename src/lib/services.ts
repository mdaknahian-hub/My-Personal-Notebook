import { round2 } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import * as repo from "@/lib/repo";
import type { Transaction } from "@/lib/models";

/* ------------------------------------------------------------------ অ্যাক্টিভিটি */

export function logActivity(
  userId: string,
  data: {
    action: "create" | "update" | "delete";
    entity: string;
    entityId?: string | null;
    title: string;
    detail?: string | null;
    amount?: number | null;
  },
) {
  try {
    repo.createActivity(userId, data);
  } catch (error) {
    console.error("[activity-log]", error);
  }
}

/* ------------------------------------------------------------------ হিসাব */

export type CustomerBalance = {
  due: number;
  totalDue: number;
  totalPaid: number;
  totalDiscount: number;
  totalSale: number;
  lastActivityAt: Date | null;
  txnCount: number;
};

type MinimalTxn = {
  type: string;
  amount: number;
  date: Date | string;
};

export function summarizeLedger(
  openingBalance: number,
  txns: MinimalTxn[],
): CustomerBalance {
  let totalDue = 0;
  let totalPaid = 0;
  let totalDiscount = 0;
  let totalSale = 0;
  let lastActivityAt: Date | null = null;

  for (const t of txns) {
    const at = t.date ? new Date(t.date) : null;
    if (at && !Number.isNaN(at.getTime()) && (!lastActivityAt || at > lastActivityAt)) {
      lastActivityAt = at;
    }
    if (t.type === "DUE") {
      totalDue += t.amount;
      totalSale += t.amount;
    } else if (t.type === "CASH_SALE") {
      totalSale += t.amount;
    } else if (t.type === "PAYMENT") {
      totalPaid += t.amount;
    } else if (t.type === "DISCOUNT") {
      totalDiscount += t.amount;
    }
  }

  return {
    due: round2(openingBalance + totalDue - totalPaid - totalDiscount),
    totalDue: round2(totalDue),
    totalPaid: round2(totalPaid),
    totalDiscount: round2(totalDiscount),
    totalSale: round2(totalSale),
    lastActivityAt,
    txnCount: txns.length,
  };
}

/** একাধিক কাস্টমারের বাকি একসাথে হিসাব (N+1 এড়াতে) */
export function balancesFromGrouped(
  customers: Array<{ id: string; openingBalance: number }>,
  txns: Array<MinimalTxn & { customerId: string | null }>,
) {
  const grouped = new Map<string, MinimalTxn[]>();
  for (const t of txns) {
    if (!t.customerId) continue;
    const arr = grouped.get(t.customerId) ?? [];
    arr.push(t);
    grouped.set(t.customerId, arr);
  }
  const result = new Map<string, CustomerBalance>();
  for (const c of customers) {
    result.set(c.id, summarizeLedger(c.openingBalance, grouped.get(c.id) ?? []));
  }
  return result;
}

/* ------------------------------------------------------------------ স্টক */

export function applyStockForItems(
  items: Array<{ productId?: string | null; qty: number }>,
  direction: 1 | -1,
) {
  for (const item of items) {
    if (!item.productId) continue;
    try {
      repo.adjustProductStock(item.productId, direction * item.qty);
    } catch {
      // পণ্য মুছে ফেলা হলে এড়িয়ে যাই
    }
  }
}

export function assertCustomerOwned(userId: string, customerId: string) {
  const customer = repo.findCustomer(userId, customerId);
  if (!customer) throw new ApiError("কাস্টমার খুঁজে পাওয়া যায়নি", 404);
  return customer;
}

export function assertProductOwned(userId: string, productId: string) {
  const product = repo.findProduct(userId, productId);
  if (!product) throw new ApiError("পণ্য খুঁজে পাওয়া যায়নি", 404);
  return product;
}

/* ------------------------------------------------------------------ খতিয়ান */

/** চলমান ব্যালেন্সসহ কাস্টমারের পূর্ণ খতিয়ান (পুরনো → নতুন) */
export function getCustomerLedger(userId: string, customerId: string) {
  const customer = assertCustomerOwned(userId, customerId);
  const txns = repo.listTransactions(userId, { customerId, order: "asc" });

  let balance = customer.openingBalance;
  const rows = txns.map((t: Transaction) => {
    const delta =
      t.type === "DUE"
        ? t.amount
        : t.type === "PAYMENT" || t.type === "DISCOUNT"
          ? -t.amount
          : 0;
    balance = round2(balance + delta);
    return { ...t, delta: round2(delta), balance };
  });

  const summary = summarizeLedger(customer.openingBalance, txns);
  return { customer, rows, summary };
}
