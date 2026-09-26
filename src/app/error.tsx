"use client";

import { AlertOctagon, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
        <AlertOctagon className="size-8" />
      </div>
      <h1 className="text-xl font-extrabold">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="max-w-md text-sm text-muted">
        অ্যাপটি এই মুহূর্তে তথ্য দেখাতে পারছে না। একবার আবার চেষ্টা করে দেখুন।
      </p>
      {error?.message ? (
        <p className="max-w-md rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-muted">
          {error.message}
        </p>
      ) : null}
      <button type="button" onClick={reset} className="btn btn-primary">
        <RotateCcw className="size-4" /> আবার চেষ্টা করুন
      </button>
    </div>
  );
}
