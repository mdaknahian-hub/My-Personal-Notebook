import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const phoneSchema = z
  .string()
  .trim()
  .min(6, "ফোন নম্বর খুব ছোট")
  .max(20, "ফোন নম্বর খুব বড়");

export const loginSchema = z.object({
  phone: z.string().trim().min(3, "ফোন নম্বর দিন"),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
  shopName: z.string().trim().min(2, "দোকানের নাম দিন"),
  phone: phoneSchema,
  password: z.string().min(4, "পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে"),
  shopAddress: optionalString,
  email: optionalString,
});

export const customerSchema = z.object({
  name: z.string().trim().min(1, "কাস্টমারের নাম দিন").max(80),
  phone: optionalString,
  address: optionalString,
  note: optionalString,
  tag: z.string().trim().max(30).optional().default("নিয়মিত"),
  color: z.string().trim().max(20).optional().default("emerald"),
  openingBalance: z.coerce.number().min(0).default(0),
  creditLimit: z.coerce.number().min(0).optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
});

export const customerUpdateSchema = customerSchema.partial();

export const transactionItemSchema = z.object({
  productId: z.string().optional().nullable(),
  name: z.string().trim().min(1),
  unit: optionalString,
  qty: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
});

export const transactionSchema = z.object({
  customerId: z.string().optional().nullable(),
  type: z.enum(["DUE", "PAYMENT", "DISCOUNT", "CASH_SALE"]),
  amount: z.coerce.number().positive("টাকার পরিমাণ দিন"),
  discount: z.coerce.number().min(0).default(0),
  note: optionalString,
  date: z.string().min(4),
  method: optionalString,
  items: z.array(transactionItemSchema).optional().default([]),
  /** স্টক কমাবে কি না (বাকি/নগদ বিক্রিতে ডিফল্ট: হ্যাঁ) */
  adjustStock: z.coerce.boolean().optional().default(true),
});

export const transactionUpdateSchema = transactionSchema.partial().extend({
  adjustStock: z.coerce.boolean().optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "পণ্যের নাম দিন").max(80),
  category: z.string().trim().max(40).optional().default("মুদি"),
  unit: z.string().trim().max(20).optional().default("পিস"),
  sellPrice: z.coerce.number().min(0).default(0),
  buyPrice: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().default(0),
  lowStockAt: z.coerce.number().min(0).default(5),
  isActive: z.coerce.boolean().optional().default(true),
});

export const productUpdateSchema = productSchema.partial();

export const expenseSchema = z.object({
  category: z.string().trim().max(40).optional().default("অন্যান্য"),
  amount: z.coerce.number().positive("টাকার পরিমাণ দিন"),
  note: optionalString,
  paidTo: optionalString,
  method: z.string().trim().max(30).optional().default("নগদ"),
  date: z.string().min(4),
});

export const expenseUpdateSchema = expenseSchema.partial();

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "সাপ্লায়ারের নাম দিন").max(80),
  phone: optionalString,
  address: optionalString,
  note: optionalString,
  openingBalance: z.coerce.number().min(0).default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const supplierUpdateSchema = supplierSchema.partial();

export const supplierTransactionSchema = z.object({
  supplierId: z.string().min(1),
  type: z.enum(["PURCHASE", "PAYMENT"]),
  amount: z.coerce.number().positive("টাকার পরিমাণ দিন"),
  note: optionalString,
  date: z.string().min(4),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).optional(),
  shopName: z.string().trim().min(2).optional(),
  shopAddress: optionalString,
  shopPhone: optionalString,
  shopTagline: optionalString,
  lowStockAlert: z.coerce.number().min(0).optional(),
  bengaliDigits: z.coerce.boolean().optional(),
  reminderTemplate: z.string().trim().max(600).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "বর্তমান পাসওয়ার্ড দিন"),
  newPassword: z.string().min(4, "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে"),
});

export const noteSchema = z.object({
  title: z.string().trim().min(1, "শিরোনাম দিন").max(120),
  body: z.string().trim().max(4000).optional().default(""),
  color: z.string().trim().max(20).optional().default("amber"),
  pinned: z.coerce.boolean().optional().default(false),
  tags: optionalString,
});

export const noteUpdateSchema = noteSchema.partial();

export const reminderSchema = z.object({
  customerId: z.string().min(1),
  channel: z.enum(["whatsapp", "sms", "call", "in_person"]).default("whatsapp"),
  message: optionalString,
  amount: z.coerce.number().min(0).default(0),
  status: z.enum(["sent", "promised", "later"]).default("sent"),
});

export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  return first?.message ?? "তথ্য সঠিক নয়";
}
