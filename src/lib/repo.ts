import { all, get, insert, nowIso, num, round2, run, transaction, uid, updateRow } from "@/lib/db";
import {
  mapActivity,
  mapCustomer,
  mapExpense,
  mapItem,
  mapNote,
  mapProduct,
  mapReminder,
  mapSupplier,
  mapSupplierTransaction,
  mapTransaction,
  mapUser,
  type Activity,
  type Customer,
  type Expense,
  type Note,
  type Product,
  type Reminder,
  type Supplier,
  type SupplierTransaction,
  type Transaction,
  type TransactionItem,
  type User,
} from "@/lib/models";

type Param = string | number | null;
type Row = Record<string, unknown>;

const obj = (values: Record<string, Param | undefined>): Record<string, Param> => {
  const out: Record<string, Param> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
};

/* ================================================================== ইউজার */

export function findUserByPhone(phone: string): User | null {
  const row = get<Row>("SELECT * FROM users WHERE phone = ?", [phone]);
  return row ? mapUser(row) : null;
}

export function findUserById(id: string): User | null {
  const row = get<Row>("SELECT * FROM users WHERE id = ?", [id]);
  return row ? mapUser(row) : null;
}

export function createUser(data: {
  name: string;
  phone: string;
  email?: string | null;
  passwordHash: string;
  shopName: string;
  shopAddress?: string | null;
  shopPhone?: string | null;
  shopTagline?: string | null;
}): User {
  const id = uid("u");
  const now = nowIso();
  insert("users", {
    id,
    name: data.name,
    phone: data.phone,
    email: data.email ?? null,
    passwordHash: data.passwordHash,
    shopName: data.shopName,
    shopAddress: data.shopAddress ?? null,
    shopPhone: data.shopPhone ?? null,
    shopTagline: data.shopTagline ?? null,
    currency: "BDT",
    lowStockAlert: 5,
    bengaliDigits: 1,
    reminderTemplate:
      "আসসালামু আলাইকুম {name}, আপনার কাছে আমাদের দোকানের বাকি আছে ৳{amount}। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ — {shop}",
    theme: "system",
    createdAt: now,
    updatedAt: now,
  });
  return findUserById(id)!;
}

export function updateUser(
  id: string,
  data: Partial<{
    name: string;
    shopName: string;
    shopAddress: string | null;
    shopPhone: string | null;
    shopTagline: string | null;
    lowStockAlert: number;
    bengaliDigits: boolean;
    reminderTemplate: string;
    theme: string;
    passwordHash: string;
  }>,
): User {
  updateRow(
    "users",
    id,
    obj({
      name: data.name,
      shopName: data.shopName,
      shopAddress: data.shopAddress,
      shopPhone: data.shopPhone,
      shopTagline: data.shopTagline,
      lowStockAlert: data.lowStockAlert,
      bengaliDigits:
        data.bengaliDigits === undefined ? undefined : data.bengaliDigits ? 1 : 0,
      reminderTemplate: data.reminderTemplate,
      theme: data.theme,
      passwordHash: data.passwordHash,
      updatedAt: nowIso(),
    }),
  );
  return findUserById(id)!;
}

/* ================================================================== কাস্টমার */

export function listCustomers(userId: string, includeInactive = true): Customer[] {
  const rows = all<Row>(
    `SELECT * FROM customers WHERE userId = ? ${includeInactive ? "" : "AND isActive = 1"}
     ORDER BY name COLLATE NOCASE ASC`,
    [userId],
  );
  return rows.map(mapCustomer);
}

export function findCustomer(userId: string, id: string): Customer | null {
  const row = get<Row>("SELECT * FROM customers WHERE id = ? AND userId = ?", [id, userId]);
  return row ? mapCustomer(row) : null;
}

export function createCustomer(
  userId: string,
  data: Omit<Customer, "id" | "userId" | "createdAt" | "updatedAt">,
): Customer {
  const id = uid("cu");
  const now = nowIso();
  insert(
    "customers",
    obj({
      id,
      userId,
      name: data.name,
      phone: data.phone,
      address: data.address,
      note: data.note,
      tag: data.tag,
      color: data.color,
      openingBalance: data.openingBalance,
      creditLimit: data.creditLimit,
      isActive: data.isActive ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    }) as Record<string, Param>,
  );
  return findCustomer(userId, id)!;
}

