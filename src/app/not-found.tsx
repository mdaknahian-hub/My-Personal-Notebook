import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
        <Compass className="size-8" />
      </div>
      <h1 className="text-2xl font-extrabold">পাতাটি খুঁজে পাওয়া যায়নি</h1>
      <p className="max-w-sm text-sm text-muted">
        আপনি যে পাতাটি খুঁজছেন সেটি সরানো হয়েছে বা কখনো ছিল না।
      </p>
      <Link href="/dashboard" className="btn btn-primary">
        ড্যাশবোর্ডে ফিরে যান
      </Link>
    </div>
  );
}
