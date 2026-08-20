export type ReminderDraftInput = {
  recipientEmail: string;
  subject: string;
  message: string;
  consentConfirmed: boolean;
};

export type ReminderDraftDecision =
  | { allowed: false; reason: "database-required" | "consent-required" }
  | { allowed: true; payload: ReminderDraftInput & { consentConfirmed: true } };

export function prepareReminderDraft(input: ReminderDraftInput, databaseReady: boolean): ReminderDraftDecision {
  if (!databaseReady) return { allowed: false, reason: "database-required" };
  if (!input.consentConfirmed) return { allowed: false, reason: "consent-required" };
  return { allowed: true, payload: { ...input, consentConfirmed: true } };
}

export async function submitReminderDraft(input: ReminderDraftInput, databaseReady: boolean, createDraft: (payload: ReminderDraftInput & { consentConfirmed: true }) => Promise<unknown>): Promise<ReminderDraftDecision> {
  const decision = prepareReminderDraft(input, databaseReady);
  if (!decision.allowed) return decision;
  await createDraft(decision.payload);
  return decision;
}
