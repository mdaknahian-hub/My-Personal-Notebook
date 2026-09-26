import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bcryptjs নেটিভ মডিউল নয়, তবু সার্ভার বান্ডলের বাইরে রাখা হয় — দ্রুত কোল্ড স্টার্ট
  serverExternalPackages: ["bcryptjs"],
  // ডকার/ক্লাউড হোস্টিংয়ে ছোট ইমেজের জন্য standalone আউটপুট
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        // সার্ভিস ওয়ার্কার কখনো ক্যাশে হবে না — আপডেট সাথে সাথে কার্যকর হয়
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // ডেভ সার্ভার ক্লাউড প্রিভিউ/টানেল হোস্ট থেকে খোলা হলে যেন ব্লক না করে
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "localhost:3000", "127.0.0.1:3000"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
