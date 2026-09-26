import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BellRing,
  Boxes,
  Clock3,
  CreditCard,
  HandCoins,
  PackageCheck,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getCustomersWithBalance } from "@/lib/queries";
import { Avatar, Badge, Card, EmptyState, SectionHeader, StatCard, TONES } from "@/components/ui/bits";
import { DailyBarChart, ProgressRing } from "@/components/charts";
import { GreetingLine } from "@/components/pages/greeting";
import {
  QuickReminderRow,
  SeeAllLink,
  TodayTransactions,
  TopDueList,
} from "@/components/pages/dashboard-client";
import { fmtDateLong, fmtMoney, fmtMoneyCompact, fmtRelative, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "ড্যাশবোর্ড" };

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id, user.shopName);
  const customers = await getCustomersWithBalance(user.id);
  const bn = user.bengaliDigits;
  const { kpis } = data;

  const withDue = customers
    .filter((c) => c.due > 0.5)
    .sort((a, b) => b.due - a.due);

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "শুভ রাত্রি" : hour < 12 ? "শুভ সকাল" : hour < 16 ? "শুভ দুপুর" : hour < 19 ? "শুভ বিকেল" : "শুভ সন্ধ্যা";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* ------------------------------------------------------ হিরো কার্ড */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-5 text-white shadow-xl shadow-emerald-900/20 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <GreetingLine
              name={user.name}
              bn={bn}
              fallbackGreeting={greeting}
              fallbackDate={fmtDateLong(new Date(), bn)}
            />
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-100/90">
              মোট বাকি
            </p>
            <p className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
              {fmtMoney(kpis.totalDue, { bn })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                {toBnDigits(kpis.dueCustomers)} জন কাস্টমারের কাছে
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                মোট কাস্টমার {toBnDigits(kpis.totalCustomers)}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                সাপ্লায়ার পাওনা {fmtMoneyCompact(kpis.supplierPayable, bn)}
              </span>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:w-64">
            <Link
              href="/customers"
              className="flex flex-col gap-1 rounded-2xl bg-white/15 p-3 backdrop-blur transition hover:bg-white/25"
            >
              <Users className="size-4" />
              <span className="text-[11px] font-semibold">কাস্টমার খাতা</span>
            </Link>
            <Link
              href="/transactions"
              className="flex flex-col gap-1 rounded-2xl bg-white/15 p-3 backdrop-blur transition hover:bg-white/25"
            >
              <Receipt className="size-4" />
              <span className="text-[11px] font-semibold">সব লেনদেন</span>
            </Link>
            <Link
              href="/reminders"
              className="flex flex-col gap-1 rounded-2xl bg-white/15 p-3 backdrop-blur transition hover:bg-white/25"
            >
              <BellRing className="size-4" />
              <span className="text-[11px] font-semibold">তাগাদা কেন্দ্র</span>
            </Link>
            <Link
              href="/reports"
              className="flex flex-col gap-1 rounded-2xl bg-white/15 p-3 backdrop-blur transition hover:bg-white/25"
            >
              <Sparkles className="size-4" />
              <span className="text-[11px] font-semibold">রিপোর্ট</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ আজকের কেপিআই */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="আজকের বিক্রি"
          value={fmtMoney(kpis.todaySale, { bn })}
          hint={`${toBnDigits(kpis.todayTxnCount)} টি লেনদেন`}
          icon={<BadgeDollarSign className="size-4" />}
          tone="emerald"
        />
        <StatCard
          label="আজকের জমা"
          value={fmtMoney(kpis.todayCollection, { bn })}
          hint={`বাকিতে গেল ${fmtMoneyCompact(kpis.todayNewDue, bn)}`}
          icon={<HandCoins className="size-4" />}
          tone="sky"
        />
        <StatCard
          label="এই মাসের বিক্রি"
          value={fmtMoney(kpis.monthSale, { bn })}
          trend={kpis.saleGrowth}
          icon={<TrendingUp className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="এই মাসের আনুমানিক লাভ"
          value={fmtMoney(kpis.monthProfit, { bn })}
          hint={`মার্জিন ${toBnDigits(kpis.avgMargin.toFixed(1))}%`}
          icon={<PiggyBank className="size-4" />}
          tone={kpis.monthProfit >= 0 ? "emerald" : "rose"}
        />
      </section>

      {/* ------------------------------------------------------ চার্ট + সারাংশ */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <SectionHeader
            title="শেষ ১৪ দিনের লেনদেন"
            subtitle="বাকি লেখা ও জমা আদায়ের তুলনা"
            icon={<TrendingUp className="size-4" />}
            action={<SeeAllLink href="/reports" label="বিস্তারিত" />}
          />
          <DailyBarChart data={data.series} bn={bn} />
        </Card>

        <Card className="flex flex-col items-center justify-center gap-4">
          <ProgressRing
            value={kpis.monthCollection}
            max={Math.max(kpis.monthSale, 1)}
            label="এই মাসের আদায়"
            sublabel={`বিক্রির ${toBnDigits(
              kpis.monthSale > 0
                ? ((kpis.monthCollection / kpis.monthSale) * 100).toFixed(0)
                : "0",
            )}% আদায় হয়েছে`}
            bn={bn}
            size={148}
          />
          <div className="grid w-full grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-[var(--surface-2)] p-2.5">
              <p className="text-[11px] text-muted">এই মাসের খরচ</p>
              <p className="text-sm font-bold tabular-nums">{fmtMoney(kpis.monthExpense, { bn })}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-2)] p-2.5">
              <p className="text-[11px] text-muted">স্টকের মূল্য</p>
              <p className="text-sm font-bold tabular-nums">{fmtMoney(kpis.stockValue, { bn })}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------------ বাকি + আজকের লেনদেন */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="সবচেয়ে বেশি বাকি"
            subtitle={`${toBnDigits(withDue.length)} জন কাস্টমারের কাছে টাকা আছে`}
            icon={<AlertTriangle className="size-4" />}
            action={<SeeAllLink href="/customers" />}
          />
          <TopDueList rows={withDue.slice(0, 6)} />
        </Card>

        <Card>
          <SectionHeader
            title="আজকের লেনদেন"
            subtitle={`${toBnDigits(data.todayTx.length)} টি এন্ট্রি — আজকের সব হিসাব`}
            icon={<Receipt className="size-4" />}
            action={<SeeAllLink href="/transactions" />}
          />
          <TodayTransactions transactions={data.todayTx} />
        </Card>
      </section>

      {/* ------------------------------------------------------ বয়সভিত্তিক বাকি + স্টক */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="বাকি কতদিনের পুরনো"
            subtitle="কোন বাকি কত দিন ধরে আছে"
            icon={<Clock3 className="size-4" />}
          />
          <div className="space-y-2.5">
            {data.agingBuckets.map((bucket) => {
              const percent =
                kpis.totalDue > 0 ? (bucket.amount / kpis.totalDue) * 100 : 0;
              const tone =
                bucket.min >= 61
                  ? "bg-rose-500"
                  : bucket.min >= 31
                    ? "bg-amber-500"
                    : bucket.min >= 16
                      ? "bg-sky-500"
                      : "bg-emerald-500";
              return (
                <div key={bucket.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      {bucket.label}{" "}
                      <span className="font-normal text-muted">
                        ({toBnDigits(bucket.count)} জন)
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{fmtMoney(bucket.amount, { bn })}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", tone)}
                      style={{ width: `${Math.max(percent, bucket.amount > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {kpis.totalDue > 0 ? (
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              💡 ৬০ দিনের বেশি পুরনো বাকি দ্রুত আদায় করা দরকার — তাগাদা কেন্দ্র থেকে এক
              ট্যাপে হোয়াটসঅ্যাপে মেসেজ পাঠান।
            </p>
          ) : null}
        </Card>

        <Card>
          <SectionHeader
            title="স্টক সতর্কতা"
            subtitle={
              kpis.lowStockCount > 0
                ? `${toBnDigits(kpis.lowStockCount)} টি পণ্য শেষের পথে`
                : "সব পণ্যের স্টক ঠিক আছে"
            }
            icon={<Boxes className="size-4" />}
            action={<SeeAllLink href="/stock" label="স্টক দেখুন" />}
          />
          {data.lowStock.length === 0 ? (
            <EmptyState
              icon={<PackageCheck className="size-6" />}
              title="সব পণ্যের স্টক ভালো আছে"
              description="কোনো পণ্যের স্টক কমে যায়নি।"
              className="border-0"
            />
          ) : (
            <div className="space-y-2">
              {data.lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border p-3"
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      p.stock <= 0 ? TONES.rose : TONES.amber,
                    )}
                  >
                    <PackageCheck className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.category} • বিক্রয় মূল্য {fmtMoney(p.sellPrice, { bn })}
                    </p>
                  </div>
                  <Badge tone={p.stock <= 0 ? "rose" : "amber"}>
                    {p.stock <= 0 ? "স্টক শেষ" : `${toBnDigits(p.stock)} ${p.unit}`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ------------------------------------------------------ দ্রুত তাগাদা + এই মাসের خریدার */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="দ্রুত তাগাদা"
            subtitle="কাস্টমার বেছে নিয়ে সাথে সাথে রিমাইন্ডার পাঠান"
            icon={<BellRing className="size-4" />}
            action={<SeeAllLink href="/reminders" label="তাগাদা কেন্দ্র" />}
          />
          <QuickReminderRow rows={withDue} />
        </Card>

        <Card>
          <SectionHeader
            title="এই মাসে সবচেয়ে বেশি কিনেছেন"
            subtitle="মাসের সেরা কাস্টমার"
            icon={<TrendingUp className="size-4" />}
          />
          {data.topBuyers.length === 0 ? (
            <EmptyState
              title="এই মাসে এখনো বিক্রি হয়নি"
              description="বিক্রি শুরু হলে সেরা কাস্টমার তালিকা এখানে দেখা যাবে।"
              className="border-0"
            />
          ) : (
            <div className="space-y-2.5">
              {data.topBuyers.map((row, index) => (
                <div key={row.customer.id} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-xs font-bold">
                    {toBnDigits(index + 1)}
                  </span>
                  <Link
                    href={`/customers/${row.customer.id}`}
                    className="flex min-w-0 flex-1 items-center gap-2.5"
                  >
                    <Avatar name={row.customer.name} color={row.customer.color} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.customer.name}</p>
                      <p className="text-[11px] text-muted">
                        বর্তমান বাকি {fmtMoney(row.due, { bn })}
                      </p>
                    </div>
                  </Link>
                  <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtMoney(row.amount, { bn })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ------------------------------------------------------ সাম্প্রতিক কাজ */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHeader
            title="সাম্প্রতিক কাজকর্ম"
            subtitle="আপনার শেষ কয়েকটি এন্ট্রি"
            icon={<Wallet className="size-4" />}
          />
          {data.activities.length === 0 ? (
            <EmptyState title="কোনো কাজের রেকর্ড নেই" className="border-0" />
          ) : (
            <ol className="relative space-y-3 border-l pl-4">
              {data.activities.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand-500 ring-4 ring-[var(--surface)]" />
                  <p className="text-sm font-medium leading-snug">{a.title}</p>
                  <p className="text-[11px] text-muted">
                    {fmtRelative(a.createdAt, bn)}
                    {a.amount ? ` • ${fmtMoney(a.amount, { bn })}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex items-center gap-3 p-3.5">
              <div className={cn("flex size-10 items-center justify-center rounded-xl", TONES.amber)}>
                <Truck className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted">সাপ্লায়ার পাওনা</p>
                <p className="text-sm font-bold tabular-nums">
                  {fmtMoney(kpis.supplierPayable, { bn })}
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-3.5">
              <div className={cn("flex size-10 items-center justify-center rounded-xl", TONES.rose)}>
                <TrendingDown className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted">এই মাসের খরচ</p>
                <p className="text-sm font-bold tabular-nums">
                  {fmtMoney(kpis.monthExpense, { bn })}
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-3.5">
              <div className={cn("flex size-10 items-center justify-center rounded-xl", TONES.sky)}>
                <CreditCard className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted">এই মাসের আদায়</p>
                <p className="text-sm font-bold tabular-nums">
                  {fmtMoney(kpis.monthCollection, { bn })}
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-3.5">
              <div className={cn("flex size-10 items-center justify-center rounded-xl", TONES.violet)}>
                <Boxes className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted">মোট পণ্য</p>
                <p className="text-sm font-bold tabular-nums">
                  {toBnDigits(data.products.length)} টি
                </p>
              </div>
            </div>
          </div>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold">স্মার্ট পরামর্শ</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {kpis.dueCustomers > 0
                    ? `আপনার ${toBnDigits(kpis.dueCustomers)} জন কাস্টমারের কাছে বাকি আছে। সপ্তাহে অন্তত একবার তাগাদা পাঠালে আদায় ${toBnDigits(30)}% পর্যন্ত বাড়ে।`
                    : "সব কাস্টমারের হিসাব পরিষ্কার — দুর্দান্ত! এখন নতুন কাস্টমার বাড়ানোর সময়।"}
                </p>
                <Link
                  href="/reminders"
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300"
                >
                  তাগাদা পাঠান <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
