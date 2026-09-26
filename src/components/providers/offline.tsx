"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LAST_SYNC_KEY,
  QUEUE_CHANGE_EVENT,
  QUEUE_KEY,
  SYNC_STATE_EVENT,
  getLastSyncAt,
  loadQueue,
  requestSync,
} from "@/lib/offline-queue";

type OfflineValue = {
  /** ব্রাউজারের নেটওয়ার্ক আছে কি না (navigator.onLine) */
  online: boolean;
  /** /api/ping পৌঁছেছে কি না — null মানে এখনো পরীক্ষা হয়নি */
  serverOk: boolean | null;
  checking: boolean;
  /** সিঙ্কের অপেক্ষায় থাকা এন্ট্রির সংখ্যা */
  pendingCount: number;
  lastSyncAt: string | null;
  /** এখন সিঙ্ক চলছে কি না */
  syncing: boolean;
  /** সার্ভিস ওয়ার্কার চালু আছে কি না */
  swReady: boolean;
  /** /api/ping দিয়ে সংযোগ পরীক্ষা করে ফলাফল জানায় */
  checkConnection: () => Promise<boolean>;
  /** কিউ-তে জমা এন্ট্রি এখনই সিঙ্ক করার অনুরোধ */
  syncNow: () => void;
};

const OfflineContext = createContext<OfflineValue | null>(null);

const PING_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 8_000;

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const pingingRef = useRef(false);

  const refreshQueueState = useCallback(() => {
    setPendingCount(loadQueue().length);
    setLastSyncAt(getLastSyncAt());
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (pingingRef.current) return serverOk ?? false;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setServerOk(false);
      return false;
    }
    pingingRef.current = true;
    setChecking(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      const res = await fetch("/api/ping", {
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timer);
      const ok = !!res && res.ok;
      setServerOk(ok);
      // নেট ফিরেছে আর কিউ-তে কিছু আটকে আছে → নিজে থেকে সিঙ্ক
      if (ok && loadQueue().length > 0) requestSync();
      return ok;
    } finally {
      pingingRef.current = false;
      setChecking(false);
    }
  }, [serverOk]);

  const syncNow = useCallback(() => {
    requestSync();
  }, []);

  // কিউ বদল / অন্য ট্যাবে বদল / সিঙ্ক স্টেট শোনা
  useEffect(() => {
    refreshQueueState();
    const onQueue = () => refreshQueueState();
    const onStorage = (e: StorageEvent) => {
      if (e.key === QUEUE_KEY || e.key === LAST_SYNC_KEY) refreshQueueState();
    };
    const onSyncState = (e: Event) => {
      const detail = (e as CustomEvent<{ syncing: boolean }>).detail;
      setSyncing(!!detail?.syncing);
    };
    window.addEventListener(QUEUE_CHANGE_EVENT, onQueue);
    window.addEventListener("storage", onStorage);
    window.addEventListener(SYNC_STATE_EVENT, onSyncState);
    return () => {
      window.removeEventListener(QUEUE_CHANGE_EVENT, onQueue);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SYNC_STATE_EVENT, onSyncState);
    };
  }, [refreshQueueState]);

  // অনলাইন/অফলাইন ইভেন্ট + নিয়মিত ping
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void checkConnection();
    };
    const goOffline = () => {
      setOnline(false);
      setServerOk(false);
    };
    const onFocus = () => {
      if (navigator.onLine) void checkConnection();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("focus", onFocus);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void checkConnection();
      }
    }, PING_INTERVAL_MS);

    // প্রথম লোডে একবার পরীক্ষা
    void checkConnection();

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // সার্ভিস ওয়ার্কার রেজিস্ট্রেশন — নেট ছাড়া পেজ খোলার জন্য
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // file:// বা অসমর্থিত পরিবেশে নীরবে বাদ
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        setSwReady(true);
        // নতুন SW এলে পরের লোডে সক্রিয় হবে; আপডেট চেক
        reg.addEventListener?.("updatefound", () => undefined);
        void reg.update().catch(() => undefined);
      } catch {
        setSwReady(false);
      }
    };
    // পেজ লোডের পর রেজিস্টার করলে প্রথম পেইন্টে বাধা পড়ে না
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });
  }, []);

  const value = useMemo<OfflineValue>(
    () => ({
      online,
      serverOk,
      checking,
      pendingCount,
      lastSyncAt,
      syncing,
      swReady,
      checkConnection,
      syncNow,
    }),
    [
      online,
      serverOk,
      checking,
      pendingCount,
      lastSyncAt,
      syncing,
      swReady,
      checkConnection,
      syncNow,
    ],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used inside OfflineProvider");
  return ctx;
}

/** স্টোরের বাইরে (যেমন SW-বিহীন সাধারণ কম্পোনেন্ট) নিরাপদে ব্যবহারের হুক */
export function useOfflineOptional(): OfflineValue | null {
  return useContext(OfflineContext);
}
