import { bool, num } from "@/lib/db";

/* ------------------------------------------------------------------ টাইপ */

export type User = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  passwordHash: string;
  shopName: string;
  shopAddress: string | null;
  shopPhone: string | null;
  shopTagline: string | null;
  currency: string;
  lowStockAlert: number;
  bengaliDigits: boolean;
  reminderTemplate: string;
  theme: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Omit<User, "passwordHash">;

export type Customer = {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  tag: string;
  color: string;
  openingBalance: number;
  creditLimit: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  userId: string;
  name: string;
  category: string;
  unit: string;
  sellPrice: number;
  buyPrice: number;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TransactionItem = {
  id: string;
  transactionId: string;
  productId: string | null;
  name: string;
  unit: string | null;
  qty: number;
  unitPrice: number;
};

export type Transaction = {
  id: string;
  userId: string;
  customerId: string | null;
  type: string;
  amount: number;
  discount: number;
  note: string | null;
  date: string;
  method: string | null;
  createdAt: string;
  updatedAt: string;
  items: TransactionItem[];
  customer: { id: string; name: string; color: string | null; tag: string | null } | null;
};

export type Expense = {
  id: string;
  userId: string;
  category: string;
  amount: number;
  note: string | null;
  paidTo: string | null;
  method: string;
  date: string;
  createdAt: string;
};

export type Supplier = {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  openingBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierTransaction = {
  id: string;
  userId: string;
  supplierId: string;
  type: string;
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
};

export type Reminder = {
  id: string;
  userId: string;
  customerId: string;
  channel: string;
  message: string | null;
  amount: number;
  status: string;
  createdAt: string;
  customer?: { id: string; name: string; color: string | null } | null;
};

export type Activity = {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  title: string;
  detail: string | null;
  amount: number | null;
  createdAt: string;
};

export type Note = {
  id: string;
  userId: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ------------------------------------------------------------------ ম্যাপার */

type Row = Record<string, unknown>;

export function mapUser(row: Row): User {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: (row.email as string) ?? null,
    passwordHash: String(row.passwordHash),
    shopName: String(row.shopName ?? "আমার দোকান"),
    shopAddress: (row.shopAddress as string) ?? null,
    shopPhone: (row.shopPhone as string) ?? null,
    shopTagline: (row.shopTagline as string) ?? null,
    currency: String(row.currency ?? "BDT"),
    lowStockAlert: num(row.lowStockAlert, 5),
    bengaliDigits: bool(row.bengaliDigits),
    reminderTemplate: String(row.reminderTemplate ?? ""),
    theme: String(row.theme ?? "system"),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function publicUser(user: User): PublicUser {
  const { passwordHash: _ignored, ...rest } = user;
  return rest;
}

export function mapCustomer(row: Row): Customer {
  return {
    id: String(row.id),
    userId: String(row.userId),
    name: String(row.name),
    phone: (row.phone as string) ?? null,
    address: (row.address as string) ?? null,
    note: (row.note as string) ?? null,
    tag: String(row.tag ?? "নিয়মিত"),
    color: String(row.color ?? "emerald"),
    openingBalance: num(row.openingBalance),
    creditLimit: row.creditLimit === null || row.creditLimit === undefined ? null : num(row.creditLimit),
    isActive: bool(row.isActive),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function mapProduct(row: Row): Product {
  return {
    id: String(row.id),
    userId: String(row.userId),
    name: String(row.name),
    category: String(row.category ?? "মুদি"),
    unit: String(row.unit ?? "পিস"),
    sellPrice: num(row.sellPrice),
    buyPrice: num(row.buyPrice),
    stock: num(row.stock),
    lowStockAt: num(row.lowStockAt, 5),
    isActive: bool(row.isActive),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function mapItem(row: Row): TransactionItem {
  return {
    id: String(row.id),
    transactionId: String(row.transactionId),
    productId: (row.productId as string) ?? null,
    name: String(row.name),
    unit: (row.unit as string) ?? null,
    qty: num(row.qty, 1),
    unitPrice: num(row.unitPrice),
  };
}

export function mapTransaction(row: Row, items: TransactionItem[] = []): Transaction {
  const customerId = (row.customerId as string) ?? null;
  return {
    id: String(row.id),
    userId: String(row.userId),
    customerId,
    type: String(row.type),
    amount: num(row.amount),
    discount: num(row.discount),
    note: (row.note as string) ?? null,
    date: String(row.date),
    method: (row.method as string) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    items,
    customer:
      customerId && row.customerName
        ? {
            id: customerId,
            name: String(row.customerName),
            color: (row.customerColor as string) ?? null,
            tag: (row.customerTag as string) ?? null,
          }
        : null,
  };
}

export function mapExpense(row: Row): Expense {
  return {
    id: String(row.id),
    userId: String(row.userId),
    category: String(row.category ?? "অন্যান্য"),
    amount: num(row.amount),
    note: (row.note as string) ?? null,
    paidTo: (row.paidTo as string) ?? null,
    method: String(row.method ?? "নগদ"),
    date: String(row.date),
    createdAt: String(row.createdAt),
  };
}

export function mapSupplier(row: Row): Supplier {
  return {
    id: String(row.id),
    userId: String(row.userId),
    name: String(row.name),
    phone: (row.phone as string) ?? null,
    address: (row.address as string) ?? null,
    note: (row.note as string) ?? null,
    openingBalance: num(row.openingBalance),
    isActive: bool(row.isActive),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function mapSupplierTransaction(row: Row): SupplierTransaction {
  return {
    id: String(row.id),
    userId: String(row.userId),
    supplierId: String(row.supplierId),
    type: String(row.type),
    amount: num(row.amount),
    note: (row.note as string) ?? null,
    date: String(row.date),
    createdAt: String(row.createdAt),
  };
}

export function mapReminder(row: Row): Reminder {
  const customerId = String(row.customerId);
  return {
    id: String(row.id),
    userId: String(row.userId),
    customerId,
    channel: String(row.channel ?? "whatsapp"),
    message: (row.message as string) ?? null,
    amount: num(row.amount),
    status: String(row.status ?? "sent"),
    createdAt: String(row.createdAt),
    customer:
      row.customerName !== undefined && row.customerName !== null
        ? {
            id: customerId,
            name: String(row.customerName),
            color: (row.customerColor as string) ?? null,
          }
        : null,
  };
}

export function mapActivity(row: Row): Activity {
  return {
    id: String(row.id),
    userId: String(row.userId),
    action: String(row.action),
    entity: String(row.entity),
    entityId: (row.entityId as string) ?? null,
    title: String(row.title),
    detail: (row.detail as string) ?? null,
    amount: row.amount === null || row.amount === undefined ? null : num(row.amount),
    createdAt: String(row.createdAt),
  };
}

export function mapNote(row: Row): Note {
  return {
    id: String(row.id),
    userId: String(row.userId),
    title: String(row.title),
    body: String(row.body ?? ""),
    color: String(row.color ?? "amber"),
    pinned: bool(row.pinned),
    tags: (row.tags as string) ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export const DEFAULT_REMINDER_TEMPLATE =
  "আসসালামু আলাইকুম {name}, আপনার কাছে আমাদের দোকানের বাকি আছে ৳{amount}। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ — {shop}";
