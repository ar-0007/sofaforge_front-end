import { describe, expect, it, vi } from "vitest";
import { prepareReminderDraft, submitReminderDraft } from "./adminReminder";

const baseInput = { recipientEmail: "client@example.com", subject: "A note from Sofa Co.", message: "Your selected pieces are still waiting for you.", consentConfirmed: false };

describe("prepareReminderDraft", () => {
  it("blocks a reminder draft when customer consent is unchecked", () => {
    expect(prepareReminderDraft(baseInput, true)).toEqual({ allowed: false, reason: "consent-required" });
  });

  it("creates the protected mutation payload only after consent is confirmed", () => {
    expect(prepareReminderDraft({ ...baseInput, consentConfirmed: true }, true)).toEqual({ allowed: true, payload: { ...baseInput, consentConfirmed: true } });
  });

  it("does not invoke the draft mutation when the reminder form submission is blocked by unchecked consent", async () => {
    const createDraft = vi.fn();
    await expect(submitReminderDraft(baseInput, true, createDraft)).resolves.toEqual({ allowed: false, reason: "consent-required" });
    expect(createDraft).not.toHaveBeenCalled();
  });

  it("invokes the draft mutation with a consent-confirmed payload from the reminder form submission", async () => {
    const createDraft = vi.fn().mockResolvedValue(undefined);
    await expect(submitReminderDraft({ ...baseInput, consentConfirmed: true }, true, createDraft)).resolves.toEqual({ allowed: true, payload: { ...baseInput, consentConfirmed: true } });
    expect(createDraft).toHaveBeenCalledWith({ ...baseInput, consentConfirmed: true });
  });
});
