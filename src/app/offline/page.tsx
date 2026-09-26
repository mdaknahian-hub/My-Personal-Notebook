import type { Metadata } from "next";
import { OfflineView } from "./offline-view";

export const metadata: Metadata = {
  title: "অফলাইন",
};

// NOTE: এই পেজে লগইন চেক নেই — নেট ছাড়া সার্ভিস ওয়ার্কার
// ক্যাশে থেকে এই পেজটাই দেখায়।
export default function OfflinePage() {
  return <OfflineView />;
}
