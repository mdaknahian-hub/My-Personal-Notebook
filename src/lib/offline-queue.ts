/**
 * অফলাইন কিউ — নেট না থাকলে বাকি/জমা/কাস্টমার এন্ট্রি localStorage-তে জমা থাকে,
 * নেট ফিরলে ক্রমানুসারে সার্ভারে পাঠানো হয়।
 *
 * ডিজাইন নোট:
 * - কিউ শুধু *নতুন* এন্ট্রির জন্য (POST)। এডিট/ডিলিট অফলাইনে সমর্থিত নয় —
 *   সেগুলোতে নেট লাগবে বলে টোস্ট দেখানো হয়।
 * - প্রতিটি অপারেশনের `tempId` হলো স্ক্রিনে দেখানো অস্থায়ী `tmp_...` আইডি।
 *   সিঙ্ক সফল হলে এই আইডি সার্ভারের আসল আইডিতে বদলে যায়।
 * - অফলাইনে বানানো কাস্টমারের জন্য লেনদেন লিখলে লেনদেনের `customerId`-ও
 *   `tmp_...` থাকে — সিঙ্কের সময় কাস্টমার আগে পাঠিয়ে আসল আইডি বসানো হয়।
 */

export type QueuedKind = "customer" | "transaction";

export type QueuedOp = {
  /** কিউ-এর নিজস্ব আইডি */
  qid: string;
  kind: QueuedKind;
  /** স্ক্রিনে দেখানো অস্থায়ী tmp_ আইডি */
  tempId: string;
  /** সার্ভারে POST করার বডি */
  input: Record<string, unknown>;
  /** UI-তে দেখানোর বাংলা লেবেল */
  label: string;
  createdAt: string;
  attempts: number;
};

export const QUEUE_KEY = "dokan-offline-queue-v1";
export const LAST_SYNC_KEY = "dokan-last-sync-v1";

/** কিউ বদলালে এই ইভেন্ট ছোড়া হয় — UI (স্ট্যাটাস-বার/সেটিংস) শুনে আপডেট হয় */
export const QUEUE_CHANGE_EVENT = "dokan-queue-change";
/** এখনই সিঙ্ক করার অনুরোধ */
export const REQUEST_SYNC_EVENT = "dokan-request-sync";
/** সিঙ্ক চলছে/শেষ — detail: { syncing: boolean } */
export const SYNC_STATE_EVENT = "dokan-sync-state";

export function isTmpId(id: string | null | undefined): boolean {
  return !!id && id.startsWith("tmp_");
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadQueue(): QueuedOp[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedOp[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* স্টোরেজ ভরে গেলে চুপচাপ — মেমরির অপটিমিস্টিক ডেটা তো আছেই */
  }
  notifyQueueChange();
}

export function notifyQueueChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUEUE_CHANGE_EVENT));
}

export function notifySyncState(syncing: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SYNC_STATE_EVENT, { detail: { syncing } }));
}

export function requestSync(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REQUEST_SYNC_EVENT));
}

const qid = () =>
  `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function enqueue(
  op: Omit<QueuedOp, "qid" | "createdAt" | "attempts">,
): QueuedOp {
  const entry: QueuedOp = {
    ...op,
    qid: qid(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  const queue = loadQueue();
  // একই tempId দুইবার ঢুকতে পারবে না (ডাবল-ট্যাপ সুরক্ষা)
  if (!queue.some((q) => q.tempId === entry.tempId && q.kind === entry.kind)) {
    queue.push(entry);
    saveQueue(queue);
  }
  return entry;
}

export function removeFromQueue(qidToRemove: string): void {
  saveQueue(loadQueue().filter((q) => q.qid !== qidToRemove));
}

export function removeTempFromQueue(tempId: string): void {
  saveQueue(loadQueue().filter((q) => q.tempId !== tempId));
}

export function bumpAttempts(qidToBump: string): void {
  saveQueue(
    loadQueue().map((q) =>
      q.qid === qidToBump ? { ...q, attempts: q.attempts + 1 } : q,
    ),
  );
}

/**
 * সিঙ্কের আগেই অফলাইন এন্ট্রি এডিট করলে কিউ-এর ইনপুট আপডেট করে,
 * যাতে সিঙ্কের সময় নতুন তথ্যটাই সার্ভারে যায়।
 */
export function updateQueuedInput(
  tempId: string,
  kind: QueuedKind,
  patch: Record<string, unknown>,
): boolean {
  const queue = loadQueue();
  const found = queue.find((q) => q.tempId === tempId && q.kind === kind);
  if (!found) return false;
  saveQueue(
    queue.map((q) =>
      q.qid === found.qid
        ? { ...q, input: { ...q.input, ...patch } }
        : q,
    ),
  );
  return true;
}

/** এই tmp_ আইডিটা কি এখনো কিউ-তে সিঙ্কের অপেক্ষায় আছে? */
export function isQueued(tempId: string): boolean {
  return loadQueue().some((q) => q.tempId === tempId);
}

/**
 * অফলাইন কাস্টমার সিঙ্ক হয়ে আসল আইডি পেলে কিউ-তে অপেক্ষমাণ লেনদেনগুলোর
 * customerId-তে সেই আসল আইডি বসিয়ে দেয়।
 */
export function rewriteQueuedCustomerRefs(tmpId: string, realId: string): void {
  const queue = loadQueue();
  let changed = false;
  for (const q of queue) {
    if (
      q.kind === "transaction" &&
      (q.input.customerId as string | null | undefined) === tmpId
    ) {
      q.input = { ...q.input, customerId: realId };
      changed = true;
    }
  }
  if (changed) saveQueue(queue);
}

export function queuedCount(): number {
  return loadQueue().length;
}

export function getLastSyncAt(): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncAt(iso = new Date().toISOString()): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, iso);
  } catch {
    /* চুপচাপ */
  }
  notifyQueueChange();
}

/** fetch ব্যর্থতাটা নেটওয়ার্কের কারণে কি না (সার্ভার এরর নয়) */
export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return error instanceof TypeError;
}

export const OFFLINE_SAVED_MESSAGE = "অফলাইনে সংরক্ষিত হয়েছে";
