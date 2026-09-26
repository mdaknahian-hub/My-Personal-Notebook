"use client";

import {
  CheckCircle2,
  CloudUpload,
  HardDriveDownload,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/bits";
import { useOffline } from "@/components/providers/offline";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtRelative, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/** সেটিংস পেজের "অফলাইন ও সিঙ্ক" কার্ড */
export function OfflineSyncCard() {
  const {
    online,
    serverOk,
    checking,
    pendingCount,
    lastSyncAt,
    syncing,
    swReady,
    checkConnection,
    syncNow,
  } = useOffline();
  const { bn } = useStore();
  const toast = useToast();

  const offline = !online || serverOk === false;

  const handleSync = () => {
    if (!online) {
      toast.error("এখন অফলাইনে আছেন", "নেট ফিরলেই এন্ট্রিগুলো নিজে থেকে সিঙ্ক হবে");
      return;
    }
    if (pendingCount === 0) {
      toast.info("সিঙ্ক করার মতো কিছু নেই", "সব হিসাব সার্ভারে জমা আছে");
      return;
    }
    syncNow();
  };

  const handleCheck = async () => {
    const ok = await checkConnection();
    if (ok) toast.success("সার্ভারের সাথে সংযোগ আছে");
    else toast.error("সার্ভারে পৌঁছানো যাচ্ছে না");
  };

  return (
    <Card>
      <SectionHeader
        title="অফলাইন ও সিঙ্ক"
        subtitle="নেট ছাড়াই হিসাব লিখুন — নেট ফিরলে নিজে থেকে সিঙ্ক হবে"
        icon={<CloudUpload className="size-4" />}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatusTile
          label="সংযোগ"
          value={online ? "অনলাইন" : "অফলাইন"}
          tone={online ? "emerald" : "rose"}
          icon={online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
        />
        <StatusTile
          label="সার্ভার (/api/ping)"
          value={
            serverOk === null ? "পরীক্ষা হয়নি" : serverOk ? "পৌঁছানো যাচ্ছে" : "পৌঁছানো যাচ্ছে না"
          }
          tone={serverOk === null ? "slate" : serverOk ? "emerald" : "rose"}
          icon={
            serverOk === null ? (
              <Loader2 className="size-4" />
            ) : serverOk ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <XCircle className="size-4" />
            )
          }
        />
        <StatusTile
          label="সিঙ্কের অপেক্ষায়"
          value={`${toBnDigits(pendingCount)}টি এন্ট্রি`}
          tone={pendingCount > 0 ? "amber" : "emerald"}
          icon={<CloudUpload className="size-4" />}
        />
        <StatusTile
          label="সর্বশেষ সিঙ্ক"
          value={lastSyncAt ? fmtRelative(lastSyncAt, bn) : "এখনো হয়নি"}
          tone="sky"
          icon={<RefreshCw className="size-4" />}
        />
      </div>

      <div className="mt-3 rounded-2xl bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-muted">
        <p className="flex items-start gap-2">
          <HardDriveDownload className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <span>
            নেট না থাকলে বাকি, জমা ও কাস্টমার এন্ট্রি এই ফোনেই জমা থাকে — তালিকায়
            পাশে <strong className="text-amber-600 dark:text-amber-400">“অফলাইন”</strong> লেখা
            দেখায়। নেট ফিরলে সব নিজে থেকে সার্ভারে জমা হয়, আর অস্থায়ী{" "}
            <code className="rounded bg-slate-200/70 px-1 font-mono text-[11px] dark:bg-slate-700/60">
              tmp_
            </code>{" "}
            আইডি আসল আইডিতে বদলে যায়।
          </span>
        </p>
        <p className="mt-2 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              swReady ? "bg-emerald-500" : "bg-slate-400",
            )}
          />
          {swReady
            ? "অফলাইন পেজ সাপোর্ট চালু আছে — নেট ছাড়া আগে খোলা পেজ খুলবে"
            : "অফলাইন পেজ সাপোর্ট চালু হয়নি (ব্রাউজার সমর্থন করে না হয়তো)"}
        </p>
      </div>

      {offline && pendingCount > 0 ? (
        <p className="mt-3 rounded-2xl bg-rose-500/10 p-3 text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
          এখন অফলাইনে আছেন — {toBnDigits(pendingCount)}টি এন্ট্রি ফোনে নিরাপদে জমা আছে
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || pendingCount === 0}
          className="btn btn-primary py-3 disabled:opacity-50"
        >
          {syncing ? (
            <>
              <Loader2 className="size-4 animate-spin" /> সিঙ্ক হচ্ছে…
            </>
          ) : (
            <>
              <CloudUpload className="size-4" /> এখনই সিঙ্ক করুন
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => void handleCheck()}
          disabled={checking}
          className="btn btn-ghost py-3"
        >
          <RefreshCw className={cn("size-4", checking && "animate-spin")} />
          {checking ? "পরীক্ষা চলছে…" : "সংযোগ পরীক্ষা করুন"}
        </button>
      </div>
    </Card>
  );
}

function StatusTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose" | "amber" | "sky" | "slate";
  icon: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    slate: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
  };
  return (
    <div className="rounded-2xl border p-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-8 items-center justify-center rounded-xl", tones[tone])}>
          {icon}
        </span>
        <p className="text-[11px] font-semibold text-muted">{label}</p>
      </div>
      <p className="mt-1.5 truncate text-sm font-bold">{value}</p>
    </div>
  );
}
