import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

/**
 * হালকা ডেটাবেস স্তর — Node-এর বিল্ট-ইন SQLite (node:sqlite) ব্যবহার করা হয়েছে।
 * আলাদা কোনো ডেটাবেস সার্ভার বা কম্পাইল করা মডিউল লাগে না, ডেটা ফাইলেই থাকে।
 */

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  passwordHash TEXT NOT NULL,
  shopName TEXT NOT NULL DEFAULT 'আমার দোকান',
  shopAddress TEXT,
  shopPhone TEXT,
  shopTagline TEXT,
  currency TEXT NOT NULL DEFAULT 'BDT',
  lowStockAlert REAL NOT NULL DEFAULT 5,
  bengaliDigits INTEGER NOT NULL DEFAULT 1,
  reminderTemplate TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'system',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  note TEXT,
  tag TEXT NOT NULL DEFAULT 'নিয়মিত',
  color TEXT NOT NULL DEFAULT 'emerald',
  openingBalance REAL NOT NULL DEFAULT 0,
  creditLimit REAL,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(userId, name);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'মুদি',
  unit TEXT NOT NULL DEFAULT 'পিস',
  sellPrice REAL NOT NULL DEFAULT 0,
  buyPrice REAL NOT NULL DEFAULT 0,
  stock REAL NOT NULL DEFAULT 0,
  lowStockAt REAL NOT NULL DEFAULT 5,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(userId, name);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customerId TEXT REFERENCES customers(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  note TEXT,
  date TEXT NOT NULL,
  method TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(userId, date);
CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions(customerId, date);

CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transactionId TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  productId TEXT REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit TEXT,
  qty REAL NOT NULL DEFAULT 1,
  unitPrice REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_tx ON transaction_items(transactionId);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'অন্যান্য',
  amount REAL NOT NULL,
  note TEXT,
  paidTo TEXT,
  method TEXT NOT NULL DEFAULT 'নগদ',
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(userId, date);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  note TEXT,
  openingBalance REAL NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers(userId, name);

CREATE TABLE IF NOT EXISTS supplier_transactions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplierId TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stx_supplier ON supplier_transactions(supplierId, date);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customerId TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message TEXT,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(userId, createdAt);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entityId TEXT,
  title TEXT NOT NULL,
  detail TEXT,
  amount REAL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(userId, createdAt);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'amber',
  pinned INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(userId, pinned);
`;

type GlobalWithDb = typeof globalThis & { __dokanDb?: DatabaseSync };

function resolveDbPath() {
  const raw = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "data/dokan.db";
  const full = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
  mkdirSync(dirname(full), { recursive: true });
  return full;
}

export function getDb(): DatabaseSync {
  const g = globalThis as GlobalWithDb;
  if (!g.__dokanDb) {
    const db = new DatabaseSync(resolveDbPath());
    db.exec(SCHEMA);
    g.__dokanDb = db;
  }
  return g.__dokanDb;
}

/* ------------------------------------------------------------------ আইডি ও সময় */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** cuid-এর মতো দেখতে সংক্ষিপ্ত ইউনিক আইডি */
export function uid(prefix = "c"): string {
  const time = Date.now().toString(36);
  let rand = "";
  for (let i = 0; i < 10; i++) {
    rand += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}${time}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ কুয়েরি হেল্পার */

type Param = string | number | null;

export function all<T = Record<string, unknown>>(sql: string, params: Param[] = []): T[] {
  const stmt = getDb().prepare(sql);
  return stmt.all(...params) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, params: Param[] = []): T | null {
  const stmt = getDb().prepare(sql);
  const row = stmt.get(...params);
  return (row as T) ?? null;
}

export function run(sql: string, params: Param[] = []) {
  const stmt = getDb().prepare(sql);
  return stmt.run(...params);
}

/** একাধিক কুয়েরি এক ট্রানজেকশনে চালায় */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** `INSERT ... ON CONFLICT DO UPDATE` লেখার সহজ উপায় */
export function insert(
  table: string,
  values: Record<string, Param>,
): void {
  const keys = Object.keys(values);
  const placeholders = keys.map(() => "?").join(", ");
  run(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
    keys.map((k) => values[k]),
  );
}

export function updateRow(
  table: string,
  id: string,
  values: Record<string, Param | undefined>,
): void {
  const keys = Object.keys(values).filter((k) => values[k] !== undefined);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  run(
    `UPDATE ${table} SET ${sets} WHERE id = ?`,
    [...keys.map((k) => values[k] as Param), id],
  );
}

export function bool(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

export function countUsers(): number {
  const row = get<{ c: number }>("SELECT COUNT(*) AS c FROM users");
  return row?.c ?? 0;
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? (n as number) : fallback;
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/* ------------------------------------------------------------------ তারিখ */

/** লেনদেনের তারিখ সবসময় দুপুর ১২টায় ধরা হয় যাতে টাইমজোনে দিন বদলে না যায় */
export function parseDateInput(input: string | Date | null | undefined): string {
  if (!input) return nowIso();
  if (input instanceof Date) return input.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T12:00:00`).toISOString();
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? nowIso() : d.toISOString();
}

export function dayStart(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

export function dayEnd(d: Date): string {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy.toISOString();
}
