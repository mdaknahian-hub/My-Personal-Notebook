import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureDemoSeed } from "@/lib/seed";
import { LoginForm } from "./login-form";

export const metadata = { title: "লগইন" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  // প্রথমবার চালু হলে অ্যাপ যেন জীবন্ত লাগে — ডেমো ডেটা তৈরি
  let seeded = false;
  try {
    seeded = await ensureDemoSeed();
  } catch (error) {
    console.error("[seed]", error);
  }

  return <LoginForm seeded={seeded} />;
}