export function updateCustomer(
  userId: string,
  id: string,
  data: Partial<Omit<Customer, "id" | "userId" | "createdAt" | "updatedAt">>,
): Customer | null {
  updateRow(
    "customers",
    id,
    obj({
      name: data.name,
      phone: data.phone,
      address: data.address,
      note: data.note,
      tag: data.tag,
      color: data.color,
      openingBalance: data.openingBalance,
      creditLimit: data.creditLimit,
      isActive: data.isActive === undefined ? undefined : data.isActive ? 1 : 0,
      updatedAt: nowIso(),
    }),
  );
  return findCustomer(userId, id);
}

export function deleteCustomer(userId: string, id: string) {
  run("DELETE FROM customers WHERE id = ? AND userId = ?", [id, userId]);
}

/* ================================================================== পণ্য */

export function listProducts(userId: string, includeInactive = true): Product[] {
  const rows = all<Row>(
    `SELECT * FROM products WHERE userId = ? ${includeInactive ? "" : "AND isActive = 1"}
     ORDER BY category ASC, name COLLATE NOCASE ASC`,
    [userId],
  );
  return rows.map(mapProduct);
}

export function findProduct(userId: string, id: string): Product | null {
  const row = get<Row>("SELECT * FROM products WHERE id = ? AND userId = ?", [id, userId]);
  return row ? mapProduct(row) : null;
}

export function createProduct(
  userId: string,
  data: Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">,
): Product {
  const id = uid("p");
  const now = nowIso();
  insert(
    "products",
    obj({
      id,
      userId,
      name: data.name,
      category: data.category,
      unit: data.unit,
      sellPrice: data.sellPrice,
      buyPrice: data.buyPrice,
      stock: data.stock,
      lowStockAt: data.lowStockAt,
      isActive: data.isActive ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    }) as Record<string, Param>,
  );
  return findProduct(userId, id)!;
}

export function updateProduct(
  userId: string,
  id: string,
  data: Partial<Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">>,
): Product | null {
  updateRow(
    "products",
    id,
    obj({
      name: data.name,
      category: data.category,
      unit: data.unit,
      sellPrice: data.sellPrice,
      buyPrice: data.buyPrice,
      stock: data.stock,
      lowStockAt: data.lowStockAt,
      isActive: data.isActive === undefined ? undefined : data.isActive ? 1 : 0,
      updatedAt: nowIso(),
    }),
  );
  return findProduct(userId, id);
}

export function deleteProduct(userId: string, id: string) {
  run("DELETE FROM products WHERE id = ? AND userId = ?", [id, userId]);
}

export function adjustProductStock(productId: string, delta: number) {
  run("UPDATE products SET stock = stock + ?, updatedAt = ? WHERE id = ?", [
    delta,
    nowIso(),
    productId,
  ]);
}

/* ================================================================== লেনদেন */

export type TransactionFilters = {
  customerId?: string | null;
  type?: string | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
  take?: number;
  order?: "asc" | "desc";
  withCustomer?: boolean;
};

/** JOIN সহ লেনদেন লোড করে (আইটেম আলাদা কুয়েরিতে) */
export function listTransactions(
  userId: string,
  filters: TransactionFilters = {},
): Transaction[] {
  const where: string[] = ["t.userId = ?"];
  const params: Param[] = [userId];

  if (filters.customerId) {
    where.push("t.customerId = ?");
    params.push(filters.customerId);
  }
  if (filters.type) {
    where.push("t.type = ?");
    params.push(filters.type);
  }
  if (filters.from) {
    where.push("t.date >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    where.push("t.date <= ?");
    params.push(filters.to);
  }
  if (filters.q) {
    where.push(
      `(t.note LIKE ? OR c.name LIKE ? OR EXISTS (SELECT 1 FROM transaction_items ti WHERE ti.transactionId = t.id AND ti.name LIKE ?))`,
    );
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }

  const order = filters.order === "asc" ? "ASC" : "DESC";
  const limit = filters.take ? `LIMIT ${Number(filters.take)}` : "";

  const rows = all<Row>(
    `SELECT t.*, c.name AS customerName, c.color AS customerColor, c.tag AS customerTag
     FROM transactions t
     LEFT JOIN customers c ON c.id = t.customerId
     WHERE ${where.join(" AND ")}
     ORDER BY t.date ${order}, t.createdAt ${order}
     ${limit}`,
    params,
  );

  return attachItems(rows);
}

function attachItems(rows: Row[]): Transaction[] {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => String(r.id));
  const placeholders = ids.map(() => "?").join(", ");
  const itemRows = all<Row>(
    `SELECT * FROM transaction_items WHERE transactionId IN (${placeholders})`,
    ids,
  );
  const byTx = new Map<string, TransactionItem[]>();
  for (const row of itemRows) {
    const item = mapItem(row);
    const arr = byTx.get(item.transactionId) ?? [];
    arr.push(item);
    byTx.set(item.transactionId, arr);
  }
  return rows.map((row) => mapTransaction(row, byTx.get(String(row.id)) ?? []));
}

