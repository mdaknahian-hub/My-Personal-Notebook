"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookUser,
  Eye,
  EyeOff,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { Field, Input } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/providers/theme";
import { cn } from "@/lib/utils";
import { toEnDigits } from "@/lib/format";

const DEMO = { phone: "01712345678", password: "dokan1234" };

export function LoginForm({ seeded }: { seeded: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { resolved, setTheme } = useTheme();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [login, setLogin] = useState({ phone: DEMO.phone, password: DEMO.password });
  const [register, setRegister] = useState({
    name: "",
    shopName: "",
    phone: "",
    password: "",
    shopAddress: "",
  });

  const submit = async (payload: Record<string, unknown>, url: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "কিছু একটা ভুল হয়েছে");
        setLoading(false);
        return;
      }
      toast.success(
        mode === "login" ? "স্বাগতম!" : "অ্যাকাউন্ট তৈরি হয়েছে",
        payload.shopName ? String(payload.shopName) : "দোকান হিসাব",
      );
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না");
      setLoading(false);
    }
  };

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();
    submit({ phone: toEnDigits(login.phone).trim(), password: login.password }, "/api/auth/login");
  };

  const onRegister = (e: React.FormEvent) => {
    e.preventDefault();
    submit(
      {
        name: register.name.trim(),
        shopName: register.shopName.trim(),
        phone: toEnDigits(register.phone).trim(),
        password: register.password,
        shopAddress: register.shopAddress.trim() || null,
      },
      "/api/auth/register",
    );
  };

  const demoLogin = () =>
    submit({ phone: DEMO.phone, password: DEMO.password }, "/api/auth/login");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--bg)]">
      {/* সাজসজ্জা */}
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 size-96 rounded-full bg-teal-500/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-8 px-4 py-8 lg:flex-row lg:gap-14">
        {/* বাঁ দিকের পরিচিতি */}
        <div className="w-full max-w-lg lg:flex-1">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-teal-600 text-white shadow-lg shadow-emerald-600/25">
              <Store className="size-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold leading-tight">দোকান হিসাব</p>
              <p className="text-xs text-muted">বাকির খাতা ও দোকান ব্যবস্থাপনা</p>
            </div>
            <button
              type="button"
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
              className="ml-auto rounded-xl border bg-[var(--surface)] px-3 py-2 text-xs font-semibold"
            >
              {resolved === "dark" ? "লাইট" : "ডার্ক"}
            </button>
          </div>

          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            প্রতিটি কাস্টমারের <span className="text-brand-600 dark:text-brand-400">বাকির হিসাব</span>
            <br className="hidden sm:block" /> এখন আপনার মোবাইলেই
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            মনোহারী দোকানের জন্য বানানো স্মার্ট ব্যবস্থাপনা — কাস্টমার খাতা, লেনদেন,
            স্টক, খরচ, সাপ্লায়ার, তাগাদা ও রিপোর্ট। মালিকের মোবাইল হোক principal,
            হিসাব থাকুক অ্যাপে।
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { icon: <BookUser className="size-4" />, title: "আলাদা খাতা", text: "প্রতিটি কাস্টমারের আলাদা সূচিপত্র" },
              { icon: <Wallet className="size-4" />, title: "বাকি ও জমা", text: "এক ট্যাপে হিসাব লিখুন" },
              { icon: <Package className="size-4" />, title: "স্টক নিয়ন্ত্রণ", text: "কম স্টকে আগেই সতর্কতা" },
              { icon: <BarChart3 className="size-4" />, title: "রিপোর্ট", text: "মাসিক লাভ-ক্ষতি ও ট্রেন্ড" },
            ].map((f) => (
              <div key={f.title} className="card p-3.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  {f.icon}
                </div>
                <p className="mt-2 text-sm font-bold">{f.title}</p>
                <p className="text-xs text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ডান দিকের ফর্ম */}
        <div className="w-full max-w-md lg:flex-1">
          <div className="card animate-fade-up p-5 sm:p-6">
            <div className="mb-4 flex rounded-2xl border bg-[var(--surface-2)] p-1">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-sm font-bold transition",
                    mode === m
                      ? "bg-[var(--surface)] shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      : "text-muted",
                  )}
                >
                  {m === "login" ? "লগইন" : "নতুন দোকান"}
                </button>
              ))}
            </div>

            {seeded ? (
              <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Sparkles className="mt-0.5 size-4 shrink-0" />
                <p>
                  ডেমো দোকানের সব ডেটা তৈরি করা হয়েছে — ১৮ জন কাস্টমার, বাকি-জমার
                  হিসাব, স্টক ও রিপোর্ট। নিচের বাটনে চাপ দিয়ে সরাসরি দেখে নিন।
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 rounded-2xl bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            {mode === "login" ? (
              <form onSubmit={onLogin} className="space-y-4">
                <Field label="মোবাইল নম্বর" required>
                  <Input
                    value={login.phone}
                    onChange={(e) => setLogin((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="০১৭XXXXXXXX"
                    inputMode="tel"
                    autoComplete="username"
                  />
                </Field>
                <Field label="পাসওয়ার্ড" required>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={login.password}
                      onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))}
                      placeholder="পাসওয়ার্ড"
                      autoComplete="current-password"
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                      aria-label="পাসওয়ার্ড দেখুন"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
                <button type="submit" disabled={loading} className="btn btn-primary w-full py-3.5">
                  {loading ? "প্রবেশ করা হচ্ছে..." : "লগইন করুন"}
                  {!loading ? <ArrowRight className="size-4" /> : null}
                </button>

                <button
                  type="button"
                  onClick={demoLogin}
                  disabled={loading}
                  className="btn btn-ghost w-full py-3"
                >
                  <Sparkles className="size-4 text-brand-500" />
                  ডেমো দোকান দেখুন (এক ক্লিকে)
                </button>

                <div className="rounded-2xl bg-[var(--surface-2)] p-3 text-xs">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="size-3.5 text-brand-600" /> ডেমো লগইন
                  </p>
                  <p className="mt-1 text-muted">
                    মোবাইল: <span className="font-semibold">{DEMO.phone}</span> • পাসওয়ার্ড:{" "}
                    <span className="font-semibold">{DEMO.password}</span>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={onRegister} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="আপনার নাম" required>
                    <Input
                      value={register.name}
                      onChange={(e) => setRegister((p) => ({ ...p, name: e.target.value }))}
                      placeholder="মালিকের নাম"
                    />
                  </Field>
                  <Field label="দোকানের নাম" required>
                    <Input
                      value={register.shopName}
                      onChange={(e) => setRegister((p) => ({ ...p, shopName: e.target.value }))}
                      placeholder="যেমন: নাহিয়ান স্টোর"
                    />
                  </Field>
                </div>
                <Field label="মোবাইল নম্বর" required hint="এটি দিয়েই লগইন করবেন">
                  <Input
                    value={register.phone}
                    onChange={(e) => setRegister((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="০১৭XXXXXXXX"
                    inputMode="tel"
                    autoComplete="username"
                  />
                </Field>
                <Field label="দোকানের ঠিকানা">
                  <Input
                    value={register.shopAddress}
                    onChange={(e) => setRegister((p) => ({ ...p, shopAddress: e.target.value }))}
                    placeholder="বাজার / রোড / এলাকা"
                  />
                </Field>
                <Field label="পাসওয়ার্ড" required hint="কমপক্ষে ৪ অক্ষর">
                  <Input
                    type="password"
                    value={register.password}
                    onChange={(e) => setRegister((p) => ({ ...p, password: e.target.value }))}
                    placeholder="পাসওয়ার্ড দিন"
                    autoComplete="new-password"
                  />
                </Field>
                <button type="submit" disabled={loading} className="btn btn-primary w-full py-3.5">
                  {loading ? "তৈরি হচ্ছে..." : "দোকান খুলে ফেলুন"}
                  {!loading ? <ArrowRight className="size-4" /> : null}
                </button>
                <p className="text-center text-xs text-muted">
                  নতুন দোকানে স্টার্টার পণ্যের তালিকা দেওয়া হবে — যা ব্যবহার করে শুরু
                  করে ফেলতে পারবেন।
                </p>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] text-muted">
            আপনার ডেটা এই ডিভাইসেই নিরাপদভাবে সংরক্ষিত থাকে। মোবাইল ব্রাউজারে
            &quot;Add to Home Screen&quot; করলে অ্যাপের মতো ব্যবহার করতে পারবেন।
          </p>
        </div>
      </div>
    </div>
  );
}
