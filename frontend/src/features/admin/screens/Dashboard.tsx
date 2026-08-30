"use client";

import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Inbox,
  MessageSquareText,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { ORDER_STATUS_TONE, formatDate, relativeTime, useMoney, type OrderStatus } from "../adminUtils";
import { Badge, EmptyState, Notice } from "../ui";

/**
 * The screen the owner lands on.
 *
 * It answers four questions before anything is clicked: is money coming in, is
 * anything waiting on me, where is it trending, and what happened recently.
 * Laid out the way a wall of information should be read — one headline figure
 * large enough to take in from across the room, the trend beside it, the queue
 * and the ledger underneath.
 *
 * Every figure on this page is real. Where the database is not connected they
 * render as zero rather than as invented sample data, which is the difference
 * between an empty dashboard and a lying one.
 */

/** Bars, in the reference's proportion: a handful of fat rounded columns. */
const BAR_BUCKETS = 6;

type Window = "30d" | "180d";

const WINDOWS: Record<Window, { days: number; label: string; caption: string }> = {
  "30d": { days: 30, label: "30 days", caption: "Weekly, last 30 days" },
  "180d": { days: 180, label: "6 months", caption: "Monthly, last 6 months" },
};

export default function Dashboard() {
  const { format, formatCompact, symbol } = useMoney();
  const { user } = useAuth();
  const [window, setWindow] = useState<Window>("30d");

  const overview = trpc.admin.overview.useQuery(undefined, { retry: false });
  const sales = trpc.admin.salesTimeline.useQuery({ days: WINDOWS[window].days }, { retry: false });
  const trend = trpc.admin.salesTimeline.useQuery({ days: 60 }, { retry: false });
  const orders = trpc.admin.listOrders.useQuery(undefined, { retry: false });
  const inquiries = trpc.admin.listInquiries.useQuery(undefined, { retry: false });

  const databaseDown = Boolean(overview.error);
  const stats = overview.data;

  /**
   * The daily series is too dense to read as columns, so it is folded into six
   * even buckets. Six weeks or six months, depending on the window — the
   * caption says which, because a bar chart with an ambiguous x-axis is worse
   * than no chart.
   */
  const bars = useMemo(() => {
    const series = sales.data ?? [];
    if (series.length === 0) return [];
    const size = Math.ceil(series.length / BAR_BUCKETS);
    const buckets: Array<{ label: string; revenue: number; orders: number }> = [];
    for (let start = 0; start < series.length; start += size) {
      const slice = series.slice(start, start + size);
      const last = slice[slice.length - 1];
      buckets.push({
        label: new Date(`${last.day}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          ...(window === "30d" ? { day: "numeric" } : {}),
        }),
        revenue: slice.reduce((total, point) => total + point.revenue, 0) / 100,
        orders: slice.reduce((total, point) => total + point.orderCount, 0),
      });
    }
    return buckets;
  }, [sales.data, window]);

  const peakIndex = useMemo(() => {
    if (bars.length === 0) return -1;
    return bars.reduce((best, bar, index) => (bar.revenue > bars[best].revenue ? index : best), 0);
  }, [bars]);

  /** Sparkline for the balance card — sixty days, one point per day. */
  const spark = useMemo(
    () => (trend.data ?? []).map((point) => ({ day: point.day, revenue: point.revenue / 100 })),
    [trend.data],
  );

  /**
   * Last thirty days against the thirty before them. Both halves come from the
   * same sixty-day series so the comparison is like for like.
   */
  const movement = useMemo(() => {
    const series = trend.data ?? [];
    if (series.length < 2) return null;
    const half = Math.floor(series.length / 2);
    const sum = (from: number, to: number) =>
      series.slice(from, to).reduce((total, point) => total + point.revenue, 0);
    const previous = sum(0, half);
    const current = sum(half, series.length);
    if (previous === 0) return current === 0 ? { percent: 0, current } : null;
    return { percent: ((current - previous) / previous) * 100, current };
  }, [trend.data]);

  const recentOrders = (orders.data ?? []).slice(0, 5);
  const openInquiries = (inquiries.data ?? []).filter((inquiry) => inquiry.status === "new");

  const rangeLabel = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - WINDOWS[window].days * 24 * 60 * 60 * 1000);
    const short = (date: Date) =>
      date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return `${short(from)} — ${short(to)}`;
  }, [window]);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <AdminShell title="Dashboard" breadcrumb="Overview">
      <div className="sfa-studio">
        {databaseDown ? (
          <Notice tone="warning" title="The database is not connected.">
            Every screen in this admin is built and wired. Figures stay at zero and saving is held back
            until the connection is live — nothing here is a placeholder.
          </Notice>
        ) : null}

        {/* ------------------------------------------------------------ head */}
        <div className="sfa-studio__head">
          <h1 className="sfa-studio__hello">
            Welcome back, <span>{firstName}</span>
          </h1>

          <div className="sfa-studio__tools">
            <span className="sfa-chip">
              <CalendarDays size={16} aria-hidden="true" />
              {rangeLabel}
            </span>
            <Link href="/admin/products?new=1" className="sfa-btn sfa-btn--primary sfa-btn--pill">
              <Plus size={16} aria-hidden="true" />
              Add product
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------- top three */}
        <div className="sfa-studio__grid">
          {/* ----------------------------------------------- headline figure */}
          <div className="sfa-studio__col">
            <section className="sfa-scard">
              <CardHead
                glyph={CreditCard}
                title="Revenue"
                sub="Last 30 days"
                href="/admin/orders"
                hrefLabel="Open orders"
              />

              <div className="sfa-balance">
                <div className="sfa-balance__row">
                  <span className="sfa-balance__brand">Sofa Co.</span>
                  <Wallet size={20} aria-hidden="true" style={{ opacity: 0.85 }} />
                </div>
                <div>
                  <div className="sfa-balance__label">Taken, last 30 days</div>
                  <div className="sfa-balance__value">{format(stats?.revenueLast30Days ?? 0)}</div>
                </div>
                <div className="sfa-balance__row">
                  <span className="sfa-balance__meta">{stats?.orders ?? 0} orders all time</span>
                  <span className="sfa-balance__meta">{format(stats?.revenueTotal ?? 0)} total</span>
                </div>
              </div>
            </section>

            <section className="sfa-scard">
              <CardHead glyph={TrendingUp} title="Against the month before" sub="Thirty days on thirty" />
              <div className="sfa-figure">
                {formatCompact(movement?.current ?? 0)}
                <Delta percent={movement?.percent ?? null} />
              </div>
              {/* Sixty days of daily takings under the figure that summarises
                  them. Below three trading days the shape says nothing true,
                  so it is left out rather than drawn as a spike. */}
              {spark.filter((point) => point.revenue > 0).length >= 3 ? (
                <div style={{ overflow: "hidden", borderRadius: 12 }}>
                  <RevenueSpark data={spark} />
                </div>
              ) : null}
            </section>
          </div>

          {/* ------------------------------------------------------ the plot */}
          <section className="sfa-scard">
            <div className="sfa-scard__head">
              <div className="sfa-scard__ident">
                <span className="sfa-scard__glyph">
                  <TrendingUp size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="sfa-scard__title">Sales</h2>
                  <p className="sfa-scard__sub">{WINDOWS[window].caption}</p>
                </div>
              </div>

              <div className="sfa-seg" role="group" aria-label="Chart window">
                {(Object.keys(WINDOWS) as Window[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="sfa-seg__btn"
                    aria-pressed={window === key}
                    onClick={() => setWindow(key)}
                  >
                    {WINDOWS[key].label}
                  </button>
                ))}
              </div>
            </div>

            {bars.every((bar) => bar.revenue === 0) ? (
              <EmptyState title="No sales to chart yet" icon={TrendingUp}>
                Once the first order lands, this fills in bucket by bucket.
              </EmptyState>
            ) : (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ top: 16, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11.5, fill: "var(--sfa-text-muted)" }}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--sfa-surface-2)", radius: 14 }}
                      contentStyle={{
                        background: "var(--sfa-surface)",
                        border: "1px solid var(--sfa-border)",
                        borderRadius: 12,
                        fontSize: 12.5,
                        boxShadow: "0 18px 40px -28px rgba(71,47,29,0.6)",
                      }}
                      formatter={(value: number, name) =>
                        name === "revenue"
                          ? [`${symbol}${value.toLocaleString()}`, "Revenue"]
                          : [value, "Orders"]
                      }
                    />
                    {/* The busiest bucket is the one worth spotting from a distance. */}
                    {/* The track behind each column keeps the rhythm of the chart
                        readable on a quiet week, when most buckets are zero. */}
                    <Bar
                      dataKey="revenue"
                      radius={[999, 999, 999, 999]}
                      maxBarSize={62}
                      background={{ fill: "var(--sfa-surface-2)", radius: 999 } as never}
                    >
                      {bars.map((bar, index) => (
                        <Cell
                          key={bar.label}
                          fill={index === peakIndex ? "var(--sfa-accent)" : "var(--sfa-accent-soft)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* ----------------------------------------------------- the queue */}
          <div className="sfa-studio__col">
            <section className="sfa-scard">
              <CardHead glyph={Sparkles} title="Needs you" sub="Waiting right now" />
              <div className="sfa-queue">
                <QueueRow label="Orders to process" count={stats?.pendingOrders ?? 0} href="/admin/orders" />
                <QueueRow label="Reviews to approve" count={stats?.pendingReviews ?? 0} href="/admin/reviews" icon={Star} />
                <QueueRow label="Unread inquiries" count={stats?.newInquiries ?? 0} href="/admin/inquiries" icon={MessageSquareText} />
                <QueueRow label="Reminder drafts" count={stats?.reminderDrafts ?? 0} href="/admin/reminders" icon={Sparkles} />
              </div>
            </section>

            <section className="sfa-scard">
              <CardHead glyph={Users} title="Store at a glance" sub="Live counts" href="/admin/customers" hrefLabel="Open customers" />
              <div style={{ display: "grid", gap: 14 }}>
                <MiniFigure label="Customers" value={stats?.customers ?? 0} foot={`${stats?.activeCarts ?? 0} carts open`} />
                <MiniFigure label="Products live" value={stats?.products ?? 0} foot="Across seven series" icon={Boxes} />
              </div>
            </section>
          </div>
        </div>

        {/* ------------------------------------------------------ the ledger */}
        <div className="sfa-studio__wide">
          <section className="sfa-scard">
            <CardHead
              glyph={ShoppingCart}
              title="Recent orders"
              sub="The last five, newest first"
              href="/admin/orders"
              hrefLabel="Open orders"
            />

            {recentOrders.length === 0 ? (
              <EmptyState title="No orders yet" icon={ShoppingCart}>
                New orders appear here the moment they are placed.
              </EmptyState>
            ) : (
              <div>
                <div className="sfa-hrow sfa-hrow--head" aria-hidden="true">
                  <span>Customer</span>
                  <span>Placed</span>
                  <span>Status</span>
                  <span style={{ textAlign: "end" }}>Amount</span>
                </div>
                {recentOrders.map((order) => (
                  <Link key={order.id} href="/admin/orders" className="sfa-hrow">
                    <span className="sfa-hrow__who">
                      <span className="sfa-avatar" aria-hidden="true">
                        {initials(order.customerName)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="sfa-hrow__name">{order.customerName}</span>
                        <span className="sfa-hrow__meta" style={{ display: "block" }}>
                          #{order.id} · {order.customerEmail}
                        </span>
                      </span>
                    </span>
                    <span className="sfa-hrow__meta">{formatDate(order.createdAt)}</span>
                    <span>
                      <Badge tone={ORDER_STATUS_TONE[order.status as OrderStatus]} dot>
                        {order.status}
                      </Badge>
                    </span>
                    <span className="sfa-hrow__num">{format(order.totalAmount)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="sfa-studio__col">
            <section className="sfa-scard">
              <CardHead
                glyph={Inbox}
                title="Open inquiries"
                sub={openInquiries.length === 1 ? "One waiting on a reply" : `${openInquiries.length} waiting on a reply`}
                href="/admin/inquiries"
                hrefLabel="Open inbox"
              />

              {openInquiries.length === 0 ? (
                <EmptyState title="Inbox is clear" icon={MessageSquareText}>
                  Nothing is waiting on a reply.
                </EmptyState>
              ) : (
                <>
                  <div className="sfa-facepile">
                    {openInquiries.slice(0, 4).map((inquiry) => (
                      <span key={inquiry.id} className="sfa-avatar" aria-hidden="true">
                        {initials(`${inquiry.firstName} ${inquiry.lastName}`)}
                      </span>
                    ))}
                    {openInquiries.length > 4 ? (
                      <span className="sfa-avatar sfa-facepile__more" aria-hidden="true">
                        +{openInquiries.length - 4}
                      </span>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    {openInquiries.slice(0, 3).map((inquiry) => (
                      <div key={inquiry.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                            {inquiry.firstName} {inquiry.lastName}
                          </span>
                          <span className="sfa-hrow__meta">{relativeTime(inquiry.createdAt)}</span>
                        </div>
                        <p className="sfa-help" style={{ marginBlockStart: 2 }}>
                          {inquiry.message.slice(0, 82)}
                          {inquiry.message.length > 82 ? "…" : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="sfa-scard">
              <CardHead glyph={ExternalLink} title="Shortcuts" sub="The screens used most" />
              <div className="sfa-queue">
                <ShortcutRow href="/admin/marketing" label="Facebook & TikTok tracking" />
                <ShortcutRow href="/admin/products" label="Product options builder" />
                <ShortcutRow href="/admin/settings/checkout" label="Shipping & tax" />
                <ShortcutRow href="/" label="Open the storefront" external />
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ parts -- */

function CardHead({
  glyph: Glyph,
  title,
  sub,
  href,
  hrefLabel,
}: {
  glyph: typeof Wallet;
  title: string;
  sub?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="sfa-scard__head">
      <div className="sfa-scard__ident">
        <span className="sfa-scard__glyph">
          <Glyph size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="sfa-scard__title">{title}</h2>
          {sub ? <p className="sfa-scard__sub">{sub}</p> : null}
        </div>
      </div>

      {href ? (
        <Link href={href} className="sfa-scard__out" aria-label={hrefLabel ?? title}>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

/** Percentage movement, or an honest dash when there is no baseline to compare. */
function Delta({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <span className="sfa-delta sfa-delta--flat">
        <Minus size={12} aria-hidden="true" />
        No baseline
      </span>
    );
  }

  const rounded = Math.round(percent * 10) / 10;
  const tone = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus;

  return (
    <span className={`sfa-delta sfa-delta--${tone}`}>
      <Icon size={12} aria-hidden="true" />
      {rounded > 0 ? "+" : ""}
      {rounded}%
    </span>
  );
}

function MiniFigure({
  label,
  value,
  foot,
  icon: Icon = Users,
}: {
  label: string;
  value: number;
  foot: string;
  icon?: typeof Users;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="sfa-scard__glyph">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div style={{ flex: 1 }}>
        <div className="sfa-scard__sub" style={{ margin: 0 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {value.toLocaleString()}
        </div>
      </div>
      <span className="sfa-hrow__meta">{foot}</span>
    </div>
  );
}

function QueueRow({
  label,
  count,
  href,
  icon: Icon = ShoppingCart,
}: {
  label: string;
  count: number;
  href: string;
  icon?: typeof ShoppingCart;
}) {
  const waiting = count > 0;
  return (
    <Link href={href} className="sfa-queue__row" data-waiting={waiting}>
      <Icon
        size={15}
        aria-hidden="true"
        style={{ color: waiting ? "var(--sfa-accent)" : "var(--sfa-text-muted)" }}
      />
      <span className="sfa-queue__label">{label}</span>
      <span className="sfa-queue__count">{count}</span>
    </Link>
  );
}

function ShortcutRow({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="sfa-queue__row"
    >
      <span className="sfa-queue__label">{label}</span>
      <ArrowUpRight size={15} aria-hidden="true" style={{ color: "var(--sfa-text-muted)" }} />
    </Link>
  );
}

/** Two letters from a name, for the avatar circles. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Kept for the balance card's sparkline once the series is dense enough to be
 * worth drawing. Recharts is already in the bundle for the bar chart, so this
 * costs nothing to keep wired.
 */
export function RevenueSpark({ data }: { data: Array<{ day: string; revenue: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={70}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sfaSpark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sfa-accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--sfa-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="revenue" stroke="var(--sfa-accent)" strokeWidth={2} fill="url(#sfaSpark)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
