"use client";

import { Activity, BookOpen, CheckCircle2, PlugZap, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import SettingsForm from "../SettingsForm";
import { relativeTime } from "../adminUtils";
import { Badge, Button, Card, EmptyState, Grid, Notice, PageHead, Stack, TableWrap } from "../ui";

/**
 * Pixels & tracking.
 *
 * The owner's job here is to paste two IDs and two tokens. Everything else —
 * which events fire, de-duplicating browser against server, consent — is
 * handled for them, so this screen is mostly about making the state of each
 * connection obvious and letting them prove it works before a campaign runs.
 */
export default function Marketing() {
  const utils = trpc.useUtils();
  const connections = trpc.settings.connectionStatus.useQuery(undefined, { retry: false });
  const recent = trpc.analytics.recent.useQuery({ limit: 8 }, { retry: false });
  const testPixels = trpc.settings.testPixels.useMutation();
  const [lastTest, setLastTest] = useState<Array<{ provider: string; ok: boolean; message?: string }>>([]);

  const runTest = async (provider: "meta" | "tiktok" | "all") => {
    try {
      const results = await testPixels.mutateAsync({ provider });
      setLastTest(results);
      const failed = results.filter(result => !result.ok);
      if (failed.length === 0) {
        toast.success("Test event delivered", {
          description: "Check Events Manager or TikTok Test Events — it should appear within a minute.",
        });
      } else {
        toast.error("A connection is not working", { description: failed[0]?.message });
      }
      await utils.settings.connectionStatus.invalidate();
    } catch (error) {
      toast.error("The test could not run", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const serverCapable = (connections.data ?? []).filter(row => row.provider === "meta" || row.provider === "tiktok");

  return (
    <AdminShell title="Pixels & tracking" breadcrumb="Marketing">
      <PageHead
        title="Pixels & tracking"
        description="Connect Facebook, Instagram, TikTok and Google so your ads can measure real sales and optimise towards them."
        actions={
          <Button
            variant="primary"
            icon={PlugZap}
            disabled={testPixels.isPending}
            onClick={() => void runTest("all")}
          >
            {testPixels.isPending ? "Testing…" : "Test connections"}
          </Button>
        }
      />

      <SettingsForm
        group="marketing"
        intro={
          <Stack gap={16}>
            <Grid min={280}>
              {(connections.data ?? []).map(connection => {
                const test = lastTest.find(result => result.provider === connection.provider);
                const live = connection.enabled && connection.browserReady;
                return (
                  <div className="sfa-card" key={connection.provider} style={{ padding: 15 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBlockEnd: 10 }}>
                      <span style={{ fontWeight: 650, fontSize: 13.5, flex: 1 }}>{connection.label}</span>
                      <Badge tone={live ? "success" : connection.browserReady ? "warning" : "neutral"} dot>
                        {live ? "Live" : connection.browserReady ? "Off" : "Not set up"}
                      </Badge>
                    </div>
                    <Stack gap={6}>
                      <CheckLine ok={connection.browserReady} label="Browser pixel ID" />
                      {connection.provider === "meta" || connection.provider === "tiktok" ? (
                        <CheckLine
                          ok={connection.serverReady}
                          label="Server-side API token"
                          hint="Recovers the ~30% of shoppers whose browser blocks the pixel."
                        />
                      ) : null}
                      {connection.testMode ? (
                        <p className="sfa-help" style={{ color: "var(--sfa-warn)" }}>
                          A test event code is set — clear it before running real campaigns.
                        </p>
                      ) : null}
                      {test ? (
                        <p className="sfa-help" style={{ color: test.ok ? "var(--sfa-success)" : "var(--sfa-danger)" }}>
                          {test.ok ? "Test event accepted." : test.message}
                        </p>
                      ) : null}
                    </Stack>
                  </div>
                );
              })}
              {connections.isLoading
                ? Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="sfa-skeleton" style={{ height: 132 }} />
                  ))
                : null}
            </Grid>

            <Notice tone="info" title="How this works.">
              Each event is sent twice — once from the shopper's browser and once from our server — carrying the same
              event ID. Meta and TikTok merge the pair, so nothing is counted twice, but a conversion still arrives when
              an ad blocker stops the browser copy. Access tokens are stored server-side and never reach a browser.
            </Notice>
          </Stack>
        }
      >
        <Card
          title="Verify a connection"
          description="Sends one real test event to each platform so you can confirm setup without waiting for traffic."
        >
          <Stack gap={12}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {serverCapable.map(connection => (
                <Button
                  key={connection.provider}
                  icon={Activity}
                  disabled={testPixels.isPending || !connection.serverReady}
                  onClick={() => void runTest(connection.provider as "meta" | "tiktok")}
                  title={connection.serverReady ? undefined : "Add the API token first"}
                >
                  Test {connection.label}
                </Button>
              ))}
            </div>
            <p className="sfa-help">
              A test only proves the server-side connection. For the browser pixel, open your storefront with the Meta
              Pixel Helper or TikTok Pixel Helper extension.
            </p>
          </Stack>
        </Card>

        <Card title="Where to find each value" description="Both platforms bury these two screens deep.">
          <Grid min={300}>
            <Guide
              title="Meta Pixel ID and CAPI token"
              steps={[
                "Open Meta Events Manager and pick your business.",
                "Data sources → your pixel. The number under its name is the Pixel ID.",
                "Settings tab → Conversions API → Generate access token.",
                "Paste both below and switch Meta tracking on.",
              ]}
            />
            <Guide
              title="TikTok pixel code and Events API token"
              steps={[
                "TikTok Ads Manager → Assets → Events → Web Events.",
                "Open your pixel; the ID at the top is the pixel code.",
                "Settings → Events API → Generate access token.",
                "Paste both below and switch TikTok tracking on.",
              ]}
            />
          </Grid>
        </Card>

        <Card
          title="Recent tracked events"
          description="Our own record, independent of what the ad platforms report."
          flush
        >
          {recent.error || (recent.data ?? []).length === 0 ? (
            <EmptyState title="No events recorded yet" icon={Activity}>
              Events appear here as soon as a shopper browses the storefront with tracking enabled.
            </EmptyState>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Page</th>
                  <th className="sfa-table__num">Value</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {(recent.data ?? []).map(event => (
                  <tr key={event.id}>
                    <td className="sfa-table__primary">{event.eventName.replace(/_/g, " ")}</td>
                    <td className="sfa-table__muted sfa-mono">{event.path ?? "—"}</td>
                    <td className="sfa-table__num">
                      {event.value === null ? "—" : `${(event.value / 100).toLocaleString()} ${event.currency ?? ""}`}
                    </td>
                    <td className="sfa-table__muted">{relativeTime(event.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Notice tone="warning" title="Consent is not optional in most markets.">
          The consent setting below decides who gets tracked. With the banner on, pixels stay silent until a visitor
          agrees — which is what the GDPR, PIPEDA and similar rules require. Turning it off is a decision to take on
          that risk yourself.
        </Notice>
      </SettingsForm>
    </AdminShell>
  );
}

function CheckLine({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      {ok ? (
        <CheckCircle2 size={15} style={{ color: "var(--sfa-success)", flexShrink: 0, marginBlockStart: 1 }} aria-hidden="true" />
      ) : (
        <XCircle size={15} style={{ color: "var(--sfa-text-muted)", flexShrink: 0, marginBlockStart: 1 }} aria-hidden="true" />
      )}
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {hint && !ok ? <div className="sfa-help">{hint}</div> : null}
      </div>
    </div>
  );
}

function Guide({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div>
      <p style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 650, fontSize: 13.5, marginBlockEnd: 8 }}>
        <BookOpen size={15} aria-hidden="true" style={{ color: "var(--sfa-accent)" }} />
        {title}
      </p>
      <ol style={{ display: "grid", gap: 6, paddingInlineStart: 18, margin: 0 }}>
        {steps.map(step => (
          <li key={step} className="sfa-help" style={{ listStyle: "decimal" }}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Re-exported so the settings screens can share the same privacy footnote. */
export function PrivacyNote() {
  return (
    <Notice tone="info" title="Personal data never leaves in the clear.">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ShieldCheck size={14} aria-hidden="true" />
        Emails and phone numbers are SHA-256 hashed before any platform sees them, exactly as Meta and TikTok require.
      </span>
    </Notice>
  );
}