export function findTransaction(userId: string, id: string): Transaction | null {
  const rows = all<Row>(
    `SELECT t.*, c.name AS customerName, c.color AS customerColor, c.tag AS customerTag
     FROM transactions t LEFT JOIN customers c ON c.id = t.customerId
     WHERE t.id = ? AND t.userId = ?`,
    [id, userId],
  );
  const mapped = attachItems(rows);
  return mapped[0] ?? null;
}

export type NewTransaction = {
  userId: string;
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
};

export function createTransaction(data: NewTransaction): Transaction {
  const id = uid("tx");
  const now = nowIso();
  return transaction(() => {
    insert("transactions", {
      id,
      userId: data.userId,
      customerId: data.customerId,
      type: data.type,
      amount: round2(data.amount),
      discount: round2(data.discount ?? 0),
      note: data.note ?? null,
      date: data.date,
      method: data.method ?? null,
      createdAt: now,
      updatedAt: now,
    });
    for (const item of data.items ?? []) {
      insert("transaction_items", {
        id: uid("ti"),
        transactionId: id,
        productId: item.productId ?? null,
        name: item.name,
        unit: item.unit ?? null,
        qty: item.qty,
        unitPrice: item.unitPrice,
      });
    }
    return findTransaction(data.userId, id)!;
  });
}

export function updateTransactionRow(
  userId: string,
  id: string,
  data: Partial<{
    customerId: string | null;
    type: string;
    amount: number;
    discount: number;
    note: string | null;
    date: string;
    method: string | null;
  }>,
  replaceItems?: Array<{
    productId?: string | null;
    name: string;
    unit?: string | null;
    qty: number;
    unitPrice: number;
  }>,
): Transaction | null {
  return transaction(() => {
    updateRow(
      "transactions",
      id,
      obj({
        customerId: data.customerId,
        type: data.type,
        amount: data.amount === undefined ? undefined : round2(data.amount),
        discount: data.discount === undefined ? undefined : round2(data.discount),
        note: data.note,
        date: data.date,
        method: data.method,
        updatedAt: nowIso(),
      }),
    );
    if (replaceItems) {
      run("DELETE FROM transaction_items WHERE transactionId = ?", [id]);
      for (const item of replaceItems) {
        insert("transaction_items", {
          id: uid("ti"),
          transactionId: id,
          productId: item.productId ?? null,
          name: item.name,
          unit: item.unit ?? null,
          qty: item.qty,
          unitPrice: item.unitPrice,
        });
      }
    }
    return findTransaction(userId, id);
  });
}

export function deleteTransaction(userId: string, id: string) {
  run("DELETE FROM transactions WHERE id = ? AND userId = ?", [id, userId]);
}

/** হালকা লেনদেন সারি — বাকি হিসাব করার জন্য */
export type TxnRow = {
  id: string;
  customerId: string | null;
  type: string;
  amount: number;
  date: string;
};

export function listTxnRows(
  userId: string,
  opts: { from?: string | null; to?: string | null; customerId?: string | null } = {},
): TxnRow[] {
  const where: string[] = ["userId = ?"];
  const params: Param[] = [userId];
  if (opts.from) {
    where.push("date >= ?");
    params.push(opts.from);
  }
  if (opts.to) {
    where.push("date <= ?");
    params.push(opts.to);
  }
  if (opts.customerId) {
    where.push("customerId = ?");
    params.push(opts.customerId);
  }
  return all<Row>(
    `SELECT id, customerId, type, amount, date FROM transactions WHERE ${where.join(" AND ")}`,
    params,
  ).map((row) => ({
    id: String(row.id),
    customerId: (row.customerId as string) ?? null,
    type: String(row.type),
    amount: num(row.amount),
    date: String(row.date),
  }));
}

/* ================================================================== খরচ */

export function listExpenses(
  userId: string,
  opts: { from?: string | null; to?: string | null; category?: string | null; take?: number } = {},
): Expense[] {
  const where: string[] = ["userId = ?"];
  const params: Param[] = [userId];
  if (opts.from) {
    where.push("date >= ?");
    params.push(opts.from);
  }
  if (opts.to) {
    where.push("date <= ?");
    params.push(opts.to);
  }
  if (opts.category) {
    where.push("category = ?");
    params.push(opts.category);
  }
  const limit = opts.take ? `LIMIT ${Number(opts.take)}` : "";
  return all<Row>(
    `SELECT * FROM expenses WHERE ${where.join(" AND ")} ORDER BY date DESC, createdAt DESC ${limit}`,
    params,
  ).map(mapExpense);
}

