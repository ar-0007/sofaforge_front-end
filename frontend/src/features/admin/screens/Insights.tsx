"use client";

import { Activity, BarChart3, Clock, Eye, MousePointerClick, Route, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { relativeTime } from "../adminUtils";
import {
  Badge,
  Card,
  EmptyState,
  FilterBar,
  Grid,
  Notice,
  PageHead,
  Stack,
  Stat,
  TableWrap,
} from "../ui";

const WINDOWS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

/** Events we chart by default; the rest are still counted in the totals. */
const HEADLINE_EVENTS = ["page_view", "view_item", "add_to_cart", "begin_checkout", "purchase"] as const;

/** The admin's chart family, read from the design tokens so it follows the brand. */
const SERIES_COLORS = [
  "var(--sfa-chart-1)",
  "var(--sfa-chart-2)",
  "var(--sfa-chart-3)",
  "var(--sfa-chart-4)",
  "var(--sfa-chart-5)",
  "var(--sfa-chart-6)",
];

const TOOLTIP_STYLE = {
  background: "var(--sfa-surface)",
  border: "1px solid var(--sfa-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--sfa-text)",
} as const;

/**
 * Our own analytics, independent of what Meta or TikTok report. Ad platforms
 * only show what their pixel saw; this is the copy the owner controls.
 */
export default function Insights() {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const timeline = trpc.analytics.timeline.useQuery({ days }, { retry: false });
  const funnel = trpc.analytics.funnel.useQuery({ days }, { retry: false });
  const recent = trpc.analytics.recent.useQuery({ limit: 25 }, { retry: false });
  const behaviour = trpc.analytics.behaviour.useQuery({ days }, { retry: false });

  const chartData = useMemo(() => {
    const byDay = new Map<string, Record<string, number | string>>();
    for (const row of timeline.data ?? []) {
      const entry = byDay.get(row.day) ?? { day: row.day.slice(5) };
      entry[row.event] = row.total;
      byDay.set(row.day, entry);
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, entry]) => entry);
  }, [timeline.data]);

  const totals = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of timeline.data ?? []) counts[row.event] = (counts[row.event] ?? 0) + row.total;
    return counts;
  }, [timeline.data]);

  const conversionRate = useMemo(() => {
    const views = funnel.data?.find(step => step.step === "page_view")?.total ?? 0;
    const purchases = funnel.data?.find(step => step.step === "purchase")?.total ?? 0;
    if (views === 0) return null;
    return (purchases / views) * 100;
  }, [funnel.data]);

  const busiestHour = useMemo(() => {
    const hours = behaviour.data?.hourly ?? [];
    if (hours.length === 0) return null;
    const peak = hours.reduce((best, entry) => (entry.events > best.events ? entry : best), hours[0]);
    return peak.events === 0 ? null : peak.hour;
  }, [behaviour.data]);

  const hasData = (timeline.data ?? []).length > 0;
  const hasBehaviour = (behaviour.data?.sessions ?? 0) > 0;

  return (
    <AdminShell title="Insights" breadcrumb="Grow">
      <PageHead
        title="Insights"
        description="What shoppers actually did on the storefront — measured first-party, not borrowed from an ad platform."
      />

      <Stack gap={16}>
        <FilterBar
          value={days}
          onChange={setDays}
          options={WINDOWS.map(window => ({ value: window.value, label: window.label }))}
        />

        {timeline.error ? (
          <Notice tone="warning" title="The database is not connected.">
            Insights fill in once events are being recorded.
          </Notice>
        ) : null}

        <Grid min={190}>
          <Stat label="Page views" value={totals.page_view ?? 0} icon={Eye} loading={timeline.isLoading} />
          <Stat
            label="Sessions"
            value={behaviour.data?.sessions ?? 0}
            icon={Users}
            loading={behaviour.isLoading}
            foot={`${behaviour.data?.eventsPerSession ?? 0} actions per session`}
          />
          <Stat
            label="Added to cart"
            value={totals.add_to_cart ?? 0}
            icon={MousePointerClick}
            loading={timeline.isLoading}
            foot={
              totals.view_item
                ? `${Math.round(((totals.add_to_cart ?? 0) / totals.view_item) * 100)}% of product views`
                : undefined
            }
          />
          <Stat
            label="View → purchase"
            value={conversionRate === null ? "—" : `${conversionRate.toFixed(2)}%`}
            icon={BarChart3}
            loading={funnel.isLoading}
          />
          <Stat
            label="Busiest hour"
            value={busiestHour === null ? "—" : `${String(busiestHour).padStart(2, "0")}:00`}
            icon={Clock}
            loading={behaviour.isLoading}
            foot="When shoppers are most active"
          />
        </Grid>

        <Card title="Events over time" description={`Daily counts, last ${days} days.`}>
          {!hasData ? (
            <EmptyState title="No events recorded yet" icon={Activity}>
              Once the storefront starts sending events they appear here within minutes.
            </EmptyState>
          ) : (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--sfa-border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "var(--sfa-text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--sfa-text-muted)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--sfa-surface-3)" }} />
                  <Legend wrapperStyle={{ fontSize: 11.5 }} />
                  {HEADLINE_EVENTS.map((event, index) => (
                    <Bar
                      key={event}
                      dataKey={event}
                      stackId="events"
                      fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                      radius={index === HEADLINE_EVENTS.length - 1 ? [3, 3, 0, 0] : undefined}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }} className="sfa-dash-split">
          <Card title="Funnel" description="Where shoppers drop off.">
            <Stack gap={12}>
              {(funnel.data ?? []).map((step, index, all) => {
                const top = all[0]?.total || 1;
                const previous = index === 0 ? step.total : all[index - 1].total;
                const dropOff = previous === 0 ? 0 : Math.round(((previous - step.total) / previous) * 100);
                return (
                  <div key={step.step}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBlockEnd: 4 }}>
                      <span style={{ color: "var(--sfa-text-soft)" }}>{step.step.replace(/_/g, " ")}</span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {index > 0 && dropOff > 0 ? <Badge tone="warning">−{dropOff}%</Badge> : null}
                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>{step.total}</strong>
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--sfa-surface-3)" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(2, Math.round((step.total / top) * 100))}%`,
                          borderRadius: 999,
                          background: SERIES_COLORS[index % SERIES_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </Stack>
          </Card>

          <Card title="When shoppers browse" description="Events by hour of day, in your timezone.">
            {!hasBehaviour ? (
              <EmptyState title="Not enough activity yet" icon={Clock}>
                A day or two of traffic is enough to show when your shoppers are actually online — useful for timing
                campaigns and posts.
              </EmptyState>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={behaviour.data?.hourly ?? []} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="var(--sfa-border)" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(hour: number) => `${String(hour).padStart(2, "0")}`}
                      tick={{ fontSize: 11, fill: "var(--sfa-text-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      interval={1}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "var(--sfa-text-muted)" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: "var(--sfa-surface-3)" }}
                      labelFormatter={(hour: number) => `${String(hour).padStart(2, "0")}:00`}
                      formatter={(value: number) => [value, "Events"]}
                    />
                    <Bar dataKey="events" fill="var(--sfa-chart-1)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Where shoppers come from" description={`Traffic by source, last ${days} days.`}>
            {(behaviour.data?.sources ?? []).length === 0 ? (
              <EmptyState title="No referrers recorded yet" icon={Route} />
            ) : (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 160px) minmax(0, 1fr)", alignItems: "center" }}>
                <div style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={behaviour.data?.sources ?? []}
                        dataKey="visits"
                        nameKey="source"
                        innerRadius={38}
                        outerRadius={70}
                        paddingAngle={2}
                        stroke="var(--sfa-surface)"
                        strokeWidth={2}
                      >
                        {(behaviour.data?.sources ?? []).map((entry, index) => (
                          <Cell key={entry.source} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Stack gap={7}>
                  {(behaviour.data?.sources ?? []).map((entry, index) => (
                    <div key={entry.source} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          background: SERIES_COLORS[index % SERIES_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {entry.source}
                      </span>
                      <strong style={{ fontVariantNumeric: "tabular-nums" }}>{entry.visits}</strong>
                    </div>
                  ))}
                </Stack>
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }} className="sfa-dash-split">
          <Card flush title="Most-visited pages" description="Where attention actually goes.">
            {(behaviour.data?.topPaths ?? []).length === 0 ? (
              <EmptyState title="No page views recorded yet" icon={Eye} />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th>Page</th>
                    <th className="sfa-table__num">Views</th>
                    <th style={{ width: "38%" }} aria-label="Share" />
                  </tr>
                </thead>
                <tbody>
                  {(behaviour.data?.topPaths ?? []).map(entry => {
                    const top = behaviour.data?.topPaths[0]?.views || 1;
                    return (
                      <tr key={entry.path}>
                        <td className="sfa-mono" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {entry.path}
                        </td>
                        <td className="sfa-table__num">{entry.views}</td>
                        <td>
                          <div style={{ height: 6, borderRadius: 999, background: "var(--sfa-surface-3)" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.max(3, Math.round((entry.views / top) * 100))}%`,
                                borderRadius: 999,
                                background: "var(--sfa-chart-1)",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            )}
          </Card>

          <Card flush title="Most-wanted products" description="Views against how often they reach a cart.">
            {(behaviour.data?.topProducts ?? []).length === 0 ? (
              <EmptyState title="No product interest recorded yet" icon={MousePointerClick}>
                Once shoppers open product pages, the ones drawing real intent show up here.
              </EmptyState>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="sfa-table__num">Views</th>
                    <th className="sfa-table__num">To cart</th>
                    <th className="sfa-table__num">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(behaviour.data?.topProducts ?? []).map(entry => (
                    <tr key={entry.id}>
                      <td className="sfa-table__primary">{entry.name}</td>
                      <td className="sfa-table__num">{entry.views}</td>
                      <td className="sfa-table__num">{entry.addedToCart}</td>
                      <td className="sfa-table__num">
                        {entry.views === 0 ? (
                          "—"
                        ) : (
                          <Badge tone={entry.addedToCart / entry.views >= 0.1 ? "success" : "neutral"}>
                            {Math.round((entry.addedToCart / entry.views) * 100)}%
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }} className="sfa-dash-split">
          <Card flush title="Latest events">
            {(recent.data ?? []).length === 0 ? (
              <EmptyState title="Nothing recorded yet" icon={Activity} />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Page</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent.data ?? []).map(event => (
                    <tr key={event.id}>
                      <td className="sfa-table__primary">{event.eventName.replace(/_/g, " ")}</td>
                      <td className="sfa-table__muted sfa-mono">{event.path ?? "—"}</td>
                      <td className="sfa-table__muted">{relativeTime(event.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>
      </Stack>
    </AdminShell>
  );
}
