import {
  BarChart3,
  BellRing,
  BookUser,
  LayoutDashboard,
  NotebookPen,
  Package,
  Receipt,
  Settings,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: ReactNode;
  badgeKey?: "dueCustomers" | "lowStock" | "overdue";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "প্রধান",
    items: [
      {
        href: "/dashboard",
        label: "ড্যাশবোর্ড",
        shortLabel: "হোম",
        icon: <LayoutDashboard className="size-[18px]" />,
      },
      {
        href: "/customers",
        label: "কাস্টমার খাতা",
        shortLabel: "খাতা",
        icon: <BookUser className="size-[18px]" />,
        badgeKey: "dueCustomers",
      },
      {
        href: "/transactions",
        label: "লেনদেন",
        shortLabel: "লেনদেন",
        icon: <Receipt className="size-[18px]" />,
      },
    ],
  },
  {
    title: "ব্যবস্থাপনা",
    items: [
      {
        href: "/stock",
        label: "স্টক ও পণ্য",
        shortLabel: "স্টক",
        icon: <Package className="size-[18px]" />,
        badgeKey: "lowStock",
      },
      {
        href: "/expenses",
        label: "দোকান খরচ",
        shortLabel: "খরচ",
        icon: <Wallet className="size-[18px]" />,
      },
      {
        href: "/suppliers",
        label: "সাপ্লায়ার",
        shortLabel: "সাপ্লায়ার",
        icon: <Truck className="size-[18px]" />,
      },
    ],
  },
  {
    title: "বিশ্লেষণ",
    items: [
      {
        href: "/reports",
        label: "রিপোর্ট",
        shortLabel: "রিপোর্ট",
        icon: <BarChart3 className="size-[18px]" />,
      },
      {
        href: "/reminders",
        label: "তাগাদা কেন্দ্র",
        shortLabel: "তাগাদা",
        icon: <BellRing className="size-[18px]" />,
        badgeKey: "overdue",
      },
    ],
  },
  {
    title: "ব্যক্তিগত",
    items: [
      {
        href: "/notebook",
        label: "নোটবুক",
        shortLabel: "নোট",
        icon: <NotebookPen className="size-[18px]" />,
      },
      {
        href: "/settings",
        label: "সেটিংস",
        shortLabel: "সেটিংস",
        icon: <Settings className="size-[18px]" />,
      },
    ],
  },
];

export const MOBILE_NAV: NavItem[] = [
  NAV_SECTIONS[0].items[0],
  NAV_SECTIONS[0].items[1],
  NAV_SECTIONS[0].items[2],
  NAV_SECTIONS[2].items[0],
];

export const SHOP_ICON = <Store className="size-5" />;
