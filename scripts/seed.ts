/**
 * ডেমো ডেটা সিড — `npm run db:seed`
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// .env ফাইল লোড
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  const { seedDemoData, DEMO_PHONE, DEMO_PASSWORD } = await import("../src/lib/seed");
  console.log("⏳ ডেমো ডেটা তৈরি হচ্ছে...");
  const { userId } = await seedDemoData();
  console.log(`✅ ডেমো ডেটা তৈরি হয়েছে (userId: ${userId})`);
  console.log(`   লগইন ফোন  : ${DEMO_PHONE}`);
  console.log(`   পাসওয়ার্ড : ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error("❌ সিড ব্যর্থ:", error);
  process.exit(1);
});
