import * as repo from "@/lib/repo";
import { balancesFromGrouped, summarizeLedger, type CustomerBalance } from "@/lib/services";
import { buildDailySeries, dueSeverity, round2 } from "@/lib/calc";
import type { Customer } from "@/lib/models";
import { addDays, endOfDay, startOfDay, startOfMonth } from "@/lib/utils";

export type CustomerWithBalance = Customer & CustomerBalance;

/* ------------------------------------------------------------------ ড্যাশবোর্ড */

export async function getDashboardData(userId: string, shopName: string) {
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const trendStart = startOfDay(addDays(now, -13)).toISOString();

  const customers = repo.listCustomers(userId);
  const products = repo.listProducts(userId);
  const allTx = repo.listTxnRows(userId, { from: addDays(now, -120).toISOString() });
  const todayTx = repo.listTransactions(userId, {
    from: todayStart,
    to: todayEnd,
    order: "desc",
  });
  const monthTx = repo.listTxnRows(userId, { from: monthStart });
  const prevMonthTx = repo.listTxnRows(userId, { from: prevMonthStart, to: monthStart });
  const monthExpenses = repo.listExpenses(userId, { from: monthStart });
  const activities = repo.listActivities(userId, 12);
  const suppliers = repo.listSuppliers(userId);
  const supplierTx = repo.listAllSupplierTransactions(userId);

  const balances = balancesFromGrouped(customers, allTx);
  const totalDue = round2(
    customers.reduce((sum, c) => sum + (balances.get(c.id)?.due ?? c.openingBalance), 0),
  );

  const sumBy = (rows: { type: string; amount: number }[], type: string) =>
    round2(rows.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0));

  const monthSale = round2(sumBy(monthTx, "DUE") + sumBy(monthTx, "CASH_SALE"));
  const monthCollection = sumBy(monthTx, "PAYMENT");
  const monthExpense = round2(monthExpenses.reduce((s, e) => s + e.amount, 0));
  const prevMonthSale = round2(sumBy(prevMonthTx, "DUE") + sumBy(prevMonthTx, "CASH_SALE"));
  const prevMonthCollection = sumBy(prevMonthTx, "PAYMENT");

  const todaySale = round2(sumBy(todayTx, "DUE") + sumBy(todayTx, "CASH_SALE"));
  const todayCollection = sumBy(todayTx, "PAYMENT");
  const todayNewDue = sumBy(todayTx, "DUE");

  const series = buildDailySeries(
    allTx.filter((t) => new Date(t.date) >= new Date(trendStart)),
    14,
  );

  // গড় মার্জিন থেকে আনুমানিক লাভ
  const marginProducts = products.filter((p) => p.buyPrice > 0 && p.sellPrice > 0);
  const avgMargin =
    marginProducts.length > 0
      ? marginProducts.reduce(
          (s, p) => s + ((p.sellPrice - p.buyPrice) / p.sellPrice) * 100,
          0,
        ) / marginProducts.length
      : 12;
  const monthProfit = round2((monthSale * avgMargin) / 100 - monthExpense);

  const stockValue = round2(products.reduce((s, p) => s + p.stock * p.buyPrice, 0));
  const lowStock = products
    .filter((p) => p.stock <= p.lowStockAt)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  const topDue = customers
    .map((c) => ({ customer: c, balance: balances.get(c.id) }))
    .filter((row) => (row.balance?.due ?? 0) > 0)
    .sort((a, b) => (b.balance?.due ?? 0) - (a.balance?.due ?? 0))
    .slice(0, 6);

  // বয়সভিত্তিক বাকি (কতদিন ধরে বাকি)
  const agingBuckets = [
    { label: "০-১৫ দিন", min: 0, max: 15, amount: 0, count: 0 },
    { label: "১৬-৩০ দিন", min: 16, max: 30, amount: 0, count: 0 },
    { label: "৩১-৬০ দিন", min: 31, max: 60, amount: 0, count: 0 },
    { label: "৬০+ দিন", min: 61, max: 100000, amount: 0, count: 0 },
  ];
  for (const c of customers) {
    const info = balances.get(c.id);
    if (!info || info.due <= 0) continue;
    const last = info.lastActivityAt ?? new Date(c.createdAt);
    const days = Math.max(
      0,
      Math.floor((now.getTime() - new Date(last).getTime()) / 86400000),
    );
    const bucket = agingBuckets.find((b) => days >= b.min && days <= b.max);
    if (bucket) {
      bucket.amount = round2(bucket.amount + info.due);
      bucket.count += 1;
    }
  }

  const supplierOwed = new Map<string, number>();
  for (const s of suppliers) supplierOwed.set(s.id, s.openingBalance);
  for (const t of supplierTx) {
    supplierOwed.set(
      t.supplierId,
      round2((supplierOwed.get(t.supplierId) ?? 0) + (t.type === "PURCHASE" ? t.amount : -t.amount)),
    );
  }
  const supplierPayable = round2(
    [...supplierOwed.values()].reduce((s, v) => s + v, 0),
  );

  const monthlyByCustomer = new Map<string, number>();
  for (const t of monthTx) {
    if (!t.customerId) continue;
    if (t.type !== "DUE" && t.type !== "CASH_SALE") continue;
    monthlyByCustomer.set(
      t.customerId,
      round2((monthlyByCustomer.get(t.customerId) ?? 0) + t.amount),
    );
  }
  const topBuyers = [...monthlyByCustomer.entries()]
    .map(([id, amount]) => ({
      customer: customers.find((c) => c.id === id)!,
      amount,
      due: balances.get(id)?.due ?? 0,
    }))
    .filter((r) => r.customer)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const growth = (curr: number, prev: number) =>
    prev <= 0 ? (curr > 0 ? 100 : 0) : round2(((curr - prev) / prev) * 100);

  return {
    shopName,
    kpis: {
      totalDue,
      dueCustomers: customers.filter((c) => (balances.get(c.id)?.due ?? 0) > 0.5).length,
      totalCustomers: customers.length,
      todaySale,
      todayCollection,
      todayNewDue,
      todayTxnCount: todayTx.length,
      monthSale,
      monthCollection,
      monthExpense,
      monthProfit,
      prevMonthSale,
      prevMonthCollection,
      saleGrowth: growth(monthSale, prevMonthSale),
      collectionGrowth: growth(monthCollection, prevMonthCollection),
      stockValue,
      lowStockCount: products.filter((p) => p.stock <= p.lowStockAt).length,
      supplierPayable,
      avgMargin: round2(avgMargin),
    },
    series,
    todayTx,
    topDue: topDue.map((row) => ({
      id: row.customer.id,
      name: row.customer.name,
      color: row.customer.color,
      tag: row.customer.tag,
      phone: row.customer.phone,
      due: row.balance?.due ?? 0,
      severity: dueSeverity(row.balance?.due ?? 0, row.customer.creditLimit),
      lastActivityAt: row.balance?.lastActivityAt ?? null,
    })),
    topBuyers,
    agingBuckets,
    lowStock,
    activities,
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      tag: c.tag,
      phone: c.phone,
      due: balances.get(c.id)?.due ?? c.openingBalance,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      sellPrice: p.sellPrice,
      stock: p.stock,
    })),
  };
}

