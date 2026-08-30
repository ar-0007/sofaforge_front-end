"use client";

import { AlertTriangle, Store, Truck } from "lucide-react";
import type { SettingGroupId } from "@shared/settings/registry";
import { SETTING_GROUPS } from "@shared/settings/registry";
import AdminShell from "../AdminShell";
import SettingsForm from "../SettingsForm";
import { Notice, PageHead } from "../ui";

const BREADCRUMB: Record<SettingGroupId, string> = {
  store: "Store details",
  checkout: "Checkout & shipping",
  marketing: "Marketing",
  advanced: "Advanced",
};

/**
 * One component behind three routes. Each settings page is the same registry-
 * driven form pointed at a different group, so they can never drift apart in
 * layout, validation or save behaviour.
 */
export default function Settings({ group }: { group: Exclude<SettingGroupId, "marketing"> }) {
  const meta = SETTING_GROUPS.find(entry => entry.id === group);

  return (
    <AdminShell title={BREADCRUMB[group]} breadcrumb="Settings">
      <PageHead title={meta?.label ?? "Settings"} description={meta?.description} />

      <SettingsForm
        group={group}
        intro={
          group === "checkout" ? (
            <Notice tone="info" title="Money is stored to the cent.">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Truck size={14} aria-hidden="true" />
                Shipping fields are entered in cents — 4900 means $49.00 — so rounding can never drift on a total.
              </span>
            </Notice>
          ) : group === "advanced" ? (
            <Notice tone="warning" title="Maintenance mode hides the storefront.">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} aria-hidden="true" />
                Shoppers see a holding page while it is on. You stay signed in and keep full admin access.
              </span>
            </Notice>
          ) : (
            <Notice tone="info" title="These details appear across the storefront.">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Store size={14} aria-hidden="true" />
                Store name, contact routes and social links are read by the public site, its metadata and its structured
                data.
              </span>
            </Notice>
          )
        }
      />
    </AdminShell>
  );
}
