import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "দোকান হিসাব — বাকির খাতা ও হিসাব ব্যবস্থাপনা",
    short_name: "দোকান হিসাব",
    description:
      "মনোহারী দোকানের প্রতিটি কাস্টমারের বাকির হিসাব, স্টক, খরচ, সাপ্লায়ার, তাগাদা ও রিপোর্ট — সব এক অ্যাপে।",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6f8",
    theme_color: "#059669",
    lang: "bn",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
