import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "দোকান হিসাব — বাকির খাতা ও হিসাব ব্যবস্থাপনা",
    short_name: "দোকান হিসাব",
    description:
      "মনোহারী দোকানের প্রতিটি কাস্টমারের বাকির হিসাব, স্টক, খরচ, সাপ্লায়ার, তাগাদা ও রিপোর্ট — নেট ছাড়াও চলে, সব এক অ্যাপে।",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait",
    background_color: "#f4f6f8",
    theme_color: "#059669",
    lang: "bn",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "নতুন বাকি / জমা",
        short_name: "নতুন এন্ট্রি",
        description: "দ্রুত বাকি বা জমা লিখুন",
        url: "/transactions",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "কাস্টমার খাতা",
        short_name: "খাতা",
        url: "/customers",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
