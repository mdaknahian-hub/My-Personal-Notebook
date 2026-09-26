"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Download,
  Keyboard,
  LogOut,
  MessageSquare,
  Moon,
  Palette,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sun,
  Type,
  User,
} from "lucide-react";
import { Avatar, Badge, Card, SectionHeader, TONES } from "@/components/ui/bits";
import { OfflineSyncCard } from "@/components/pages/offline-sync-card";
import { ConfirmDialog } from "@/components/ui/modal";
import { Field, Input, MoneyInput, Segmented, Textarea } from "@/components/ui/fields";
import { useStore } from "@/components/providers/store";
import { useTheme } from "@/components/providers/theme";
import { useToast } from "@/components/ui/toast";
import { prettyPhone, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SettingsClient() {
  const { user, customers, products, transactions, temp, bn } = useStore();
  const { resolved, setTheme } = useTheme();
  const toast = useToast();
  const router = useRouter();

  const [shop, setShop] = useState({
    name: user.name,
    shopName: user.shopName,
    shopAddress: user.shopAddress ?? "",
    shopPhone: user.shopPhone ?? "",
    shopTagline: user.shopTagline ?? "",
    lowStockAlert: user.lowStockAlert,
    bengaliDigits: user.bengaliDigits,
    reminderTemplate: user.reminderTemplate,
  });
  const [savingShop, setSavingShop] = useState(false);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const saveShop = async () => {
    setSavingShop(true);
    const result = await temp.updateSettings({
      name: shop.name.trim(),
      shopName: shop.shopName.trim(),
      shopAddress: shop.shopAddress.trim() || null,
      shopPhone: shop.shopPhone.trim() || null,
      shopTagline: shop.shopTagline.trim() || null,
      lowStockAlert: shop.lowStockAlert,
      bengaliDigits: shop.bengaliDigits,
      reminderTemplate: shop.reminderTemplate,
    });
    setSavingShop(false);
    if (result.ok) {
      toast.success("সেটিংস সংরক্ষণ হয়েছে");
      router.refresh();
    }
  };

  const changePassword = async () => {
    if (password.next.length < 4) {
      toast.error("নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে");
      return;
    }
    if (password.next !== password.confirm) {
      toast.error("দুইবার লেখা পাসওয়ার্ড মিলছে না");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: password.current,
          newPassword: password.next,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "পাসওয়ার্ড বদলানো যায়নি");
      } else {
        toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
        setPassword({ current: "", next: "", confirm: "" });
      }
    } catch {
      toast.error("ইন্টারনেট সমস্যা");
    }
    setSavingPassword(false);
  };

  const exportData = () => {
    const payload = {
      shop: user.shopName,
      exportedAt: new Date().toISOString(),
      customers,
      products,
      transactions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dokan-hishab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ব্যাকআপ ফাইল ডাউনলোড হয়েছে");
  };

  const resetDemo = async () => {
    setBusy(true);
    const result = await temp.resetDemo();
    setBusy(false);
    setResetOpen(false);
    if (result.ok) {
      toast.success("ডেমো ডেটা আবার তৈরি হয়েছে", "আগের সব হিসাব মুছে নতুন করে সাজানো হয়েছে");
      router.refresh();
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* প্রোফাইল */}
      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={user.name} color="emerald" size="xl" />
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight">{user.name}</p>
            <p className="text-sm text-muted">{user.shopName}</p>
            <p className="mt-1 text-xs text-muted">{prettyPhone(user.phone, bn)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="emerald">{toBnDigits(customers.length)} কাস্টমার</Badge>
              <Badge tone="sky">{toBnDigits(products.length)} পণ্য</Badge>
              <Badge tone="violet">{toBnDigits(transactions.length)} লেনদেন</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* দোকানের তথ্য */}
      <Card>
        <SectionHeader
          title="দোকানের তথ্য"
          subtitle="বিবরণী ও রিমাইন্ডার মেসেজে এই তথ্য ব্যবহার হয়"
          icon={<Building2 className="size-4" />}
        />
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="দোকানের নাম">
              <Input
                value={shop.shopName}
                onChange={(e) => setShop((p) => ({ ...p, shopName: e.target.value }))}
              />
            </Field>
            <Field label="মালিকের নাম">
              <Input
                value={shop.name}
                onChange={(e) => setShop((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="দোকানের ঠিকানা">
              <Input
                value={shop.shopAddress}
                onChange={(e) => setShop((p) => ({ ...p, shopAddress: e.target.value }))}
                placeholder="বাজার / রোড / এলাকা"
              />
            </Field>
            <Field label="দোকানের মোবাইল">
              <Input
                value={shop.shopPhone}
                onChange={(e) => setShop((p) => ({ ...p, shopPhone: e.target.value }))}
                placeholder="০১৭XXXXXXXX"
              />
            </Field>
          </div>
          <Field label="দোকানের পরিচিতি" hint="অ্যাপে দোকানের নিচে দেখানো হয়">
            <Input
              value={shop.shopTagline}
              onChange={(e) => setShop((p) => ({ ...p, shopTagline: e.target.value }))}
              placeholder="যেমন: সব মুদি পণ্য এক জায়গায়"
            />
          </Field>
          <Field label="কম স্টকের সতর্কতা" hint="এর নিচে স্টক গেলে অ্যাপ জানাবে">
            <MoneyInput
              value={shop.lowStockAlert}
              onChange={(v) => setShop((p) => ({ ...p, lowStockAlert: v }))}
            />
          </Field>
        </div>
      </Card>

      {/* স্মার্ট সেটিংস */}
      <Card>
        <SectionHeader
          title="স্মার্ট সেটিংস"
          subtitle="অ্যাপকে নিজের মতো সাজিয়ে নিন"
          icon={<Palette className="size-4" />}
        />
        <div className="space-y-4">
          <Field label="থিম" hint="ডার্ক মোডে রাতে চোখের আরাম">
            <Segmented
              options={[
                { value: "light", label: "লাইট", icon: <Sun className="size-4" /> },
                { value: "dark", label: "ডার্ক", icon: <Moon className="size-4" /> },
              ]}
              value={resolved}
              onChange={(v) => setTheme(v)}
            />
          </Field>

          <Field label="সংখ্যার ধরন">
            <Segmented
              options={[
                { value: "bn", label: "বাংলা ১২৩", icon: <Type className="size-4" /> },
                { value: "en", label: "ইংরেজি 123", icon: <Type className="size-4" /> },
              ]}
              value={shop.bengaliDigits ? "bn" : "en"}
              onChange={(v) => setShop((p) => ({ ...p, bengaliDigits: v === "bn" }))}
            />
          </Field>

          <Field
            label="তাগাদার মেসেজ"
            hint="{name} = কাস্টমারের নাম, {amount} = বাকির টাকা, {shop} = দোকানের নাম"
          >
            <Textarea
              rows={4}
              value={shop.reminderTemplate}
              onChange={(e) => setShop((p) => ({ ...p, reminderTemplate: e.target.value }))}
            />
          </Field>

          <div className="rounded-2xl bg-[var(--surface-2)] p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
              <MessageSquare className="size-3.5" /> মেসেজের নমুনা
            </p>
            <p className="text-xs leading-relaxed text-muted">
              {shop.reminderTemplate
                .replace(/\{name\}/g, "করিম মিয়া")
                .replace(/\{amount\}/g, "১,২৫০")
                .replace(/\{shop\}/g, shop.shopName)}
            </p>
          </div>

          <button
            type="button"
            onClick={saveShop}
            disabled={savingShop}
            className="btn btn-primary w-full py-3"
          >
            <Save className="size-4" />
            {savingShop ? "সংরক্ষণ হচ্ছে..." : "সব সেটিংস সংরক্ষণ করুন"}
          </button>
        </div>
      </Card>

      {/* নিরাপত্তা */}
      <Card>
        <SectionHeader
          title="পাসওয়ার্ড পরিবর্তন"
          subtitle="নিরাপত্তার জন্য মাঝে মাঝে বদলে নিন"
          icon={<ShieldCheck className="size-4" />}
        />
        <div className="space-y-3">
          <Field label="বর্তমান পাসওয়ার্ড">
            <Input
              type="password"
              value={password.current}
              onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))}
              autoComplete="current-password"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="নতুন পাসওয়ার্ড">
              <Input
                type="password"
                value={password.next}
                onChange={(e) => setPassword((p) => ({ ...p, next: e.target.value }))}
                autoComplete="new-password"
              />
            </Field>
            <Field label="আবার লিখুন">
              <Input
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={changePassword}
            disabled={savingPassword}
            className="btn btn-ghost w-full"
          >
            <User className="size-4" />
            {savingPassword ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
          </button>
        </div>
      </Card>

      {/* অফলাইন ও সিঙ্ক */}
      <OfflineSyncCard />

      {/* ডেটা */}
      <Card>
        <SectionHeader
          title="ডেটা ও ব্যাকআপ"
          subtitle="আপনার সব হিসাব এই ডিভাইসেই সংরক্ষিত"
          icon={<Download className="size-4" />}
        />
        <div className="space-y-2.5">
          <button type="button" onClick={exportData} className="btn btn-ghost w-full py-3">
            <Download className="size-4" /> ব্যাকআপ ফাইল ডাউনলোড (JSON)
          </button>
          {customers.length > 0 ? (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="btn btn-ghost w-full py-3 text-amber-600 dark:text-amber-400"
            >
              <RefreshCcw className="size-4" /> ডেমো ডেটা আবার তৈরি করুন
            </button>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="btn btn-ghost w-full py-3 text-rose-500"
          >
            <LogOut className="size-4" /> লগআউট
          </button>
        </div>
      </Card>

      {/* শর্টকাট */}
      <Card>
        <SectionHeader
          title="কীবোর্ড শর্টকাট"
          subtitle="দ্রুত কাজ করতে"
          icon={<Keyboard className="size-4" />}
        />
        <ul className="space-y-2 text-sm">
          {[
            { keys: "Ctrl + K", action: "কাস্টমার, পণ্য বা লেনদেন খুঁজুন" },
            { keys: "N", action: "নতুন লেনদেন (বাকি/জমা) লিখুন" },
            { keys: "Esc", action: "খোলা উইন্ডো বন্ধ করুন" },
          ].map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-3">
              <span className="text-muted">{s.action}</span>
              <kbd className="rounded-lg border bg-[var(--surface-2)] px-2 py-1 text-xs font-bold">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </Card>

      {/* অ্যাপের তথ্য */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "কাস্টমার", value: toBnDigits(customers.length), tone: TONES.emerald },
          { label: "পণ্য", value: toBnDigits(products.length), tone: TONES.sky },
          { label: "লেনদেন", value: toBnDigits(transactions.length), tone: TONES.violet },
        ].map((s) => (
          <div key={s.label} className={cn("card flex items-center gap-3 p-3.5")}>
            <div className={cn("flex size-10 items-center justify-center rounded-xl", s.tone)}>
              <Check className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted">{s.label}</p>
              <p className="text-sm font-bold tabular-nums">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="pb-4 text-center text-[11px] text-muted">
        দোকান হিসাব • মোবাইলে &quot;Add to Home Screen&quot; করলে অ্যাপের মতো ব্যবহার করা যাবে
      </p>

      <ConfirmDialog
        open={resetOpen}
        title="ডেমো ডেটা আবার তৈরি করবেন?"
        message="আপনার সব কাস্টমার, লেনদেন, স্টক ও খরচের হিসাব মুছে গিয়ে নতুন ডেমো ডেটা তৈরি হবে। এটি ফিরিয়ে আনা যাবে না — আগে ব্যাকআপ নিয়ে রাখুন।"
        confirmLabel="হ্যাঁ, নতুন করে সাজান"
        loading={busy}
        onConfirm={resetDemo}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}

