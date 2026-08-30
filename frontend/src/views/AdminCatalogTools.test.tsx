import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 1, role: "admin" } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <section>{children}</section> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listVariants: { invalidate: vi.fn() }, listProducts: { invalidate: vi.fn() } }, commerce: { getProducts: { invalidate: vi.fn() } } }),
    admin: {
      listProducts: { useQuery: mocks.useQuery },
      listVariants: { useQuery: mocks.useQuery },
      createVariant: { useMutation: mocks.useMutation },
      updateVariant: { useMutation: mocks.useMutation },
      deleteVariant: { useMutation: mocks.useMutation },
      updateProduct: { useMutation: mocks.useMutation },
    },
  },
}));

import AdminCatalogTools from "./AdminCatalogTools";

describe("AdminCatalogTools", () => {
  beforeEach(() => {
    mocks.useQuery.mockReturnValue({ data: undefined, error: new Error("Database unavailable") });
    mocks.useMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it("renders the implemented variants and media controls in a database-on-hold state", () => {
    const markup = renderToStaticMarkup(<AdminCatalogTools />);
    expect(markup).toContain("Catalog tools.");
    expect(markup).toContain("Database connection is on hold.");
    expect(markup).toContain("Product variants");
    expect(markup).toContain("Product media");
    expect(markup).toContain("Connect database to save");
  });
});
