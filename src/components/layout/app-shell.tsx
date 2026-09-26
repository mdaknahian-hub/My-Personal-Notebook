"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  ChevronRight,
  LogOut,
  Moon,
  NotebookPen,
  Package,
  Plus,
  Search,
  Store,
  Sun,
  Users,
  Wallet,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, type NavItem } from "@/components/layout/nav-config";
import { Avatar, Badge } from "@/components/ui/bits";
import { useTheme } from "@/components/providers/theme";
import { useStore } from "@/components/providers/store";
import { useToast } from "@/components/ui/toast";
import { fmtMoney } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "@/components/forms/transaction-form";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationPanel } from "@/components/layout/notification-panel";

type ShellProps = { children: ReactNode; title?: string };

export function AppShell({ children }: ShellProps) {
  const { user, customers, products, transactions, syncing, refresh } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { resolved, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const counts = useMemo(() => {
    const dueCustomers = customers.filter((c) => c.due > 0.5).length;
    const lowStock = products.filter((p) => p.stock <= p.lowStockAt).length;
    const oldDue = customers.filter((c) => {
      if (c.due <= 500) return false;
      const days = c.lastActivityAt
        ? (Date.now() - new Date(c.lastActivityAt).getTime()) / 86400000
        : 999;
      return days >= 14;
    }).length;
    return { dueCustomers, lowStock, overdue: oldDue };
  }, [customers, products]);

  const pendingTxns = transactions.filter((t) => t._pending).length;

  // কীবোর্ড শর্টকাট
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setQuickOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.info("লগআউট করা হয়েছে");
    router.replace("/login");
  };

  const activeItem = NAV_SECTIONS.flatMap((s) => s.items).find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

  return (
    <div className="min-h-dvh lg:flex">
      {/* ------------------------------------------------ ডেস্কটপ সাইডবার */}
      <aside className="no-print sticky top-0 hidden h-dvh w-[262px] shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)] lg:flex">
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-teal-600 text-white shadow-lg shadow-emerald-900/30">
            <Store className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user.shopName}</p>
            <p className="truncate text-[11px] text-slate-400">
              {user.shopTagline ?? "বাকির হিসাব ও খতিয়ান"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <SidebarLink
                      item={item}
                      active={activeItem?.href === item.href}
                      badge={item.badgeKey ? counts[item.badgeKey] : 0}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="size-4" /> নতুন বাকি / জমা
          </button>
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/5 p-2.5">
            <Avatar name={user.name} color="emerald" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-slate-400">দোকান মালিক</p>
            </div>
            <button
              type="button"
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
              aria-label="থিম পরিবর্তন"
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10"
            >
              {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              type="button"
              onClick={logout}
              aria-label="লগআউট"
              className="rounded-xl p-2 text-slate-300 transition hover:bg-rose-500/20 hover:text-rose-300"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------ মূল অংশ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2.5 lg:hidden"
              aria-label="মেনু খুলুন"
            >
              <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-teal-600 text-white shadow-md">
                <Store className="size-5" />
              </div>
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold leading-tight sm:text-lg">
                {activeItem?.label ?? "ড্যাশবোর্ড"}
              </h1>
              <p className="truncate text-[11px] text-muted lg:hidden">
                {user.shopName}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden items-center gap-2 rounded-2xl border bg-[var(--surface)] px-3.5 py-2.5 text-sm text-muted transition hover:border-brand-300 sm:flex lg:w-72"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">কাস্টমার, পণ্য খুঁজুন...</span>
              <kbd className="hidden rounded-md border px-1.5 py-0.5 text-[10px] font-semibold lg:block">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="খুঁজুন"
              className="rounded-2xl border bg-[var(--surface)] p-2.5 text-muted transition hover:text-[var(--text)] sm:hidden"
            >
              <Search className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              aria-label="বিজ্ঞপ্তি"
              className="relative rounded-2xl border bg-[var(--surface)] p-2.5 text-muted transition hover:text-[var(--text)]"
            >
              <BellRing className="size-5" />
              {counts.overdue + counts.lowStock > 0 ? (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-[var(--bg)]">
                  {counts.overdue + counts.lowStock > 9
                    ? "৯+"
                    : counts.overdue + counts.lowStock}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="btn btn-primary hidden px-3.5 py-2.5 sm:inline-flex"
            >
              <Plus className="size-4" /> নতুন এন্ট্রি
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="মেনু"
              className="rounded-2xl border bg-[var(--surface)] p-2.5 text-muted lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>

          {syncing || pendingTxns > 0 ? (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
              <span className="inline-block size-2 animate-pulse rounded-full bg-brand-500" />
              সিঙ্ক হচ্ছে...
            </div>
          ) : null}
        </header>

        <main className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-6 sm:pb-10 lg:pt-6">
          {children}
        </main>

        {/* ------------------------------------------------ মোবাইল বটম নেভ */}
        <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pb-1 pt-1.5">
            {NAV_SECTIONS[0].items.slice(0, 2).map((item) => (
              <MobileNavLink
                key={item.href}
                item={item}
                active={activeItem?.href === item.href}
              />
            ))}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setQuickOpen(true)}
                aria-label="নতুন এন্ট্রি"
                className="-mt-6 flex size-14 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-xl shadow-emerald-600/30 transition active:scale-95"
              >
                <Plus className="size-7" />
              </button>
            </div>
            <MobileNavLink
              item={NAV_SECTIONS[0].items[2]}
              active={activeItem?.href === "/transactions"}
            />
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition",
                menuOpen ? "text-brand-600" : "text-muted",
              )}
            >
              <span className="flex size-8 items-center justify-center rounded-xl">
                <Menu className="size-5" />
              </span>
              আরও
            </button>
          </div>
        </nav>
      </div>

      {/* ------------------------------------------------ মোবাইল ড্রয়ার মেনু */}
      {menuOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <div className="animate-scale-in absolute inset-x-3 bottom-3 max-h-[80vh] overflow-y-auto rounded-3xl border bg-[var(--surface)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} color="emerald" size="sm" />
                <div>
                  <p className="text-sm font-bold">{user.name}</p>
                  <p className="text-xs text-muted">{user.shopName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl p-2 text-muted hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="বন্ধ"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <QuickTile
                href="/customers"
                icon={<Users className="size-5" />}
                label="কাস্টমার"
                hint={`${counts.dueCustomers} জন বাকি`}
              />
              <QuickTile
                href="/stock"
                icon={<Package className="size-5" />}
                label="স্টক"
                hint={`${counts.lowStock} কম`}
              />
              <QuickTile
                href="/expenses"
                icon={<Wallet className="size-5" />}
                label="খরচ"
                hint="দিনের হিসাব"
              />
            </div>

            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="mb-3">
                <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                        activeItem?.href === item.href
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                          : "hover:bg-[var(--surface-2)]",
                      )}
                    >
                      <span className="text-muted">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.badgeKey && counts[item.badgeKey] > 0 ? (
                        <Badge tone={item.badgeKey === "lowStock" ? "amber" : "rose"}>
                          {counts[item.badgeKey]}
                        </Badge>
                      ) : null}
                      <ChevronRight className="size-4 text-muted" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
                className="btn btn-ghost flex-1"
              >
                {resolved === "dark" ? (
                  <>
                    <Sun className="size-4" /> লাইট মোড
                  </>
                ) : (
                  <>
                    <Moon className="size-4" /> ডার্ক মোড
                  </>
                )}
              </button>
              <button type="button" onClick={logout} className="btn btn-ghost text-rose-500">
                <LogOut className="size-4" /> লগআউট
              </button>
            </div>

            <Link
              href="/notebook"
              className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <NotebookPen className="size-4" />
              ব্যক্তিগত নোটবুকে কাজের লিস্ট রাখুন
            </Link>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------ মোডাল */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      <Modal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        title="নতুন হিসাব লিখুন"
        description="বাকি, জমা, ছাড় বা নগদ বিক্রি — যেকোনো লেনদেন এখানেই লিখে ফেলুন"
        size="lg"
      >
        <TransactionForm
          onDone={() => {
            setQuickOpen(false);
            refresh();
          }}
          onCancel={() => setQuickOpen(false)}
        />
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ ছোট অংশ */

function SidebarLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-gradient-to-r from-brand-500/20 to-teal-500/10 text-white shadow-inner ring-1 ring-brand-500/30"
          : "text-slate-300 hover:bg-white/5 hover:text-white",
      )}
    >
      <span className={cn("transition", active ? "text-brand-300" : "text-slate-400 group-hover:text-slate-200")}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {badge ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            active ? "bg-brand-500 text-white" : "bg-white/10 text-slate-300",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function MobileNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition",
        active ? "text-brand-600 dark:text-brand-400" : "text-muted",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-xl transition",
          active && "bg-brand-50 dark:bg-brand-500/10",
        )}
      >
        {item.icon}
      </span>
      {item.shortLabel}
    </Link>
  );
}

function QuickTile({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-2xl border bg-[var(--surface-2)] p-3 text-center transition hover:border-brand-300"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm dark:bg-slate-800">
        {icon}
      </span>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[10px] text-muted">{hint}</span>
    </Link>
  );
}
