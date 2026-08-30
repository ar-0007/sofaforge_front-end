import { describe, expect, it } from "vitest";
import { ADMIN_NAV, findActiveNav } from "./adminNav";

describe("findActiveNav", () => {
  it("matches the dashboard on its exact path", () => {
    expect(findActiveNav("/admin")?.item.id).toBe("dashboard");
  });

  it("prefers the deepest match, so a submenu beats the dashboard's /admin prefix", () => {
    const active = findActiveNav("/admin/settings/checkout");
    expect(active?.item.id).toBe("settings");
    expect(active?.child?.label).toBe("Checkout & shipping");
  });

  it("keeps a nested route highlighted under its parent section", () => {
    const active = findActiveNav("/admin/products/12/options");
    expect(active?.item.id).toBe("catalog");
    expect(active?.child?.path).toBe("/admin/products");
  });

  it("does not treat a longer sibling path as a match", () => {
    // /admin/customers must not light up for /admin/carts, which is its sibling.
    expect(findActiveNav("/admin/carts")?.child?.label).toBe("Carts");
  });

  it("returns null for a path outside the admin", () => {
    expect(findActiveNav("/shop")).toBeNull();
  });
});

describe("ADMIN_NAV", () => {
  it("gives every item a unique id, since the rail keys open state on it", () => {
    const ids = ADMIN_NAV.flatMap(group => group.items.map(item => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points every entry at an /admin path", () => {
    for (const group of ADMIN_NAV) {
      for (const item of group.items) {
        expect(item.path.startsWith("/admin")).toBe(true);
        for (const child of item.children ?? []) {
          expect(child.path.startsWith("/admin")).toBe(true);
        }
      }
    }
  });

  it("makes the first child of a section reachable, since the parent row only toggles", () => {
    for (const group of ADMIN_NAV) {
      for (const item of group.items) {
        if (!item.children?.length) continue;
        // The parent row is a disclosure, so its own path must also appear as a
        // child — otherwise that screen has no way in from the menu.
        expect(item.children.some(child => child.path === item.path)).toBe(true);
      }
    }
  });
});
