import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bcryptjs নেটিভ মডিউল নয়, তবু সার্ভার বান্ডলের বাইরে রাখা হয় — দ্রুত কোল্ড স্টার্ট
  serverExternalPackages: ["bcryptjs"],
  eslint: { ignoreDuringBuilds: true },
  // ডেভ সার্ভার ক্লাউড প্রিভিউ/টানেল হোস্ট থেকে খোলা হলে যেন ব্লক না করে
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "localhost:3000", "127.0.0.1:3000"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
