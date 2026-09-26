/** ক্লায়েন্ট-সার্ভার শেয়ারড টাইপ */

export type ItemLite = {
  id: string;
  transactionId?: string;
  productId: string | null;
  name: string;
  unit: string | null;
  qty: number;
  unitPrice: number;
};

export type CustomerRef = {
  id: string;
  name: string;
  color?: string | null;
  tag?: string | null;
};

export type TxnLite = {
  id: string;
  customerId: string | null;
  type: string;
  amount: number;
  discount: number;
  note: string | null;
  date: string | Date;
  method: string | null;
  createdAt: string | Date;
  items: ItemLite[];
  customer?: CustomerRef | null;
  /** অপটিমিস্টিক আপডেটের সময় সত্য */
  _pending?: boolean;
  _failed?: boolean;
};

export type CustomerLite = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  tag: string;
  color: string;
  openingBalance: number;
  creditLimit: number | null;
  isActive: boolean;
  createdAt: string | Date;
  due: number;
  totalSale: number;
  totalPaid: number;
  totalDiscount?: number;
  lastActivityAt: string | Date | null;
  txnCount: number;
  _pending?: boolean;
};

export type ProductLite = {
  id: string;
  name: string;
  category: string;
  unit: string;
  sellPrice: number;
  buyPrice: number;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
  _pending?: boolean;
};

export type ActivityLite = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  title: string;
  detail: string | null;
  amount: number | null;
  createdAt: string | Date;
};

export type NoteLite = {
  id: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  tags: string | null;
  updatedAt: string | Date;
  _pending?: boolean;
};

export type ExpenseLite = {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  paidTo: string | null;
  method: string;
  date: string | Date;
  _pending?: boolean;
};

export type SupplierLite = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  openingBalance: number;
  isActive: boolean;
  payable?: number;
  totalPurchase?: number;
  totalPayment?: number;
  lastActivity?: string | Date | null;
  _pending?: boolean;
};

export type UserLite = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  shopName: string;
  shopAddress: string | null;
  shopPhone: string | null;
  shopTagline: string | null;
  lowStockAlert: number;
  bengaliDigits: boolean;
  reminderTemplate: string;
  theme: string;
};

export type ReminderLite = {
  id: string;
  customerId: string;
  channel: string;
  message: string | null;
  amount: number;
  status: string;
  createdAt: string | Date;
  customer?: CustomerRef | null;
  _pending?: boolean;
};

export const CUSTOMER_TAGS = [
  "নিয়মিত",
  "পাইকারি",
  "প্রতিবেশী",
  "আত্মীয়",
  "চা-দোকান",
  "রেস্টুরেন্ট",
  "অফিস",
];

export const EXPENSE_CATEGORIES = [
  "দোকান ভাড়া",
  "বিদ্যুৎ বিল",
  "পরিবহন",
  "কুলি",
  "বেতন",
  "দোকান মেরামত",
  "চা-নাস্তা",
  "মোবাইল রিচার্জ",
  "প্যাকেজিং",
  "অন্যান্য",
];

export const PAYMENT_METHODS = ["নগদ", "বিকাশ", "নগদ (অ্যাপ)", "রকেট", "ব্যাংক"];

export const PRODUCT_CATEGORIES = [
  "চাল ও আটা",
  "ডাল",
  "তেল",
  "মসলা",
  "মুদি",
  "সবজি",
  "ডেইরি",
  "পানীয়",
  "প্রসাধনী",
  "স্ন্যাকস",
  "অন্যান্য",
];