/* ------------------------------------------------------------------ কাস্টমার */

export function getCustomersWithBalance(userId: string): CustomerWithBalance[] {
  const customers = repo.listCustomers(userId);
  const txns = repo.listTxnRows(userId);
  const balances = balancesFromGrouped(customers, txns);
  return customers.map((c) => ({
    ...c,
    ...(balances.get(c.id) ?? {
      due: c.openingBalance,
      totalDue: 0,
      totalPaid: 0,
      totalDiscount: 0,
      totalSale: 0,
      lastActivityAt: null,
      txnCount: 0,
    }),
  }));
}

export function getCustomerProfile(userId: string, customerId: string) {
  const customer = repo.findCustomer(userId, customerId);
  if (!customer) return null;

  const txns = repo.listTransactions(userId, { customerId, order: "asc" });
  const reminders = repo.listReminders(userId, customerId, 20);

  let balance = customer.openingBalance;
  const withBalance = txns.map((t) => {
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

  const monthly = new Map<string, { sale: number; paid: number; label: Date }>();
  for (const t of txns) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
    const entry =
      monthly.get(key) ?? { sale: 0, paid: 0, label: new Date(d.getFullYear(), d.getMonth(), 1) };
    if (t.type === "DUE" || t.type === "CASH_SALE") entry.sale += t.amount;
    if (t.type === "PAYMENT") entry.paid += t.amount;
    monthly.set(key, entry);
  }
  const monthlyRows = [...monthly.values()]
    .sort((a, b) => b.label.getTime() - a.label.getTime())
    .slice(0, 6)
    .map((v) => ({ label: v.label, sale: round2(v.sale), paid: round2(v.paid) }));

  const productCount = new Map<string, { name: string; qty: number; amount: number }>();
  for (const t of txns) {
    for (const it of t.items) {
      const entry = productCount.get(it.name) ?? { name: it.name, qty: 0, amount: 0 };
      entry.qty += it.qty;
      entry.amount = round2(entry.amount + it.qty * it.unitPrice);
      productCount.set(it.name, entry);
    }
  }
  const favouriteProducts = [...productCount.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    customer,
    rows: [...withBalance].reverse(),
    ascending: withBalance,
    summary,
    monthlyRows,
    favouriteProducts,
    reminders,
    severity: dueSeverity(summary.due, customer.creditLimit),
    lastPayment:
      [...txns].reverse().find((t) => t.type === "PAYMENT") ?? null,
  };
}

/* ------------------------------------------------------------------ লেনদেন */

export function getTransactionsFeed(
  userId: string,
  filters: {
    customerId?: string;
    type?: string;
    from?: string;
    to?: string;
    q?: string;
    take?: number;
  } = {},
) {
  return repo.listTransactions(userId, {
    customerId: filters.customerId ?? null,
    type: filters.type ?? null,
    from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : null,
    to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : null,
    q: filters.q ?? null,
    take: filters.take ?? 200,
    order: "desc",
  });
}

/* ------------------------------------------------------------------ রিপোর্ট */

export function getReportsData(userId: string, monthsBack = 6) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const txns = repo.listTxnRows(userId, { from: from.toISOString() });
  const expenses = repo.listExpenses(userId, { from: from.toISOString() });
  const products = repo.listProducts(userId);
  const customers = repo.listCustomers(userId);
  const supplierTx = repo
    .listAllSupplierTransactions(userId, { from: from.toISOString() })
    .map((t) => ({ type: t.type, amount: t.amount, date: t.date }));

  const monthly: Array<{
    key: string;
    label: Date;
    sale: number;
    collection: number;
    expense: number;
    purchase: number;
    profit: number;
  }> = [];

  const marginProducts = products.filter((p) => p.buyPrice > 0 && p.sellPrice > 0);
  const margin =
    marginProducts.length > 0
      ? marginProducts.reduce(
          (s, p) => s + ((p.sellPrice - p.buyPrice) / p.sellPrice) * 100,
          0,
        ) / marginProducts.length
      : 12;

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
    monthly.push({ key, label: d, sale: 0, collection: 0, expense: 0, purchase: 0, profit: 0 });
  }
  const index = new Map(monthly.map((m) => [m.key, m]));
  const keyOf = (d: Date | string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
  };

  for (const t of txns) {
    const m = index.get(keyOf(t.date));
    if (!m) continue;
    if (t.type === "DUE" || t.type === "CASH_SALE") m.sale += t.amount;
    if (t.type === "PAYMENT") m.collection += t.amount;
  }
  for (const e of expenses) {
    const m = index.get(keyOf(e.date));
    if (m) m.expense += e.amount;
  }
  for (const s of supplierTx) {
    const m = index.get(keyOf(s.date));
    if (m && s.type === "PURCHASE") m.purchase += s.amount;
  }
  for (const m of monthly) {
    m.sale = round2(m.sale);
    m.collection = round2(m.collection);
    m.expense = round2(m.expense);
    m.purchase = round2(m.purchase);
    m.profit = round2((m.sale * margin) / 100 - m.expense);
  }

  const expenseByCategory = new Map<string, number>();
  for (const e of expenses) {
    expenseByCategory.set(
      e.category,
      round2((expenseByCategory.get(e.category) ?? 0) + e.amount),
    );
  }
  const expenseBreakdown = [...expenseByCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const byCustomer = new Map<string, { sale: number; paid: number }>();
  for (const t of txns) {
    if (!t.customerId) continue;
    const entry = byCustomer.get(t.customerId) ?? { sale: 0, paid: 0 };
    if (t.type === "DUE" || t.type === "CASH_SALE") entry.sale += t.amount;
    if (t.type === "PAYMENT") entry.paid += t.amount;
    byCustomer.set(t.customerId, entry);
  }
  const topCustomers = [...byCustomer.entries()]
    .map(([id, v]) => {
      const c = customers.find((x) => x.id === id);
      return {
        id,
        name: c?.name ?? "—",
        color: c?.color ?? "emerald",
        sale: round2(v.sale),
        paid: round2(v.paid),
      };
    })
    .sort((a, b) => b.sale - a.sale)
    .slice(0, 8);

  const totalSale = round2(monthly.reduce((s, m) => s + m.sale, 0));
  const totalCollection = round2(monthly.reduce((s, m) => s + m.collection, 0));
  const totalExpense = round2(monthly.reduce((s, m) => s + m.expense, 0));
  const totalPurchase = round2(monthly.reduce((s, m) => s + m.purchase, 0));

  return {
    monthly,
    expenseBreakdown,
    topCustomers,
    totals: {
      sale: totalSale,
      collection: totalCollection,
      expense: totalExpense,
      purchase: totalPurchase,
      profit: round2((totalSale * margin) / 100 - totalExpense),
      margin: round2(margin),
    },
  };
}

