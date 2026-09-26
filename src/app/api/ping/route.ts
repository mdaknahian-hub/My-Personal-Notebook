import { NextResponse } from "next/server";

/**
 * সংযোগ পরীক্ষার এন্ডপয়েন্ট — লগইন ছাড়াই খোলা, যাতে অফলাইন ডিটেকশন
 * সেশন এক্সপায়ারের সাথে গুলিয়ে না যায়।
 * ক্লায়েন্ট নিয়মিত এটিতে হিট করে সার্ভার সত্যিই পৌঁছানো যাচ্ছে কি না দেখে।
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, time: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
