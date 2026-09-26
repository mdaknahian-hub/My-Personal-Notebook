# ☁️ ক্লাউড হোস্টিং + 📦 PWABuilder দিয়ে APK বানানো

দোকান হিসাব অ্যাপটা PWA (Progressive Web App) হিসেবে তৈরি — ম্যানিফেস্ট,
সার্ভিস ওয়ার্কার, অফলাইন সাপোর্ট সব আছে। এই গাইডে: **(১)** অ্যাপটা ক্লাউডে
হোস্ট করা, **(২)** PWABuilder দিয়ে Android APK/AAB বানানো — ধাপে ধাপে।

> ⏱️ মোট সময়: হোস্টিং ~১৫ মিনিট + APK ~১০ মিনিট (প্রথমবার)।

---

## ধাপ ০ — প্রস্তুতি যাচাই (নিজের কম্পিউটারে)

```bash
npm install
npm run pwa:check    # ম্যানিফেস্ট, আইকন, SW, /api/ping, /offline — সব ঠিক আছে কি না
npm run build        # প্রোডাকশন বিল্ড সফল হয় কি না
```

`pwa:check`-এ সব ✓ এলে পরের ধাপে যান।

---

## ধাপ ১ — ক্লাউডে হোস্ট করা

### ⚠️ হোস্টিং বাছার আগে জরুরি কথা

এই অ্যাপের ডেটা থাকে **SQLite ফাইলে** (`DATABASE_URL`)। তাই এমন হোস্টিং দরকার
যেখানে **persistent disk/volume** আছে — নাহলে প্রত্যেক রিডিপ্লয়ে হিসাব মুছে যাবে।

| হোস্টিং | SQLite টিকবে? | মন্তব্য |
| --- | --- | --- |
| **Render** (Docker + Disk) | ✅ হ্যাঁ | **সুপারিশকৃত** — ফ্রি টিয়ারে শুরু করা যায় |
| Railway / Fly.io (volume সহ) | ✅ হ্যাঁ | ভালো বিকল্প |
| নিজের VPS (Docker) | ✅ হ্যাঁ | পূর্ণ নিয়ন্ত্রণ |
| Vercel / Netlify | ❌ না (ephemeral) | শুধু ডেমো দেখতে হলে ঠিক আছে, আসল হিসাবে নয় |

### ১.১ — Render-এ ডিপ্লয় (সুপারিশকৃত)

> ⚡ **দ্রুত পথ:** নিচের বাটনে চাপ দিন — `render.yaml` থেকে সব সেটিং নিজে থেকে বসবে।
> রিপো সিলেক্টের সময় ব্রাঞ্চ হিসেবে `arena/01a0dc24-my-personal-notebook` বেছে নিন
> (অথবা PR মার্জ করে `main` থেকে ডিপ্লয় করুন)।
>
> [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mdaknahian-hub/My-Personal-Notebook)
>
> হাতে করতে চাইলে:

1. কোড GitHub-এ পুশ করুন (`arena/01a0dc24-my-personal-notebook` ব্রাঞ্চ বা `main`-এ মার্জ করে)।
2. [render.com](https://render.com) → **New → Web Service** → রিপো সিলেক্ট করুন।
3. সেটিংস:
   - **Runtime:** `Docker` (রিপোর `Dockerfile` নিজে থেকে ধরা পড়বে)
   - **Plan:** Free/Starter
   - **Environment Variables:**
     - `AUTH_SECRET` = অন্তত ৩২ অক্ষরের গোপন স্ট্রিং (যেমন `openssl rand -hex 32`-এর আউটপুট)
     - `DATABASE_URL` = `/data/dokan.db`
4. **Disks → Add Disk:** Mount Path `/data`, Size 1 GB (ফ্রি টিয়ারে ডিস্ক না থাকলে
   Starter প্ল্যান নিন — নাহলে ডেটা টিকবে না)।
5. **Deploy** চাপুন। ৩–৫ মিনিটে লাইভ হবে, যেমন `https://dokan-hishab.onrender.com`।
6. ব্রাউজারে খুলে ডেমো লগইন করুন (`01712345678` / `dokan1234`)।

### ১.২ — VPS-এ Docker দিয়ে (বিকল্প)

```bash
# সার্ভারে (Ubuntu + Docker ইনস্টল থাকতে হবে)
git clone <repo-url> && cd My-Personal-Notebook
docker build -t dokan-hishab .
docker run -d --restart unless-stopped --name dokan \
  -p 127.0.0.1:3000:3000 \
  -v dokan-data:/data \
  -e AUTH_SECRET="অন্তত-৩২-অক্ষরের-গোপন-স্ট্রিং" \
  dokan-hishab
# এরপর Nginx/Caddy দিয়ে HTTPS (ডোমেন) বসান — PWA-র জন্য HTTPS বাধ্যতামূলক
```

> macOS/Windows ল্যাপটপে ডকার বিল্ড করলে `--platform linux/amd64` ফ্ল্যাগ দিতে হতে পারে।

---

## ধাপ ২ — PWA ঠিকমতো লাইভ হয়েছে কি না যাচাই

হোস্টিং URL (ধরুন `https://dokan-hishab.onrender.com`) দিয়ে এগুলো পরীক্ষা করুন:

1. **সংযোগ পরীক্ষা:** `https://…/api/ping` খুললে `{"ok":true,…}` আসবে।
2. **ম্যানিফেস্ট:** `https://…/manifest.webmanifest` খুললে JSON আসবে।
3. **সার্ভিস ওয়ার্কার:** `https://…/sw.js` খুললে JS আসবে।
4. **অফলাইন পেজ:** `https://…/offline` লগইন ছাড়াই খুলবে।
5. **Chrome DevTools → Application → Manifest:** কোনো এরর নেই, আইকনগুলো দেখা যায়।
6. **Chrome DevTools → Application → Service Workers:** `sw.js` activated + running।
7. **Lighthouse (Chrome DevTools → Lighthouse → PWA):** স্কোর সবুজ হলে ✅।
8. **ফোনে Chrome দিয়ে সাইট খুলুন → মেনু → “Install app”** এলে PWA ইনস্টলযোগ্য ✅।

---

## ধাপ ৩ — PWABuilder দিয়ে Android APK বানানো

[PWABuilder.com](https://www.pwabuilder.com) মাইক্রোসফটের ফ্রি টুল — PWA থেকে
Play Store-উপযোগী Android প্যাকেজ (AAB/APK) বানায়।

### ৩.১ — প্যাকেজ তৈরি

1. [pwabuilder.com](https://www.pwabuilder.com) খুলুন।
2. বক্সে হোস্টিং URL দিন (যেমন `https://dokan-hishab.onrender.com`) → **Start**।
3. রিপোর্টে Manifest / Service Worker / Security (HTTPS) সব ✅ হওয়া উচিত।
   কোনোটা লাল হলে ধাপ ২-এর যাচাই আবার করুন।
4. **Package for Stores** → **Android** → **Next**।
5. অপশনগুলো এভাবে দিন:

   | ফিল্ড | মান |
   | --- | --- |
   | Package ID | `com.dokanhishab.app` |
   | App name | `দোকান হিসাব` |
   | App version / Version code | `1.0.0` / `1` |
   | Host | আপনার ডোমেন (auto) |
   | Start URL | `/dashboard` |
   | Display mode | `standalone` |
   | Signing key | **New** (প্রথমবার) — keystore ফাইল ও পাসওয়ার্ড নিরাপদে রাখুন! |
   | Icons | manifest থেকে auto (192/512/maskable সব যাবে) |
   | Shortcuts | ✅ চালু রাখুন (নতুন এন্ট্রি, খাতা) |
   | Share target / Push | আপাতত অফ রাখুন |

6. **Download** চাপুন → `android.zip` নামবে। ভেতরে থাকবে:
   - `app-release-signed.apk` — সরাসরি ফোনে ইনস্টল করা যায়
   - `app-release-bundle.aab` — Play Store-এ আপলোডের জন্য
   - `signing.keystore` — **হারাবেন না!** পরের আপডেটে একই key লাগবে

### ৩.২ — ফোনে ইনস্টল (APK)

1. APK ফাইলটা ফোনে পাঠান (WhatsApp/Drive/USB)।
2. ফোনে APK-তে ট্যাপ করুন → “Unknown sources / অজানা উৎস” অনুমতি দিন → **Install**।
3. হোম স্ক্রিনে **দোকান হিসাব** আইকন আসবে — খুললেই ফুল-স্ক্রিন অ্যাপ,
   নোটিফিকেশন বারে ব্রাউজার থাকবে না।

### ৩.৩ — Play Store-এ দিতে চাইলে (AAB)

1. [Play Console](https://play.google.com/console) অ্যাকাউন্ট ($25 এককালীন)।
2. **Create app** → `app-release-bundle.aab` আপলোড → store listing (বাংলা বিবরণ,
   স্ক্রিনশট) → review-তে পাঠান।
3. ⚠️ **Asset Links:** Play-এর ফর্মে SHA-256 fingerprint দিলে PWABuilder-এর
   নির্দেশনা অনুযায়ী `/.well-known/assetlinks.json`-এ সেটা বসাতে হবে, যাতে
   অ্যাপে URL বার না দেখায়। (দরকার হলে এই ফাইলটা `public/.well-known/`-এ যোগ
   করে রিডিপ্লয় করুন।)

---

## ধাপ ৪ — পরের আপডেট (নতুন ভার্সন)

1. কোড বদলে হোস্টিংয়ে রিডিপ্লয় করুন (ওয়েব + ইনস্টল করা PWA নিজে থেকে আপডেট হয় —
   সার্ভিস ওয়ার্কার নতুন ভার্সন তুলে নেয়)।
2. APK/AAB-ও আপডেট করতে চাইলে PWABuilder-এ আবার প্যাকেজ করুন:
   - একই **Package ID**,
   - **Version code বাড়িয়ে** (1 → 2 → 3…),
   - একই **signing keystore** (৩.১-এ যেটা পেয়েছিলেন)।
3. নতুন APK ফোনে ইনস্টল করলে (আগেরটার ওপরেই) আপডেট হয়ে যাবে — হিসাব মুছবে না
   (ডেটা সার্ভারে + ফোনের কিউ-তে থাকে)।

---

## 🧰 সমস্যা সমাধান

| সমস্যা | সমাধান |
| --- | --- |
| PWABuilder বলে “No service worker found” | URL-এ trailing slash ছাড়া দিন; `/sw.js` 200 দেয় কি না দেখুন; HTTP নয় HTTPS হতে হবে |
| “Manifest missing icons” | `/icons/icon-512.png` ও `maskable-512.png` খোলে কি না দেখুন |
| APK খুললে URL bar দেখায় | Asset Links (৩.৩) বসানো হয়নি — সideload করা APK-তে প্রথমবার নেট লাগে যাচাইয়ের জন্য |
| রিডিপ্লয়ে হিসাব মুছে গেছে | `/data` ভলিউম মাউন্ট করা হয়নি বা `DATABASE_URL` ভুল — ধাপ ১.১-এর ৪ নম্বর দেখুন |
| অফলাইন এন্ট্রি সিঙ্ক হচ্ছে না | সেটিংস → “অফলাইন ও সিঙ্ক” → সংযোগ পরীক্ষা; `/api/ping` 200 দেয় কি না দেখুন |
| পুরনো পেজ ক্যাশে আটকে আছে | সেটিংস → অ্যাপ ডেটা ক্লিয়ার, বা SW আপডেটের জন্য অ্যাপ বন্ধ করে আবার খুলুন |

---

## 📁 সংশ্লিষ্ট ফাইল

| ফাইল | কাজ |
| --- | --- |
| `src/app/manifest.ts` | PWA ম্যানিফেস্ট (নাম, আইকন, shortcuts) |
| `public/sw.js` | সার্ভিস ওয়ার্কার (অফলাইন পেজ + ক্যাশ) |
| `public/icons/*` | 192/512/maskable PNG (`npm run icons` দিয়ে পুনরায় বানানো যায়) |
| `src/app/api/ping/route.ts` | সংযোগ পরীক্ষা |
| `src/lib/offline-queue.ts` | localStorage কিউ |
| `src/components/providers/offline.tsx` | অনলাইন স্টেট + SW রেজিস্ট্রেশন |
| `src/components/providers/store.tsx` | সিঙ্ক ইঞ্জিন (tmp_ → আসল আইডি) |
| `Dockerfile` | ক্লাউড ডিপ্লয় ইমেজ |
| `scripts/pwa-check.mjs` | `npm run pwa:check` যাচাই স্ক্রিপ্ট |