/* ------------------------------------------------------------------ স্টক */

export function getStockOverview(userId: string) {
  const products = repo.listProducts(userId);
  const categories = [...new Set(products.map((p) => p.category))];
  return {
    products,
    categories,
    stats: {
      total: products.length,
      out: products.filter((p) => p.stock <= 0).length,
      low: products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length,
      value: round2(products.reduce((s, p) => s + p.stock * p.buyPrice, 0)),
      retail: round2(products.reduce((s, p) => s + p.stock * p.sellPrice, 0)),
    },
  };
}

/* ------------------------------------------------------------------ সাপ্লায়ার */

export function getSuppliersWithPayable(userId: string) {
  const suppliers = repo.listSuppliers(userId);
  const txns = repo.listAllSupplierTransactions(userId);
  return suppliers.map((s) => {
    const own = txns.filter((t) => t.supplierId === s.id);
    const purchases = own.filter((t) => t.type === "PURCHASE").reduce((x, t) => x + t.amount, 0);
    const payments = own.filter((t) => t.type === "PAYMENT").reduce((x, t) => x + t.amount, 0);
    const sorted = [...own].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return {
      ...s,
      payable: round2(s.openingBalance + purchases - payments),
      totalPurchase: round2(purchases),
      totalPayment: round2(payments),
      lastActivity: sorted[0]?.date ?? null,
    };
  });
}

