/**
 * PWA প্রস্তুতি যাচাই — PWABuilder-এ দেওয়ার আগে চালান।
 *
 * চালানো: npm run pwa:check
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const f = (p) => join(root, p);

let pass = 0;
let fail = 0;
const ok = (msg) => { pass++; console.log("  ✓", msg); };
const bad = (msg) => { fail++; console.log("  ✗", msg); };

console.log("\n🔍 PWA প্রস্তুতি যাচাই\n");

/* ---- 1. সার্ভিস ওয়ার্কার ---- */
console.log("• সার্ভিস ওয়ার্কার (public/sw.js)");
if (!existsSync(f("public/sw.js"))) bad("public/sw.js নেই");
else {
  const sw = readFileSync(f("public/sw.js"), "utf-8");
  sw.includes('addEventListener("fetch"') || sw.includes("addEventListener('fetch'")
    ? ok("fetch হ্যান্ডলার আছে")
    : bad("fetch হ্যান্ডলার নেই");
  sw.includes("/offline") ? ok("অফলাইন ফলব্যাক আছে") : bad("অফলাইন ফলব্যাক নেই");
  sw.includes("skipWaiting") ? ok("skipWaiting আছে") : bad("skipWaiting নেই");
}

/* ---- 2. ম্যানিফেস্ট ---- */
console.log("• ম্যানিফেস্ট (src/app/manifest.ts)");
if (!existsSync(f("src/app/manifest.ts"))) bad("manifest.ts নেই");
else {
  const m = readFileSync(f("src/app/manifest.ts"), "utf-8");
  const need = [
    ["start_url", "start_url"],
    ["scope", "scope"],
    ['display', "display"],
    ["192x192", "192px আইকন"],
    ["512x512", "512px আইকন"],
    ["maskable", "maskable আইকন"],
    ["theme_color", "theme_color"],
    ["short_name", "short_name"],
  ];
  for (const [key, label] of need) {
    m.includes(key) ? ok(`${label} আছে`) : bad(`${label} নেই`);
  }
}

/* ---- 3. আইকন PNG ---- */
console.log("• আইকন ফাইল");
const icons = [
  ["public/icons/icon-192.png", 192, 192],
  ["public/icons/icon-512.png", 512, 512],
  ["public/icons/maskable-512.png", 512, 512],
  ["public/apple-touch-icon.png", 180, 180],
];
for (const [rel, w, h] of icons) {
  if (!existsSync(f(rel))) { bad(`${rel} নেই — 'npm run icons' চালান`); continue; }
  const buf = readFileSync(f(rel));
  const isPng = buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!isPng) bad(`${rel} — PNG নয়`);
  else if (width !== w || height !== h) bad(`${rel} — সাইজ ${width}x${height}, দরকার ${w}x${h}`);
  else ok(`${rel} (${w}x${h})`);
}

/* ---- 4. সংযোগ পরীক্ষা + অফলাইন পেজ ---- */
console.log("• অফলাইন সাপোর্ট");
existsSync(f("src/app/api/ping/route.ts")) ? ok("/api/ping রুট আছে") : bad("/api/ping রুট নেই");
existsSync(f("src/app/offline/page.tsx")) ? ok("/offline পেজ আছে") : bad("/offline পেজ নেই");
existsSync(f("src/lib/offline-queue.ts")) ? ok("অফলাইন কিউ লাইব্রেরি আছে") : bad("offline-queue.ts নেই");
existsSync(f("src/components/providers/offline.tsx")) ? ok("OfflineProvider আছে") : bad("OfflineProvider নেই");

/* ---- 5. কনফিগ ---- */
console.log("• কনফিগ");
const nextCfg = existsSync(f("next.config.ts")) ? readFileSync(f("next.config.ts"), "utf-8") : "";
nextCfg.includes('"/sw.js"') ? ok("sw.js ক্যাশ হেডার আছে") : bad("sw.js ক্যাশ হেডার নেই");
const layout = existsSync(f("src/app/layout.tsx")) ? readFileSync(f("src/app/layout.tsx"), "utf-8") : "";
layout.includes("OfflineProvider") ? ok("OfflineProvider লেআউটে যুক্ত") : bad("OfflineProvider লেআউটে নেই");
layout.includes("apple-touch-icon") ? ok("apple-touch-icon যুক্ত") : bad("apple-touch-icon নেই");

console.log(`\nফলাফল: ${pass}টি ঠিক, ${fail}টি সমস্যা`);
if (fail > 0) {
  console.log("❌ PWABuilder-এর আগে ওপরের সমস্যাগুলো ঠিক করুন\n");
  process.exit(1);
}
console.log("✅ PWA প্রস্তুত — ডিপ্লয় করে PWABuilder-এ URL দিন (docs/PWABUILDER-APK.md দেখুন)\n");
