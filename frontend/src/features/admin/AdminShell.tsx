"use client";

import {
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { readLocal, writeLocal } from "@/lib/browserStorage";
import { trpc } from "@/lib/trpc";
import { ADMIN_NAV, findActiveNav, type AdminNavItem } from "./adminNav";
import { useAdminTheme } from "./useAdminTheme";
import { Button } from "./ui";

const COLLAPSE_KEY = "sfa-rail-collapsed";

/**
 * The admin chrome: dark rail on the left, thin bar on top, working surface
 * below. Every admin screen renders inside this, which is what makes the whole
 * back office feel like one application rather than a folder of pages.
 *
 * The rail collapses to icons on desktop (remembered per browser) and becomes
 * a drawer under 900px.
 */
export default function AdminShell({
  children,
  title,
  breadcrumb,
}: {
  children: React.ReactNode;
  /** Falls back to the active menu entry when omitted. */
  title?: string;
  breadcrumb?: string;
}) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useAdminTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // localStorage is read after mount so the server and first client render
  // agree; otherwise the rail flickers between widths on every navigation.
  useEffect(() => {
    setCollapsed(readLocal(COLLAPSE_KEY) === "true");
  }, []);

  const active = useMemo(() => findActiveNav(pathname), [pathname]);

  // Opening the active section on navigation, without closing what the owner
  // opened by hand.
  useEffect(() => {
    if (!active?.item.children?.length) return;
    setOpenGroups(previous => (previous.includes(active.item.id) ? previous : [...previous, active.item.id]));
  }, [active?.item.id, active?.item.children?.length]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isAdmin = user?.role === "admin";
  const overview = trpc.admin.overview.useQuery(undefined, {
    enabled: isAdmin,
    // The rail's count bubbles; a stale number for a minute is fine.
    staleTime: 60_000,
    retry: false,
  });

  const toggleCollapsed = () => {
    setCollapsed(previous => {
      writeLocal(COLLAPSE_KEY, String(!previous));
      return !previous;
    });
  };

  if (loading) return <ShellSkeleton />;

  if (!user) {
    return (
      <Gate
        icon={UserRound}
        title="Sign in to manage the store"
        body="The admin is behind a login. Sign in with the owner account to continue."
        action={
          <Button
            variant="primary"
            onClick={() => {
              const next = encodeURIComponent(window.location.pathname);
              window.location.href = `/login?next=${next}`;
            }}
          >
            Sign in
          </Button>
        }
      />
    );
  }

  if (!isAdmin) {
    return (
      <Gate
        icon={ShieldCheck}
        title="Admin access required"
        body="This account is signed in but is not an administrator. Ask the store owner to raise your role."
        action={
          <Button onClick={() => router.push("/")} icon={ExternalLink}>
            Back to the store
          </Button>
        }
      />
    );
  }

  const pageTitle = title ?? active?.child?.label ?? active?.item.label ?? "Admin";
  const section = breadcrumb ?? active?.item.label ?? "Admin";

  return (
    <div className="sfa" data-theme={theme}>
      <div className="sfa-shell" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
        <div
          className="sfa-rail-scrim"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        />

        <nav className="sfa-rail" aria-label="Admin sections">
          <div className="sfa-rail__brand">
            <span className="sfa-rail__mark" aria-hidden="true">
              SC
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="sfa-rail__name">Sofa Co.</span>
              <span className="sfa-rail__role">
                Store admin
              </span>
            </span>
          </div>

          <div className="sfa-rail__scroll">
            {ADMIN_NAV.map(group => (
              <div key={group.group}>
                <div className="sfa-rail__group-label">{group.group}</div>
                {group.items.map(item => (
                  <NavEntry
                    key={item.id}
                    item={item}
                    activeId={active?.item.id}
                    activePath={pathname}
                    open={openGroups.includes(item.id)}
                    collapsed={collapsed}
                    count={item.countKey ? overview.data?.[item.countKey] : undefined}
                    onToggle={() =>
                      setOpenGroups(previous =>
                        previous.includes(item.id)
                          ? previous.filter(id => id !== item.id)
                          : [...previous, item.id],
                      )
                    }
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="sfa-rail__foot">
            <button type="button" className="sfa-nav-item" onClick={toggleCollapsed}>
              {collapsed ? (
                <PanelLeftOpen className="sfa-nav-item__icon" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="sfa-nav-item__icon" aria-hidden="true" />
              )}
              <span className="sfa-nav-item__label">Collapse menu</span>
            </button>
          </div>
        </nav>

        <div className="sfa-main">
          <header className="sfa-bar">
            <button
              type="button"
              className="sfa-bar__menu"
              onClick={() => setMobileOpen(open => !open)}
              aria-label="Open admin menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={17} aria-hidden="true" />
            </button>

            <nav className="sfa-bar__crumbs" aria-label="Breadcrumb">
              <span>{section}</span>
              <ChevronRight size={13} aria-hidden="true" />
              <strong>{pageTitle}</strong>
            </nav>

            <span className="sfa-bar__spacer" />

            <Button
              size="icon"
              variant="ghost"
              icon={theme === "dark" ? Sun : Moon}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
            />

            <Link href="/" className="sfa-btn sfa-btn--secondary sfa-btn--sm" target="_blank" rel="noreferrer">
              <ExternalLink size={14} aria-hidden="true" />
              Visit store
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingInlineStart: 4 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: "var(--sfa-accent-soft)",
                  color: "var(--sfa-accent)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {(user.name ?? user.email ?? "A").charAt(0).toUpperCase()}
              </span>
              <Button size="icon" variant="ghost" icon={LogOut} title="Sign out" onClick={() => void logout()} />
            </div>
          </header>

          <main className="sfa-content">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NavEntry({
  item,
  activeId,
  activePath,
  open,
  collapsed,
  count,
  onToggle,
}: {
  item: AdminNavItem;
  activeId?: string;
  activePath: string;
  open: boolean;
  collapsed: boolean;
  count?: number;
  onToggle: () => void;
}) {
  const isActive = activeId === item.id;
  const hasChildren = Boolean(item.children?.length);

  // With a submenu the row is a disclosure, not a link — the first child is the
  // destination, exactly how WordPress behaves.
  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          className="sfa-nav-item"
          data-active={isActive}
          data-open={open}
          aria-expanded={open}
          onClick={onToggle}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="sfa-nav-item__icon" aria-hidden="true" />
          <span className="sfa-nav-item__label">{item.label}</span>
          {count ? <span className="sfa-nav-item__count">{count}</span> : null}
          <ChevronRight className="sfa-nav-item__chevron" aria-hidden="true" />
        </button>
        {open ? (
          <div className="sfa-subnav">
            {item.children!.map(child => (
              <Link
                key={child.path}
                href={child.path}
                className="sfa-subnav__item"
                aria-current={activePath === child.path ? "page" : undefined}
              >
                {child.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={item.path}
      className="sfa-nav-item"
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="sfa-nav-item__icon" aria-hidden="true" />
      <span className="sfa-nav-item__label">{item.label}</span>
      {count ? <span className="sfa-nav-item__count">{count}</span> : null}
    </Link>
  );
}

function Gate({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="sfa">
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--sfa-bg)" }}>
        <div className="sfa-card" style={{ maxWidth: 420, width: "100%", padding: 28, textAlign: "center" }}>
          <span className="sfa-empty__icon">
            <Icon size={20} aria-hidden="true" />
          </span>
          <h1 style={{ fontSize: 18, fontWeight: 650, letterSpacing: "-0.02em" }}>{title}</h1>
          <p className="sfa-help" style={{ marginBlock: "8px 18px" }}>
            {body}
          </p>
          {action}
        </div>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="sfa">
      <div className="sfa-shell">
        <div className="sfa-rail" aria-hidden="true">
          <div className="sfa-rail__brand" />
        </div>
        <div className="sfa-main">
          <div className="sfa-bar" />
          <div className="sfa-content">
            <div className="sfa-skeleton" style={{ height: 26, width: 220, marginBlockEnd: 20 }} />
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="sfa-skeleton" style={{ height: 96 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
