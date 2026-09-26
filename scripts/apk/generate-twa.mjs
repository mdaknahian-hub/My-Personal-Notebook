#!/usr/bin/env node
/**
 * TWA (Android) প্রজেক্ট তৈরি — Bubblewrap ইন্টারেক্টিভ CLI ছাড়াই,
 * @bubblewrap/core সরাসরি ব্যবহার করে। GitHub Actions থেকে চলে।
 *
 * ব্যবহার:
 *   node scripts/apk/generate-twa.mjs --url https://dokan-hishab.onrender.com \
 *     --out twa --package-id com.dokanhishab.app --version-name 1.0.0 \
 *     --version-code 42 --keystore android-signing/dokan-release.keystore
 *
 * দরকারি env: JAVA_HOME, ANDROID_HOME (বা ANDROID_SDK_ROOT),
 *   BUBBLEWRAP_KEYSTORE_PASSWORD, BUBBLEWRAP_KEY_PASSWORD
 *
 * আগে একবার চালান: npm --prefix scripts/apk install --no-save @bubblewrap/cli
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// @bubblewrap/core খোঁজা: scripts/apk/node_modules → npx ক্যাশ → global
function loadCore() {
  const candidates = [
    join(here, "node_modules", "@bubblewrap", "core"),
    join(here, "node_modules", "@bubblewrap", "cli", "node_modules", "@bubblewrap", "core"),
  ];
  const require = createRequire(import.meta.url);
  for (const p of candidates) {
    try {
      return require(p);
    } catch {
      /* পরেরটা */
    }
  }
  try {
    return require("@bubblewrap/core");
  } catch {
    console.error("✗ @bubblewrap/core পাওয়া যায়নি — আগে চালান:");
    console.error("  npm --prefix scripts/apk install --no-save @bubblewrap/cli");
    process.exit(1);
  }
}

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= process.argv.length) return def;
  return process.argv[i + 1];
}

const url = (arg("url") ?? "").replace(/\/+$/, "");
const manifestPath = arg("manifest-path", "/manifest.webmanifest");
const manifestUrl = `${url}${manifestPath.startsWith("/") ? "" : "/"}${manifestPath}`;
const outDir = resolve(arg("out", "twa"));
const packageId = arg("package-id", "com.dokanhishab.app");
const versionName = arg("version-name", "1.0.0");
const versionCode = Number(arg("version-code", "1"));
const keystorePath = resolve(arg("keystore", "android-signing/dokan-release.keystore"));
const keyAlias = arg("key-alias", "dokan");
const keystorePass = process.env.BUBBLEWRAP_KEYSTORE_PASSWORD;
const keyPass = process.env.BUBBLEWRAP_KEY_PASSWORD;

if (!url.startsWith("https://")) {
  console.error("✗ --url অবশ্যই https:// দিয়ে শুরু হতে হবে:", url || "(খালি)");
  process.exit(1);
}
if (!keystorePass || !keyPass) {
  console.error("✗ BUBBLEWRAP_KEYSTORE_PASSWORD ও BUBBLEWRAP_KEY_PASSWORD env দিন");
  process.exit(1);
}
if (!process.env.JAVA_HOME) {
  console.error("✗ JAVA_HOME env দিন (JDK 17)");
  process.exit(1);
}

const core = loadCore();
const { TwaManifest, TwaGenerator, Config, JdkHelper, KeyTool, ConsoleLog } = core;
const log = new ConsoleLog("generate-twa");

console.log("node:", process.version, "| cwd:", process.cwd());
console.log("→ ওয়েব ম্যানিফেস্ট পড়া হচ্ছে:", manifestUrl);
let twa;
try {
  twa = await TwaManifest.fromWebManifest(manifestUrl);
} catch (e) {
  console.error("✗ ম্যানিফেস্ট আনা যায়নি:", e?.message ?? e);
  if (e?.cause) console.error("  কারণ:", e.cause?.message ?? e.cause);
  process.exit(1);
}

// --- আমাদের মান বসানো ---
twa.packageId = packageId;
twa.name = "দোকান হিসাব";
twa.launcherName = "দোকান হিসাব";
twa.appVersionName = versionName;
twa.appVersionCode = Number.isFinite(versionCode) ? versionCode : 1;
twa.fallbackType = "customtabs";
twa.enableNotifications = false;
twa.splashScreenFadeOutDuration = 300;
twa.signingKey = { path: keystorePath, alias: keyAlias };

// --- সাইনিং কী (না থাকলে তৈরি — workflow রিপোতে কমিট করে রাখবে) ---
if (!existsSync(keystorePath)) {
  console.log("→ নতুন সাইনিং কী তৈরি হচ্ছে:", keystorePath);
  await mkdir(dirname(keystorePath), { recursive: true });
  const config = new Config(process.env.JAVA_HOME, process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? "");
  const keytool = new KeyTool(new JdkHelper(process, config));
  await keytool.createSigningKey({
    fullName: "Dokan Hishab",
    organizationalUnit: "Shop",
    organization: "Dokan Hishab",
    country: "BD",
    password: keystorePass,
    keypassword: keyPass,
    alias: keyAlias,
    path: keystorePath,
  });
  console.log("✓ সাইনিং কী তৈরি — এই ফাইল হারালে আপডেট করা যাবে না!");
} else {
  console.log("→ আগের সাইনিং কী-ই ব্যবহার হচ্ছে:", keystorePath);
}

// --- ডায়াগনস্টিক ডাম্প ---
console.log("  host     :", JSON.stringify(twa.host));
console.log("  startUrl :", JSON.stringify(twa.startUrl));
console.log("  iconUrl  :", JSON.stringify(twa.iconUrl ?? null));
console.log("  maskable :", JSON.stringify(twa.maskableIconUrl ?? null));
console.log("  shortcuts:", twa.shortcuts?.length ?? 0);

// --- প্রজেক্ট তৈরি ---
await mkdir(outDir, { recursive: true });
const manifestFile = join(outDir, "twa-manifest.json");
await twa.saveToFile(manifestFile);
const sum = createHash("sha1").update(await readFile(manifestFile)).digest("hex");
await writeFile(join(outDir, "manifest-checksum.txt"), sum);
console.log("→ Android প্রজেক্ট তৈরি হচ্ছে:", outDir);
await new TwaGenerator().createTwaProject(outDir, twa, log);

console.log("\n✅ TWA প্রজেক্ট প্রস্তুত");
console.log("   host       :", twa.host);
console.log("   startUrl   :", twa.startUrl);
console.log("   packageId  :", twa.packageId);
console.log("   version    :", `${twa.appVersionName} (${twa.appVersionCode})`);
console.log("   icon       :", twa.iconUrl);
console.log("   maskable   :", twa.maskableIconUrl ?? "(নেই)");
console.log("   shortcuts  :", twa.shortcuts?.length ?? 0, "টি");