export function findExpense(userId: string, id: string): Expense | null {
  const row = get<Row>("SELECT * FROM expenses WHERE id = ? AND userId = ?", [id, userId]);
  return row ? mapExpense(row) : null;
}

export function createExpense(
  userId: string,
  data: { category: string; amount: number; note?: string | null; paidTo?: string | null; method?: string; date: string },
): Expense {
  const id = uid("e");
  insert("expenses", {
    id,
    userId,
    category: data.category,
    amount: round2(data.amount),
    note: data.note ?? null,
    paidTo: data.paidTo ?? null,
    method: data.method ?? "নগদ",
    date: data.date,
    createdAt: nowIso(),
  });
  return findExpense(userId, id)!;
}

export function updateExpense(
  userId: string,
  id: string,
  data: Partial<{ category: string; amount: number; note: string | null; paidTo: string | null; method: string; date: string }>,
): Expense | null {
  updateRow(
    "expenses",
    id,
    obj({
      category: data.category,
      amount: data.amount === undefined ? undefined : round2(data.amount),
      note: data.note,
      paidTo: data.paidTo,
      method: data.method,
      date: data.date,
    }),
  );
  return findExpense(userId, id);
}

export function deleteExpense(userId: string, id: string) {
  run("DELETE FROM expenses WHERE id = ? AND userId = ?", [id, userId]);
}

/* ================================================================== সাপ্লায়ার */

export function listSuppliers(userId: string): Supplier[] {
  return all<Row>("SELECT * FROM suppliers WHERE userId = ? ORDER BY name COLLATE NOCASE ASC", [
    userId,
  ]).map(mapSupplier);
}

export function findSupplier(userId: string, id: string): Supplier | null {
  const row = get<Row>("SELECT * FROM suppliers WHERE id = ? AND userId = ?", [id, userId]);
  return row ? mapSupplier(row) : null;
}

export function createSupplier(
  userId: string,
  data: Omit<Supplier, "id" | "userId" | "createdAt" | "updatedAt">,
): Supplier {
  const id = uid("s");
  const now = nowIso();
  insert(
    "suppliers",
    obj({
      id,
      userId,
      name: data.name,
      phone: data.phone,
      address: data.address,
      note: data.note,
      openingBalance: data.openingBalance,
      isActive: data.isActive ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    }) as Record<string, Param>,
  );
  return findSupplier(userId, id)!;
}

export function updateSupplier(
  userId: string,
  id: string,
  data: Partial<Omit<Supplier, "id" | "userId" | "createdAt" | "updatedAt">>,
): Supplier | null {
  updateRow(
    "suppliers",
    id,
    obj({
      name: data.name,
      phone: data.phone,
      address: data.address,
      note: data.note,
      openingBalance: data.openingBalance,
      isActive: data.isActive === undefined ? undefined : data.isActive ? 1 : 0,
      updatedAt: nowIso(),
    }),
  );
  return findSupplier(userId, id);
}

export function deleteSupplier(userId: string, id: string) {
  run("DELETE FROM suppliers WHERE id = ? AND userId = ?", [id, userId]);
}

export function listSupplierTransactions(
  supplierId: string,
  order: "asc" | "desc" = "asc",
): SupplierTransaction[] {
  return all<Row>(
    `SELECT * FROM supplier_transactions WHERE supplierId = ? ORDER BY date ${order === "asc" ? "ASC" : "DESC"}, createdAt ${order === "asc" ? "ASC" : "DESC"}`,
    [supplierId],
  ).map(mapSupplierTransaction);
}

export function listAllSupplierTransactions(
  userId: string,
  opts: { from?: string | null } = {},
): SupplierTransaction[] {
  const params: Param[] = [userId];
  let sql = "SELECT * FROM supplier_transactions WHERE userId = ?";
  if (opts.from) {
    sql += " AND date >= ?";
    params.push(opts.from);
  }
  return all<Row>(sql, params).map(mapSupplierTransaction);
}

export function createSupplierTransaction(
  userId: string,
  data: { supplierId: string; type: string; amount: number; note?: string | null; date: string },
): SupplierTransaction {
  const id = uid("st");
  insert("supplier_transactions", {
    id,
    userId,
    supplierId: data.supplierId,
    type: data.type,
    amount: round2(data.amount),
    note: data.note ?? null,
    date: data.date,
    createdAt: nowIso(),
  });
  const row = get<Row>("SELECT * FROM supplier_transactions WHERE id = ?", [id])!;
  return mapSupplierTransaction(row);
}