/* ------------------------------------------------------------------ বুটস্ট্র্যাপ */

export async function getBootstrapData(userId: string) {
  const user = repo.findUserById(userId);
  if (!user) throw new Error("ইউজার পাওয়া যায়নি");

  const customers = repo.listCustomers(userId);
  const products = repo.listProducts(userId);
  const transactions = repo.listTransactions(userId, { take: 400, order: "desc" });
  const activities = repo.listActivities(userId, 40);
  const notes = repo.listNotes(userId);
  const expenses = repo.listExpenses(userId, { take: 300 });
  const suppliers = getSuppliersWithPayable(userId);
  const reminders = repo.listReminders(userId, null, 100);

  const txns = repo.listTxnRows(userId);
  const balances = balancesFromGrouped(customers, txns);

  const { passwordHash: _ignored, ...safeUser } = user;

  return {
    user: safeUser,
    customers: customers.map((c) => ({
      ...c,
      ...(balances.get(c.id) ?? {
        due: c.openingBalance,
        totalDue: 0,
        totalPaid: 0,
        totalDiscount: 0,
        totalSale: 0,
        lastActivityAt: null,
        txnCount: 0,
      }),
    })),
    products,
    transactions,
    activities,
    notes,
    expenses,
    suppliers,
    reminders,
  };
}

export type BootstrapData = Awaited<ReturnType<typeof getBootstrapData>>;
