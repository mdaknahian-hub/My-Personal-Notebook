"use client";

import { CloudUpload, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toBnDigits } from "@/lib/format";
import { useOffline } from "@/components/providers/offline";

/**
 * অ্যাপের ওপরে সরু স্ট্যাটাস-বার — অনলাইন/অফলাইন অবস্থা,
 * সিঙ্ক বাকি এন্ট্রির সংখ্যা ও দ্রুত সিঙ্ক বাটন।
 */
export function OfflineStatusBar() {
  const {
    online,
    serverOk,
    checking,
    pendingCount,
    syncing,
    syncNow,
    checkConnection,
  } = useOffline();

  const offline = !online || serverOk === false;
  const pending = toBnDigits(pendingCount);

  if (syncing) {
    return (
      <div className="flex items-center justify-center gap-2 bg-sky-600 px-3 py-1.5 text-center text-[11px] font-semibold text-white">
        <Loader2 className="size-3.5 animate-spin" />
        অফলাইন এন্ট্রি সিঙ্ক হচ্ছে… ({pending}টি বাকি)
      </div>
    );
  }

  if (offline) {
    return (
      <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-orange-500 px-3 py-1.5 text-center text-[11px] font-semibold text-white">
        <WifiOff className="size-3.5 shrink-0" />
        <span className="truncate">
          ইন্টারনেট নেই — এন্ট্রি ফোনে জমা হচ্ছে
          {pendingCount > 0 ? ` (${pending}টি অপেক্ষায়)` : ""}
        </span>
        <button
          type="button"
          onClick={() => void checkConnection()}
          disabled={checking}
          className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30 disabled:opacity-60"
        >
          <RefreshCw className={cn("size-3", checking && "animate-spin")} />
          আবার দেখুন
        </button>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-[11px] font-semibold text-amber-950">
        <CloudUpload className="size-3.5 shrink-0" />
        <span className="truncate">{pending}টি এন্ট্রি সিঙ্কের অপেক্ষায়</span>
        <button
          type="button"
          onClick={syncNow}
          className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-950/15 px-2 py-0.5 text-[10px] font-bold transition hover:bg-amber-950/25"
        >
          এখনই সিঙ্ক করুন
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 bg-emerald-600/95 px-3 py-1 text-center text-[11px] font-medium text-emerald-50">
      {serverOk === null || checking ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Wifi className="size-3" />
      )}
      অনলাইন • সব হিসাব সিঙ্ক আছে
    </div>
  );
}
