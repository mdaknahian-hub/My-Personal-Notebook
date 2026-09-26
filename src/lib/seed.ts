import * as repo from "./repo";
import { countUsers, round2 } from "./db";

export const DEMO_PHONE = "01712345678";
export const DEMO_PASSWORD = "dokan1234";

/* ------------------------------------------------------------------ হেল্পার */

/** ডিটারমিনিস্টিক র‍্যান্ডম — প্রতিবার একই ডেমো ডেটা তৈরি হয় */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260926);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const chance = (p: number) => rand() < p;

function atHour(dayOffset: number, hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() - dayOffset);
  return d;
}

/* ------------------------------------------------------------------ ডেমো ডেটা */

const CUSTOMERS = [
  { name: "করিম মিয়া", phone: "01711223344", address: "পূর্ব পাড়া, ২ নং বাজার", tag: "পাইকারি", color: "emerald", opening: 1250, limit: 8000, note: "প্রতি সপ্তাহে হিসাব মিটিয়ে দেন" },
  { name: "রফিকুল ইসলাম", phone: "01812334455", address: "মধ্যপাড়া রোড", tag: "নিয়মিত", color: "sky", opening: 0, limit: 5000, note: null },
  { name: "সালমা বেগম", phone: "01913445566", address: "নতুন কলোনি, বাসা ১২", tag: "প্রতিবেশী", color: "violet", opening: 480, limit: 4000, note: "মাসের শেষে টাকা দেন" },
  { name: "জহির উদ্দিন", phone: "01614556677", address: "বাজার রোড, চায়ের দোকান", tag: "চা-দোকান", color: "amber", opening: 3200, limit: 15000, note: "প্রতিদিন চা-পাতা ও চিনি নেন" },
  { name: "আয়েশা খাতুন", phone: "01515667788", address: "উত্তর পাড়া", tag: "নিয়মিত", color: "rose", opening: 0, limit: 3000, note: null },
  { name: "মোসলেম আলী", phone: "01716778899", address: "কলেজ রোড, মুদি ঘর", tag: "পাইকারি", color: "cyan", opening: 5600, limit: 20000, note: "বড় অর্ডার দেন, ১৫ দিনে পরিশোধ" },
  { name: "নাসরিন আক্তার", phone: "01817889900", address: "বিদ্যালয় পাড়া", tag: "শিক্ষক", color: "lime", opening: 0, limit: 6000, note: null },
  { name: "শাহজাহান সিকদার", phone: "01918990011", address: "ঘাট রোড", tag: "নিয়মিত", color: "fuchsia", opening: 900, limit: 5000, note: null },
  { name: "হাসিনা বেগম", phone: "01619001122", address: "পশ্চিম বাজার", tag: "প্রতিবেশী", color: "indigo", opening: 0, limit: 2500, note: null },
  { name: "বাবুল হোসেন", phone: "01520112233", address: "মিল গেট, শ্রমিক কলোনি", tag: "নিয়মিত", color: "orange", opening: 2100, limit: 7000, note: null },
  { name: "ফরিদা পারভিন", phone: "01721223344", address: "নতুন বাজার", tag: "নিয়মিত", color: "emerald", opening: 0, limit: 3500, note: null },
  { name: "ইব্রাহিম খলিল", phone: "01822334455", address: "হাসপাতাল রোড", tag: "ডাক্তার", color: "sky", opening: 1750, limit: 10000, note: null },
  { name: "রুবিনা আক্তার", phone: "01923445566", address: "পুরাতন বাজার", tag: "নিয়মিত", color: "violet", opening: 0, limit: 3000, note: null },
  { name: "মিজানুর রহমান", phone: "01624556677", address: "ট্রাক স্ট্যান্ড", tag: "রেস্টুরেন্ট", color: "amber", opening: 7800, limit: 25000, note: "রেস্টুরেন্টের সব মাল এখান থেকে নেন" },
  { name: "সেলিনা ইয়াসমিন", phone: "01525667788", address: "বাস স্ট্যান্ড পাড়া", tag: "নিয়মিত", color: "rose", opening: 350, limit: 4000, note: null },
  { name: "আনোয়ার হোসেন", phone: "01726778899", address: "কবরস্থান রোড", tag: "প্রতিবেশী", color: "cyan", opening: 0, limit: 2000, note: null },
  { name: "দিলরুবা খাতুন", phone: "01827889900", address: "নদী পাড়", tag: "নিয়মিত", color: "lime", opening: 0, limit: 3000, note: null },
  { name: "সাইফুল ইসলাম", phone: "01928990011", address: "পুকুর পাড়", tag: "পাইকারি", color: "indigo", opening: 2400, limit: 12000, note: null },
];

