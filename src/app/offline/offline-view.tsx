"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudOff, LayoutDashboard, RefreshCw, WifiOff } from "lucide-react";
import { loadQueue } from "@/lib/offline-queue";
import { toBnDigits } from "@/lib/format";

export function OfflineView() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setPending(loadQueue().length);
    const update = () => {
      setPending(loadQueue().length);
      setOnline(navigator.onLine);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = setInterval(update, 3000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6 py-10 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl">
        <WifiOff className="size-10" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold">ইন্টারনেট সংযোগ নেই</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        চিন্তা নেই — আপনার লেখা বাকি, জমা ও কাস্টমার এন্ট্রি এই ফোনেই নিরাপদে
        জমা থাকছে। নেট ফিরলেই সব নিজে থেকে সার্ভারে সিঙ্ক হয়ে যাবে।
      </p>

      {pending > 0 ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-700 dark:text-amber-300">
          <CloudOff className="size-4" />
          {toBnDigits(pending)}টি এন্ট্রি সিঙ্কের অপেক্ষায়
        </p>
      ) : (
        <p className="mt-4 text-xs text-muted">কোনো এন্ট্রি সিঙ্কের অপেক্ষায় নেই</p>
      )}

      <p className="mt-2 text-xs text-muted">
        অবস্থা: {online ? "ব্রাউজার অনলাইন দেখাচ্ছে" : "ব্রাউজার অফলাইন"}
      </p>

      <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary w-full py-3"
        >
          <RefreshCw className="size-4" /> আবার চেষ্টা করুন
        </button>
        <Link href="/dashboard" className="btn btn-ghost w-full py-3">
          <LayoutDashboard className="size-4" /> ড্যাশবোর্ডে যান
        </Link>
      </div>

      <p className="mt-8 text-[11px] text-muted">দোকান হিসাব • অফলাইন মোড</p>
    </main>
  );
}
