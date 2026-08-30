import {
  BarChart3,
  Boxes,
  FileText,
  Gauge,
  Layers,
  Megaphone,
  MessageSquareText,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminNavChild = {
  label: string;
  path: string;
};

export type AdminNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  children?: AdminNavChild[];
  /** Key on the overview payload whose count shows as a bubble in the rail. */
  countKey?: "pendingOrders" | "pendingReviews" | "newInquiries";
};

/**
 * The admin menu, WordPress-shaped: a short list of top-level areas, each with
 * its own submenu. The rail renders straight from this, so adding a screen is
 * one entry here plus one route file.
 */
export const ADMIN_NAV: ReadonlyArray<{ group: string; items: AdminNavItem[] }> = [
  {
    group: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: Gauge, path: "/admin" }],
  },
  {
    group: "Store",
    items: [
      {
        id: "catalog",
        label: "Catalog",
        icon: Boxes,
        path: "/admin/products",
        children: [
          { label: "All products", path: "/admin/products" },
          { label: "Collections", path: "/admin/collections" },
          { label: "Variants & media", path: "/admin/catalog-tools" },
        ],
      },
      {
        id: "orders",
        label: "Orders",
        icon: ShoppingCart,
        path: "/admin/orders",
        countKey: "pendingOrders",
      },
      {
        id: "customers",
        label: "Customers",
        icon: Users,
        path: "/admin/customers",
        children: [
          { label: "All customers", path: "/admin/customers" },
          { label: "Carts", path: "/admin/carts" },
        ],
      },
      {
        id: "custom-studio",
        label: "Custom Studio",
        icon: Layers,
        path: "/admin/custom-studio",
      },
      { id: "reviews", label: "Reviews", icon: Star, path: "/admin/reviews", countKey: "pendingReviews" },
      { id: "inquiries", label: "Inquiries", icon: MessageSquareText, path: "/admin/inquiries", countKey: "newInquiries" },
    ],
  },
  {
    group: "Grow",
    items: [
      {
        id: "marketing",
        label: "Marketing",
        icon: Megaphone,
        path: "/admin/marketing",
        children: [
          { label: "Pixels & tracking", path: "/admin/marketing" },
          { label: "Customer reminders", path: "/admin/reminders" },
        ],
      },
      { id: "insights", label: "Insights", icon: BarChart3, path: "/admin/insights" },
      { id: "content", label: "Storefront content", icon: FileText, path: "/admin/content" },
    ],
  },
  {
    group: "System",
    items: [
      {
        id: "settings",
        label: "Settings",
        icon: Settings,
        path: "/admin/settings",
        children: [
          { label: "Store details", path: "/admin/settings" },
          { label: "Checkout & shipping", path: "/admin/settings/checkout" },
          { label: "Advanced", path: "/admin/settings/advanced" },
        ],
      },
      {
        id: "tools",
        label: "Tools",
        icon: ShieldAlert,
        path: "/admin/tools",
        children: [
          { label: "Danger zone", path: "/admin/tools" },
          { label: "Activity log", path: "/admin/logs" },
        ],
      },
    ],
  },
];

/** Longest matching path wins, so /admin/settings/checkout beats /admin. */
export function findActiveNav(pathname: string): { item: AdminNavItem; child?: AdminNavChild } | null {
  let best: { item: AdminNavItem; child?: AdminNavChild; length: number } | null = null;

  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      const candidates: Array<{ path: string; child?: AdminNavChild }> = [{ path: item.path }];
      for (const child of item.children ?? []) candidates.push({ path: child.path, child });

      for (const candidate of candidates) {
        const matches = pathname === candidate.path || pathname.startsWith(`${candidate.path}/`);
        if (!matches) continue;
        // A section's first child repeats the parent's own path. On that tie
        // the child wins, because it is the one that names the screen for the
        // breadcrumb and the submenu highlight.
        const beatsBest =
          !best || candidate.path.length > best.length || (candidate.path.length === best.length && candidate.child);
        if (beatsBest) {
          best = { item, child: candidate.child, length: candidate.path.length };
        }
      }
    }
  }

  return best ? { item: best.item, child: best.child } : null;
}