const PRODUCTS = [
  { name: "মিনিকেট চাল", category: "চাল ও আটা", unit: "কেজি", sell: 68, buy: 62, stock: 240, low: 40 },
  { name: "নারিকেল চাল (পাইজাম)", category: "চাল ও আটা", unit: "কেজি", sell: 72, buy: 66, stock: 90, low: 30 },
  { name: "আটা (২ কেজি প্যাকেট)", category: "চাল ও আটা", unit: "প্যাকেট", sell: 118, buy: 108, stock: 34, low: 10 },
  { name: "মসুর ডাল (দেশি)", category: "ডাল", unit: "কেজি", sell: 145, buy: 132, stock: 42, low: 15 },
  { name: "মুগ ডাল", category: "ডাল", unit: "কেজি", sell: 175, buy: 160, stock: 12, low: 10 },
  { name: "ছোলা", category: "ডাল", unit: "কেজি", sell: 115, buy: 103, stock: 28, low: 10 },
  { name: "সয়াবিন তেল (১ লিটার)", category: "তেল", unit: "বোতল", sell: 178, buy: 166, stock: 56, low: 20 },
  { name: "সরিষার তেল (৫০০ গ্রাম)", category: "তেল", unit: "বোতল", sell: 165, buy: 148, stock: 18, low: 8 },
  { name: "চিনি", category: "মুদি", unit: "কেজি", sell: 128, buy: 119, stock: 65, low: 25 },
  { name: "লবণ (১ কেজি)", category: "মুদি", unit: "প্যাকেট", sell: 38, buy: 32, stock: 48, low: 20 },
  { name: "হলুদ গুঁড়া", category: "মসলা", unit: "১০০ গ্রাম", sell: 55, buy: 45, stock: 26, low: 10 },
  { name: "মরিচ গুঁড়া", category: "মসলা", unit: "১০০ গ্রাম", sell: 62, buy: 52, stock: 22, low: 10 },
  { name: "জিরা", category: "মসলা", unit: "১০০ গ্রাম", sell: 95, buy: 82, stock: 4, low: 8 },
  { name: "পেঁয়াজ", category: "সবজি", unit: "কেজি", sell: 62, buy: 52, stock: 38, low: 15 },
  { name: "আলু", category: "সবজি", unit: "কেজি", sell: 42, buy: 34, stock: 55, low: 20 },
  { name: "রসুন", category: "সবজি", unit: "কেজি", sell: 185, buy: 165, stock: 9, low: 6 },
  { name: "ডিম", category: "ডেইরি", unit: "ডজন", sell: 145, buy: 132, stock: 16, low: 6 },
  { name: "গুঁড়া দুধ (৫০০ গ্রাম)", category: "ডেইরি", unit: "প্যাকেট", sell: 445, buy: 415, stock: 11, low: 5 },
  { name: "চা পাতা (৪০০ গ্রাম)", category: "পানীয়", unit: "প্যাকেট", sell: 165, buy: 148, stock: 21, low: 8 },
  { name: "সাবান (লাইফবয়)", category: "প্রসাধনী", unit: "পিস", sell: 52, buy: 44, stock: 42, low: 15 },
  { name: "ডিটারজেন্ট পাউডার (১ কেজি)", category: "প্রসাধনী", unit: "প্যাকেট", sell: 185, buy: 168, stock: 14, low: 6 },
  { name: "শ্যাম্পু স্যাশে", category: "প্রসাধনী", unit: "পিস", sell: 12, buy: 9, stock: 60, low: 20 },
  { name: "কোক (৫০০ মিলি)", category: "পানীয়", unit: "বোতল", sell: 40, buy: 34, stock: 32, low: 12 },
  { name: "বিস্কুট (ফ্যামিলি প্যাক)", category: "স্ন্যাকস", unit: "প্যাকেট", sell: 95, buy: 84, stock: 17, low: 8 },
  { name: "চানাচুর (২০০ গ্রাম)", category: "স্ন্যাকস", unit: "প্যাকেট", sell: 45, buy: 38, stock: 24, low: 10 },
  { name: "ইনস্ট্যান্ট নুডলস", category: "স্ন্যাকস", unit: "পিস", sell: 25, buy: 21, stock: 45, low: 20 },
  { name: "মশার কয়েল", category: "অন্যান্য", unit: "প্যাকেট", sell: 65, buy: 55, stock: 19, low: 8 },
  { name: "মোমবাতি", category: "অন্যান্য", unit: "পিস", sell: 10, buy: 7, stock: 3, low: 12 },
];