/* ================================================================== তাগাদা */

export function listReminders(userId: string, customerId?: string | null, take = 100): Reminder[] {
  const params: Param[] = [userId];
  let sql = `SELECT r.*, c.name AS customerName, c.color AS customerColor
             FROM reminders r LEFT JOIN customers c ON c.id = r.customerId
             WHERE r.userId = ?`;
  if (customerId) {
    sql += " AND r.customerId = ?";
    params.push(customerId);
  }
  sql += ` ORDER BY r.createdAt DESC LIMIT ${Number(take)}`;
  return all<Row>(sql, params).map(mapReminder);
}

export function createReminder(
  userId: string,
  data: { customerId: string; channel: string; message?: string | null; amount: number; status: string },
): Reminder {
  const id = uid("r");
  insert("reminders", {
    id,
    userId,
    customerId: data.customerId,
    channel: data.channel,
    message: data.message ?? null,
    amount: round2(data.amount),
    status: data.status,
    createdAt: nowIso(),
  });
  return listReminders(userId, data.customerId, 1)[0];
}

/* ================================================================== অ্যাক্টিভিটি */

export function createActivity(
  userId: string,
  data: {
    action: string;
    entity: string;
    entityId?: string | null;
    title: string;
    detail?: string | null;
    amount?: number | null;
  },
): void {
  insert("activities", {
    id: uid("a"),
    userId,
    action: data.action,
    entity: data.entity,
    entityId: data.entityId ?? null,
    title: data.title,
    detail: data.detail ?? null,
    amount: data.amount === undefined || data.amount === null ? null : round2(data.amount),
    createdAt: nowIso(),
  });
}

export function listActivities(userId: string, take = 40): Activity[] {
  return all<Row>(
    `SELECT * FROM activities WHERE userId = ? ORDER BY createdAt DESC LIMIT ${Number(take)}`,
    [userId],
  ).map(mapActivity);
}

/* ================================================================== নোট */

export function listNotes(userId: string): Note[] {
  return all<Row>(
    "SELECT * FROM notes WHERE userId = ? ORDER BY pinned DESC, updatedAt DESC",
    [userId],
  ).map(mapNote);
}

export function findNote(userId: string, id: string): Note | null {
  const row = get<Row>("SELECT * FROM notes WHERE id = ? AND userId = ?", [id, userId]);
  return row ? mapNote(row) : null;
}

export function createNote(
  userId: string,
  data: { title: string; body?: string; color?: string; pinned?: boolean; tags?: string | null },
): Note {
  const id = uid("n");
  const now = nowIso();
  insert("notes", {
    id,
    userId,
    title: data.title,
    body: data.body ?? "",
    color: data.color ?? "amber",
    pinned: data.pinned ? 1 : 0,
    tags: data.tags ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return findNote(userId, id)!;
}

export function updateNote(
  userId: string,
  id: string,
  data: Partial<{ title: string; body: string; color: string; pinned: boolean; tags: string | null }>,
): Note | null {
  updateRow(
    "notes",
    id,
    obj({
      title: data.title,
      body: data.body,
      color: data.color,
      pinned: data.pinned === undefined ? undefined : data.pinned ? 1 : 0,
      tags: data.tags,
      updatedAt: nowIso(),
    }),
  );
  return findNote(userId, id);
}

export function deleteNote(userId: string, id: string) {
  run("DELETE FROM notes WHERE id = ? AND userId = ?", [id, userId]);
}

/* ================================================================== ডেমো রিসেট */

export function clearUserData(userId: string) {
  transaction(() => {
    run("DELETE FROM transaction_items WHERE transactionId IN (SELECT id FROM transactions WHERE userId = ?)", [userId]);
    run("DELETE FROM transactions WHERE userId = ?", [userId]);
    run("DELETE FROM reminders WHERE userId = ?", [userId]);
    run("DELETE FROM supplier_transactions WHERE userId = ?", [userId]);
    run("DELETE FROM suppliers WHERE userId = ?", [userId]);
    run("DELETE FROM expenses WHERE userId = ?", [userId]);
    run("DELETE FROM products WHERE userId = ?", [userId]);
    run("DELETE FROM customers WHERE userId = ?", [userId]);
    run("DELETE FROM activities WHERE userId = ?", [userId]);
    run("DELETE FROM notes WHERE userId = ?", [userId]);
  });
}
