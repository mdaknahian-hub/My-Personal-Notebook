import type { Metadata, Viewport } from "next";
import "@fontsource/hind-siliguri/bengali-400.css";
import "@fontsource/hind-siliguri/bengali-500.css";
import "@fontsource/hind-siliguri/bengali-600.css";
import "@fontsource/hind-siliguri/bengali-700.css";
import "@fontsource/hind-siliguri/latin-400.css";
import "@fontsource/hind-siliguri/latin-600.css";
import "./globals.css";
import { ThemeProvider, themeScript } from "@/components/providers/theme";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineProvider } from "@/components/providers/offline";

export const metadata: Metadata = {
  title: {
    default: "দোকান হিসাব — বাকির খাতা ও হিসাব ব্যবস্থাপনা",
    template: "%s • দোকান হিসাব",
  },
  description:
    "মনোহারী দোকানের বাকি হিসাব, কাস্টমার খাতা, স্টক, খরচ, সাপ্লায়ার ও রিপোর্ট — নেট ছাড়াও চলে, সব এক অ্যাপে। মোবাইলেই ব্যবহারযোগ্য স্মার্ট ব্যবস্থাপনা।",
  applicationName: "দোকান হিসাব",
  keywords: ["বাকির খাতা", "দোকান হিসাব", "মুদি দোকান", "বাংলা অ্যাপ", "due book"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "দোকান হিসাব" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#060a14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            <OfflineProvider>{children}</OfflineProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