const EXPENSES = [
  { category: "দোকান ভাড়া", note: "মাসিক দোকান ভাড়া", paidTo: "বাড়ির মালিক", min: 8000, max: 8000, freq: 1 },
  { category: "বিদ্যুৎ বিল", note: "বিদ্যুৎ বিল পরিশোধ", paidTo: "পল্লী বিদ্যুৎ", min: 900, max: 1800, freq: 1 },
  { category: "পরিবহন", note: "মাল আনানোর ভাড়া", paidTo: "ভ্যান চালক", min: 200, max: 750, freq: 3 },
  { category: "কুলি", note: "মাল খালাসের কুলি", paidTo: "কুলি", min: 100, max: 400, freq: 3 },
  { category: "বেতন", note: "সহকারীর বেতন", paidTo: "সহকারী রফিক", min: 6000, max: 6000, freq: 1 },
  { category: "দোকান মেরামত", note: "শেলফ ও দরজা মেরামত", paidTo: "কাঠমিস্ত্রি", min: 500, max: 2500, freq: 0 },
  { category: "চা-নাস্তা", note: "দোকানের খাওয়া", paidTo: "পাশের হোটেল", min: 60, max: 320, freq: 4 },
  { category: "মোবাইল রিচার্জ", note: "দোকানের মোবাইল রিচার্জ", paidTo: "বিকাশ", min: 50, max: 200, freq: 2 },
];

const SUPPLIERS = [
  { name: "মেসার্স হক ট্রেডার্স", phone: "01711009988", address: "পাইকারি মার্কেট, বগুড়া", tag: "চাল-ডাল", opening: 18500 },
  { name: "আল-মদিনা ডিস্ট্রিবিউটর", phone: "01822007766", address: "সিটি কর্পোরেশন মার্কেট", tag: "মুদি", opening: 7200 },
  { name: "নীলফামারী চিনি হাউজ", phone: "01933005544", address: "নীলফামারী সদর", tag: "চিনি", opening: 0 },
  { name: "রহিম তেল এজেন্সি", phone: "01644003322", address: "তেল ডিপো, ঠাকুরগাঁও", tag: "তেল", opening: 4300 },
  { name: "সোনালী ডেইরি", phone: "01555001122", address: "ডেইরি ফার্ম রোড", tag: "দুধ-ডিম", opening: 2100 },
];

const NOTES = [
  {
    title: "মনে রাখার মতো কাজ",
    body: "১. মিজানুর রহমানের বাকির ৫০০০ টাকার তাগাদা দিতে হবে\n২. সরকারি ছাড়ের দাম জিজ্ঞেস করা\n৩. আগামী সপ্তাহে ডেইরি থেকে দুধের অর্ডার বাড়াতে হবে",
    color: "amber",
    pinned: true,
    tags: "কাজ, তাগাদা",
  },
  {
    title: "মাসের হিসাবের নিয়ম",
    body: "প্রতি মাসের ৫ তারিখে সব খাতার হিসাব মিলিয়ে নিব।\n- যা বাকি আছে তা হোয়াটসঅ্যাপে জানিয়ে দিব\n- পাইকারি কাস্টমারদের জন্য বিশেষ ছাড়ের কথা মাথায় রাখব",
    color: "emerald",
    pinned: false,
    tags: "হিসাব",
  },
  {
    title: "নতুন মাল আনার লিস্ট",
    body: "গুঁড়া দুধ, জিরা, মোমবাতি — শেষের দিকে চলে গেছে।\nহক ট্রেডার্স থেকে চাল ২ বস্তা লাগবে।",
    color: "sky",
    pinned: false,
    tags: "সাপ্লায়ার",
  },
];

/* ------------------------------------------------------------------ সিড */

