"use client";

import { useEffect, useState } from "react";
import { fmtDateLong } from "@/lib/format";

function greetingFor(hour: number) {
  if (hour < 6) return "শুভ রাত্রি";
  if (hour < 12) return "শুভ সকাল";
  if (hour < 16) return "শুভ দুপুর";
  if (hour < 19) return "শুভ বিকেল";
  if (hour < 23) return "শুভ সন্ধ্যা";
  return "শুভ রাত্রি";
}

/**
 * সকাল/দুপুর/বিকেলের সম্ভাষণ ও আজকের তারিখ।
 * সার্ভার প্রথমে যেটুকু দেখায়, ব্রাউজারে খোলার সাথে সাথে ফোনের সময় অনুযায়ী
 * নিজে থেকে ঠিক করে নেয় — তাই ভুল সময়ও দেখায় না, হাইড্রেশন এররও হয় না।
 */
export function GreetingLine({
  name,
  bn,
  fallbackGreeting,
  fallbackDate,
}: {
  name: string;
  bn: boolean;
  fallbackGreeting: string;
  fallbackDate: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting = now ? greetingFor(now.getHours()) : fallbackGreeting;
  const dateText = now ? fmtDateLong(now, bn) : fallbackDate;

  return (
    <>
      <p className="text-xs font-medium text-emerald-100">
        {greeting}, {name}
      </p>
      <p className="mt-0.5 text-[11px] text-emerald-100/80">{dateText}</p>
    </>
  );
}
