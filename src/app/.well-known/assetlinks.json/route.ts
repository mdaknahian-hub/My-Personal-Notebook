import { NextResponse } from "next/server";

/**
 * Digital Asset Links — Android অ্যাপ (TWA) যাচাই করে এই অ্যাপ আর ওয়েবসাইট
 * একই মালিকের, ফলে APK-তে URL বার দেখায় না।
 *
 * হোস্টিংয়ের env-এ বসান (APK বিল্ডের fingerprints.txt থেকে পাওয়া SHA-256):
 *   ASSET_LINKS_SHA256="AA:BB:CC:..."
 *   ANDROID_PACKAGE_ID="com.dokanhishab.app"   (ডিফল্ট এটাই)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const fingerprints = (process.env.ASSET_LINKS_SHA256 ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (fingerprints.length === 0) {
    return NextResponse.json(
      { error: "ASSET_LINKS_SHA256 সেট করা হয়নি" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: process.env.ANDROID_PACKAGE_ID ?? "com.dokanhishab.app",
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