export function seedDemoData(userId?: string): { userId: string } {
  let uid = userId;
  if (!uid) {
    const existing = repo.findUserByPhone(DEMO_PHONE);
    if (existing) {
      uid = existing.id;
    } else {
      const shopPhone = "01712345678";
      const user = repo.createUser({
        name: "মোঃ নাহিয়ান আহমেদ",
        phone: DEMO_PHONE,
        email: "nahian@dokan.app",
        passwordHash: hashPasswordSync(),
        shopName: "নাহিয়ান জেনারেল স্টোর",
        shopTagline: "তেল-চাল-ডাল থেকে শুরু, সব মুদি পণ্য এক জায়গায়",
        shopAddress: "বাজার রোড, শিবগঞ্জ, বগুড়া",
        shopPhone,
      });
      repo.updateUser(user.id, { lowStockAlert: 8, bengaliDigits: true });
      uid = user.id;
    }
  }

  repo.clearUserData(uid);

  /* ---------- পণ্য ---------- */
  const products = PRODUCTS.map((p) =>
    repo.createProduct(uid!, {
      name: p.name,
      category: p.category,
      unit: p.unit,
      sellPrice: p.sell,
      buyPrice: p.buy,
      stock: p.stock,
      lowStockAt: p.low,
      isActive: true,
    }),
  );

  /* ---------- কাস্টমার ---------- */
  const customers = CUSTOMERS.map((c) =>
    repo.createCustomer(uid!, {
      name: c.name,
      phone: c.phone,
      address: c.address,
      note: c.note,
      tag: c.tag,
      color: c.color,
      openingBalance: c.opening,
      creditLimit: c.limit,
      isActive: true,
    }),
  );

  /* ---------- লেনদেন (শেষ ৯০ দিন) ---------- */
  type TxSeed = {
    customerId: string | null;
    type: string;
    amount: number;
    note: string | null;
    date: Date;
    method: string | null;
    items: Array<{ productId: string | null; name: string; unit: string; qty: number; unitPrice: number }>;
  };

  const txSeeds: TxSeed[] = [];

  const makeItems = (maxItems = 3): TxSeed["items"] => {
    const count = intBetween(1, maxItems);
    const chosen = new Set<number>();
    const items: TxSeed["items"] = [];
    for (let i = 0; i < count; i++) {
      const idx = intBetween(0, products.length - 1);
      if (chosen.has(idx)) continue;
      chosen.add(idx);
      const p = products[idx];
      const rawQty = p.unit === "কেজি" ? between(1, 8) : between(1, 4);
      const qty = p.unit === "কেজি" ? Number(rawQty.toFixed(1)) : Math.round(rawQty);
      items.push({
        productId: p.id,
        name: p.name,
        unit: p.unit,
        qty,
        unitPrice: p.sellPrice,
      });
    }
    return items.length ? items : makeItems(maxItems);
  };

  const itemsTotal = (items: TxSeed["items"]) =>
    round2(items.reduce((s, it) => s + it.qty * it.unitPrice, 0));

  for (const c of customers) {
    const heavy = ["পাইকারি", "রেস্টুরেন্ট", "চা-দোকান"].includes(c.tag);
    const entryCount = heavy ? intBetween(14, 18) : intBetween(5, 9);
    const usedDays = new Set<number>();

    for (let i = 0; i < entryCount; i++) {
      let day = intBetween(2, 88);
      let guard = 0;
      while (usedDays.has(day) && guard++ < 20) day = intBetween(2, 88);
      usedDays.add(day);

      const items = makeItems(heavy ? 4 : 2);
      const total = itemsTotal(items);
      const date = atHour(day, intBetween(7, 12), intBetween(0, 59));

      txSeeds.push({
        customerId: c.id,
        type: "DUE",
        amount: total,
        note: null,
        date,
        method: null,
        items,
      });

      if (chance(heavy ? 0.8 : 0.55)) {
        const payDay = Math.max(1, day - intBetween(1, 6));
        const payAmount = round2(chance(0.35) ? total * between(0.4, 0.9) : total * between(0.9, 1.6));
        txSeeds.push({
          customerId: c.id,
          type: "PAYMENT",
          amount: Math.max(50, payAmount),
          note: chance(0.3) ? "হাতে হাতে পরিশোধ" : null,
          date: atHour(payDay, intBetween(9, 14), intBetween(0, 59)),
          method: pick(["নগদ", "বিকাশ", "নগদ (অ্যাপ)", "রকেট"]),
          items: [],
        });
      }
    }
  }

  // আজকের লেনদেন — ড্যাশবোর্ড জীবন্ত রাখতে
  for (const idx of [0, 3, 5, 13, 9]) {
    const items = makeItems(3);
    txSeeds.push({
      customerId: customers[idx].id,
      type: "DUE",
      amount: itemsTotal(items),
      note: null,
      date: atHour(0, intBetween(8, 11), intBetween(0, 59)),
      method: null,
      items,
    });
  }
  for (const idx of [1, 8, 15]) {
    txSeeds.push({
      customerId: customers[idx].id,
      type: "PAYMENT",
      amount: Math.round(between(400, 3200) / 50) * 50,
      note: pick(["বিকাশে পাঠিয়েছেন", "নগদে দিয়েছেন", "আগের বাকি শোধ"]),
      date: atHour(0, intBetween(12, 17), intBetween(0, 59)),
      method: pick(["বিকাশ", "নগদ", "নগদ (অ্যাপ)"]),
      items: [],
    });
  }
  for (let i = 0; i < 3; i++) {
    const items = makeItems(3);
    txSeeds.push({
      customerId: null,
      type: "CASH_SALE",
      amount: itemsTotal(items),
      note: "নগদ বিক্রি",
      date: atHour(0, intBetween(9, 19), intBetween(0, 59)),
      method: "নগদ",
      items,
    });
  }
  for (let i = 0; i < 5; i++) {
    const items = makeItems(3);
    txSeeds.push({
      customerId: null,
      type: "CASH_SALE",
      amount: itemsTotal(items),
      note: "নগদ বিক্রি",
      date: atHour(1, intBetween(9, 20), intBetween(0, 59)),
      method: "নগদ",
      items,
    });
  }
  txSeeds.push({
    customerId: customers[10].id,
    type: "DISCOUNT",
    amount: 150,
    note: "ভাঙা মাল ফেরতের সমন্বয়",
    date: atHour(9, 11, 20),
    method: null,
    items: [],
  });
  txSeeds.push({
    customerId: customers[2].id,
    type: "DISCOUNT",
    amount: 80,
    note: "ছোট ছাড়",
    date: atHour(21, 16, 40),
    method: null,
    items: [],
  });

  // কয়েকজনের হিসাব সম্পূর্ণ পরিষ্কার
  for (const idx of [8, 15, 12]) {
    const c = customers[idx];
    const net = txSeeds
      .filter((t) => t.customerId === c.id)
      .reduce(
        (s, t) =>
          s + (t.type === "DUE" ? t.amount : t.type === "PAYMENT" || t.type === "DISCOUNT" ? -t.amount : 0),
        0,
      );
    const settle = round2(c.openingBalance + net);
    if (settle > 0) {
      txSeeds.push({
        customerId: c.id,
        type: "PAYMENT",
        amount: settle,
        note: "সম্পূর্ণ হিসাব পরিশোধ",
        date: atHour(intBetween(1, 5), 19, intBetween(0, 59)),
        method: "নগদ",
        items: [],
      });
    }
  }

  txSeeds.sort((a, b) => a.date.getTime() - b.date.getTime());
  for (const t of txSeeds) {
    repo.createTransaction({
      userId: uid!,
      customerId: t.customerId,
      type: t.type,
      amount: t.amount,
      note: t.note,
      date: t.date.toISOString(),
      method: t.method,
      items: t.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        unit: it.unit,
        qty: it.qty,
        unitPrice: it.unitPrice,
      })),
    });
  }

  /* ---------- খরচ ---------- */
  type ExpenseSeed = {
    category: string;
    amount: number;
    note: string;
    paidTo: string;
    method: string;
    date: Date;
  };
  const expenseSeeds: ExpenseSeed[] = [];
  for (const e of EXPENSES) {
    const occurrences = e.freq === 0 ? 1 : e.freq * 3;
    for (let i = 0; i < occurrences; i++) {
      const day = intBetween(1, 88);
      expenseSeeds.push({
        category: e.category,
        amount: Math.round(between(e.min, e.max) / 10) * 10,
        note: e.note,
        paidTo: e.paidTo,
        method: pick(["নগদ", "বিকাশ", "ব্যাংক"]),
        date: atHour(day, intBetween(10, 18), intBetween(0, 59)),
      });
    }
  }
  expenseSeeds.push({
    category: "পরিবহন",
    amount: 350,
    note: "সকালে মাল আনানোর ভ্যান ভাড়া",
    paidTo: "ভ্যান চালক করিম",
    method: "নগদ",
    date: atHour(0, 8, 45),
  });
  expenseSeeds.push({
    category: "চা-নাস্তা",
    amount: 120,
    note: "সহকারীর নাস্তা",
    paidTo: "পাশের হোটেল",
    method: "নগদ",
    date: atHour(0, 13, 15),
  });
  for (const e of expenseSeeds) {
    repo.createExpense(uid, { ...e, date: e.date.toISOString() });
  }

  /* ---------- সাপ্লায়ার ---------- */
  for (const s of SUPPLIERS) {
    const supplier = repo.createSupplier(uid, {
      name: s.name,
      phone: s.phone,
      address: s.address,
      note: `${s.tag} সরবরাহকারী`,
      openingBalance: s.opening,
      isActive: true,
    });
    const purchases = intBetween(3, 5);
    for (let i = 0; i < purchases; i++) {
      const day = intBetween(3, 85);
      repo.createSupplierTransaction(uid, {
        supplierId: supplier.id,
        type: "PURCHASE",
        amount: Math.round(between(3000, 22000) / 100) * 100,
        note: pick(["মাল কেনা", "নতুন স্টক", "অর্ডার সরবরাহ", "বাকিতে মাল"]),
        date: atHour(day, intBetween(9, 16), intBetween(0, 59)).toISOString(),
      });
      if (chance(0.75)) {
        repo.createSupplierTransaction(uid, {
          supplierId: supplier.id,
          type: "PAYMENT",
          amount: Math.round(between(2000, 15000) / 100) * 100,
          note: pick(["বিকাশে পরিশোধ", "নগদে পরিশোধ", "হিসাব সমন্বয়"]),
          date: atHour(Math.max(1, day - intBetween(1, 8)), intBetween(10, 18), intBetween(0, 59)).toISOString(),
        });
      }
    }
    repo.createSupplierTransaction(uid, {
      supplierId: supplier.id,
      type: "PURCHASE",
      amount: Math.round(between(4000, 16000) / 100) * 100,
      note: "সাপ্তাহিক স্টক অর্ডার",
      date: atHour(0, intBetween(8, 11), intBetween(0, 59)).toISOString(),
    });
  }

  /* ---------- তাগাদা ---------- */
  for (const idx of [0, 3, 5, 13, 10, 11]) {
    repo.createReminder(uid, {
      customerId: customers[idx].id,
      channel: pick(["whatsapp", "sms", "call", "in_person"]),
      message: "বাকির বিষয়ে মনে করিয়ে দেওয়া হয়েছে",
      amount: Math.round(between(500, 6000) / 50) * 50,
      status: pick(["sent", "sent", "promised", "later"]),
    });
  }

  /* ---------- নোটবুক ---------- */
  for (const n of NOTES) {
    repo.createNote(uid, n);
  }

  /* ---------- অ্যাক্টিভিটি ---------- */
  const recent = repo.listTransactions(uid, { take: 14, order: "desc" });
  for (const t of recent) {
    repo.createActivity(uid, {
      action: "create",
      entity: "transaction",
      entityId: t.id,
      title:
        t.type === "DUE"
          ? `${t.customer?.name ?? "নগদ ক্রেতা"} বাকিতে মাল নিয়েছেন`
          : t.type === "PAYMENT"
            ? `${t.customer?.name ?? ""} জমা দিয়েছেন`
            : t.type === "DISCOUNT"
              ? `${t.customer?.name ?? ""} কে ছাড় দেওয়া হয়েছে`
              : "নগদ বিক্রি হয়েছে",
      detail: t.note,
      amount: t.amount,
    });
  }

  return { userId: uid };
}

/** bcrypt-এর sync ভার্সন — সিড স্ক্রিপ্টে সুবিধার জন্য */
function hashPasswordSync(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bcrypt = require("bcryptjs") as typeof import("bcryptjs");
  return bcrypt.hashSync(DEMO_PASSWORD, 10);
}

/** ডেটাবেস খালি থাকলে স্বয়ংক্রিয়ভাবে ডেমো ডেটা তৈরি করে */
export async function ensureDemoSeed(): Promise<boolean> {
  if (countUsers() > 0) return false;
  seedDemoData();
  return true;
}

/** নতুন রেজিস্টার করা দোকানের জন্য হালকা স্টার্টার পণ্য */
export function seedStarterProducts(userId: string) {
  for (const p of PRODUCTS.slice(0, 12)) {
    repo.createProduct(userId, {
      name: p.name,
      category: p.category,
      unit: p.unit,
      sellPrice: p.sell,
      buyPrice: p.buy,
      stock: 0,
      lowStockAt: p.low,
      isActive: true,
    });
  }
}
