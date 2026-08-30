import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 1, role: "admin" } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <section>{children}</section> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listProducts: { invalidate: vi.fn() }, listSeries: { invalidate: vi.fn() }, listVariants: { invalidate: vi.fn() }, listPlacements: { invalidate: vi.fn() }, listReminders: { invalidate: vi.fn() }, listAuditLogs: { invalidate: vi.fn() } }, commerce: { getProducts: { invalidate: vi.fn() }, getSeries: { invalidate: vi.fn() }, getPlacements: { invalidate: vi.fn() } } }),
    admin: {
      listProducts: { useQuery: mocks.useQuery }, listSeries: { useQuery: mocks.useQuery }, listPlacements: { useQuery: mocks.useQuery },
      deleteProduct: { useMutation: mocks.useMutation }, deleteSeries: { useMutation: mocks.useMutation }, deletePlacement: { useMutation: mocks.useMutation }, createReminderDraft: { useMutation: mocks.useMutation },
    },
  },
}));

import AdminOperationsTools from "./AdminOperationsTools";

describe("AdminOperationsTools", () => {
  beforeEach(() => {
    mocks.useQuery.mockReturnValue({ data: undefined, error: new Error("Database unavailable") });
    mocks.useMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it("renders consent confirmation and safe destructive-action controls while storage is on hold", () => {
    const markup = renderToStaticMarkup(<AdminOperationsTools />);
    expect(markup).toContain("Careful operations.");
    expect(markup).toContain("Consent-first reminder");
    expect(markup).toContain("I confirm this customer has given permission");
    expect(markup).toContain("Destructive actions");
    expect(markup).toContain("Database connection is on hold.");
  });
});
