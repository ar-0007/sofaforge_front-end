import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, create } from "react-test-renderer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  createReminderDraft: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 1, role: "admin", name: "Admin", email: "admin@example.com" } }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <section data-testid="dashboard-layout">{children}</section>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: { listProducts: { invalidate: vi.fn() }, listSeries: { invalidate: vi.fn() }, listVariants: { invalidate: vi.fn() }, listPlacements: { invalidate: vi.fn() }, overview: { invalidate: vi.fn() }, listOrders: { invalidate: vi.fn() }, listInquiries: { invalidate: vi.fn() }, listReviews: { invalidate: vi.fn() }, listReminders: { invalidate: vi.fn() }, listAuditLogs: { invalidate: vi.fn() } },
      commerce: { getProducts: { invalidate: vi.fn() }, getSeries: { invalidate: vi.fn() }, getPlacements: { invalidate: vi.fn() } },
    }),
    admin: {
      overview: { useQuery: mocks.useQuery }, listProducts: { useQuery: mocks.useQuery }, listSeries: { useQuery: mocks.useQuery }, listVariants: { useQuery: mocks.useQuery }, listPlacements: { useQuery: mocks.useQuery }, listOrders: { useQuery: mocks.useQuery }, listInquiries: { useQuery: mocks.useQuery }, listReviews: { useQuery: mocks.useQuery }, listCarts: { useQuery: mocks.useQuery }, listUsers: { useQuery: mocks.useQuery }, listReminders: { useQuery: mocks.useQuery }, listAuditLogs: { useQuery: mocks.useQuery },
      createProduct: { useMutation: mocks.useMutation }, updateProduct: { useMutation: mocks.useMutation }, createSeries: { useMutation: mocks.useMutation }, updateSeries: { useMutation: mocks.useMutation }, createVariant: { useMutation: mocks.useMutation }, updateVariant: { useMutation: mocks.useMutation }, deleteVariant: { useMutation: mocks.useMutation }, savePlacement: { useMutation: mocks.useMutation }, updateOrderStatus: { useMutation: mocks.useMutation }, updateInquiryStatus: { useMutation: mocks.useMutation }, updateReviewStatus: { useMutation: mocks.useMutation }, createReminderDraft: { useMutation: mocks.useMutation },
    },
  },
}));

import AdminPanel from "./AdminPanel";

describe("AdminPanel", () => {
  beforeEach(() => {
    mocks.useQuery.mockReturnValue({ data: undefined, error: new Error("Database unavailable"), refetch: vi.fn() });
    mocks.createReminderDraft.mockReset();
    mocks.useMutation.mockReturnValue({ mutateAsync: mocks.createReminderDraft, isPending: false });
  });

  it("renders the full management interface with clear database-on-hold guidance", () => {
    const markup = renderToStaticMarkup(<AdminPanel />);
    expect(markup).toContain("Run the showroom.");
    expect(markup).toContain("Database connection is on hold.");
    expect(markup).toContain("Connect the database later to unlock live data");
    expect(markup).toContain("Catalog");
    expect(markup).toContain("Catalog products");
    expect(markup).toContain("Placements");
    expect(markup).toContain("Customers &amp; carts");
    expect(markup).toContain("Reviews");
    expect(markup).toContain("Reminders");
    expect(markup).toContain("I confirm this customer has given permission to receive this reminder.");
  });

  it("renders a blocked reminder CTA until consent has been recorded", () => {
    mocks.useQuery.mockReturnValue({ data: [], error: undefined, refetch: vi.fn() });
    const markup = renderToStaticMarkup(<AdminPanel />);
    expect(markup).toContain("Confirm consent to continue");
    expect(markup).toMatch(/disabled=""[^>]*>.*?Confirm consent to continue/);
  });

  it("blocks the actual reminder form submission before consent and does not call the mutation", async () => {
    mocks.useQuery.mockReturnValue({ data: [], error: undefined, refetch: vi.fn() });
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(<AdminPanel />); });
    const forms = renderer.root.findAllByType("form") as Array<{ props: { onSubmit: (event: { preventDefault: () => void }) => Promise<void> }; findAllByType: (type: string) => Array<{ props: { type?: string } }> }>;
    const reminderForm = forms.find((form) => form.findAllByType("input").some((input) => input.props.type === "email"));
    expect(reminderForm).toBeDefined();
    await act(async () => { await reminderForm!.props.onSubmit({ preventDefault: vi.fn() }); });
    expect(mocks.createReminderDraft).not.toHaveBeenCalled();
  });

  it("submits the actual reminder form after consent and calls the draft mutation with the confirmed payload", async () => {
    mocks.useQuery.mockReturnValue({ data: [], error: undefined, refetch: vi.fn() });
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(<AdminPanel />); });
    const inputs = renderer.root.findAllByType("input") as Array<{ props: { type?: string; onChange: (event: { target: { checked: boolean } }) => void } }>;
    const checkbox = inputs.find((input) => input.props.type === "checkbox");
    expect(checkbox).toBeDefined();
    await act(async () => { checkbox!.props.onChange({ target: { checked: true } }); });
    const forms = renderer.root.findAllByType("form") as Array<{ props: { onSubmit: (event: { preventDefault: () => void }) => Promise<void> }; findAllByType: (type: string) => Array<{ props: { type?: string } }> }>;
    const reminderForm = forms.find((form) => form.findAllByType("input").some((input) => input.props.type === "email"));
    await act(async () => { await reminderForm!.props.onSubmit({ preventDefault: vi.fn() }); });
    expect(mocks.createReminderDraft).toHaveBeenCalledWith({ recipientEmail: "", subject: "A note from Sofa Co.", message: "Your selected pieces are still waiting for you.", consentConfirmed: true });
  });
});
