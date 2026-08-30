"use client";

import { Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { prepareReminderDraft, submitReminderDraft } from "@/lib/adminReminder";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { formatDateTime } from "../adminUtils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Notice,
  PageHead,
  Stack,
  TableSkeleton,
  TableWrap,
} from "../ui";

const BLANK = {
  recipientEmail: "",
  subject: "A note from Sofa Co.",
  message: "Your selected pieces are still waiting for you.",
  consentConfirmed: false,
};

const STATUS_TONE = { draft: "neutral", queued: "info", sent: "success", failed: "danger" } as const;

/**
 * Customer reminders.
 *
 * Deliberately a drafting tool, not a sending tool. Nothing here mails a
 * customer automatically: a draft is created for review, and it is only allowed
 * at all once consent has been explicitly confirmed.
 */
export default function Reminders() {
  const utils = trpc.useUtils();
  const reminders = trpc.admin.listReminders.useQuery(undefined, { retry: false });
  const carts = trpc.admin.listCarts.useQuery(undefined, { retry: false });
  const createReminder = trpc.admin.createReminderDraft.useMutation();

  const [reminder, setReminder] = useState(BLANK);

  const databaseReady = Boolean(reminders.data) && !reminders.error;
  const rows = reminders.data ?? [];
  const consentedCarts = (carts.data ?? []).filter(cart => cart.reminderConsent === "true" && cart.customerEmail);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const decision = prepareReminderDraft(reminder, databaseReady);
    if (!decision.allowed) {
      if (decision.reason === "database-required") {
        toast.info("Database connection required", { description: "Drafting unlocks once the database is connected." });
      } else {
        toast.error("Customer consent is required", {
          description: "Only prepare a reminder when the customer has agreed to receive it.",
        });
      }
      return;
    }

    try {
      await submitReminderDraft(reminder, databaseReady, createReminder.mutateAsync);
      setReminder(BLANK);
      await Promise.all([utils.admin.listReminders.invalidate(), utils.admin.listAuditLogs.invalidate()]);
      toast.success("Reminder draft prepared", {
        description: "It is stored for owner review; no automated customer email is sent.",
      });
    } catch (error) {
      toast.error("Reminder draft could not be created", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="Customer reminders" breadcrumb="Marketing">
      <PageHead
        title="Customer reminders"
        description="Prepare a reminder for a shopper who left something behind — with their permission, and for your review."
      />

      <Stack gap={16}>
        <Notice tone="info" title="This creates a draft, never a send.">
          Nothing on this screen emails a customer. A draft is stored for you to review and send yourself, and it can
          only be created for someone who agreed to be contacted.
        </Notice>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }} className="sfa-dash-split">
          <Card title="New reminder draft">
            <form onSubmit={submit}>
              <Stack gap={14}>
                {consentedCarts.length > 0 ? (
                  <Field label="Start from a consented cart" htmlFor="r-cart" help="Only carts with recorded consent are listed.">
                    <select
                      id="r-cart"
                      className="sfa-select"
                      onChange={event => {
                        const cart = consentedCarts.find(entry => String(entry.id) === event.target.value);
                        if (cart?.customerEmail) setReminder({ ...reminder, recipientEmail: cart.customerEmail });
                      }}
                      defaultValue=""
                    >
                      <option value="">Choose a cart…</option>
                      {consentedCarts.map(cart => (
                        <option key={cart.id} value={cart.id}>
                          #{cart.id} — {cart.customerEmail}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                <Field label="Customer email" htmlFor="r-email">
                  <input
                    id="r-email"
                    className="sfa-input"
                    type="email"
                    required
                    value={reminder.recipientEmail}
                    onChange={event => setReminder({ ...reminder, recipientEmail: event.target.value })}
                  />
                </Field>

                <Field label="Subject" htmlFor="r-subject">
                  <input
                    id="r-subject"
                    className="sfa-input"
                    required
                    value={reminder.subject}
                    onChange={event => setReminder({ ...reminder, subject: event.target.value })}
                  />
                </Field>

                <Field label="Message" htmlFor="r-message">
                  <textarea
                    id="r-message"
                    className="sfa-textarea"
                    rows={6}
                    required
                    value={reminder.message}
                    onChange={event => setReminder({ ...reminder, message: event.target.value })}
                  />
                </Field>

                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: 12,
                    border: "1px solid var(--sfa-border-strong)",
                    borderRadius: "var(--sfa-radius-sm)",
                    background: "var(--sfa-surface-2)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={reminder.consentConfirmed}
                    onChange={event => setReminder({ ...reminder, consentConfirmed: event.target.checked })}
                    style={{ marginBlockStart: 2, width: 16, height: 16 }}
                  />
                  <span className="sfa-help">
                    I confirm this customer has given permission to receive this reminder. I understand it will be
                    created as a draft for review, not sent automatically.
                  </span>
                </label>

                <Button
                  type="submit"
                  variant="primary"
                  icon={Mail}
                  disabled={!databaseReady || !reminder.consentConfirmed || createReminder.isPending}
                >
                  {!databaseReady
                    ? "Connect database to create draft"
                    : reminder.consentConfirmed
                      ? "Create consent-confirmed draft"
                      : "Confirm consent to continue"}
                </Button>
              </Stack>
            </form>
          </Card>

          <Card flush title="Drafts and history">
            {reminders.isLoading ? (
              <TableSkeleton rows={4} columns={3} />
            ) : rows.length === 0 ? (
              <EmptyState title="No reminders yet" icon={ShieldCheck}>
                Drafts you prepare appear here with their status.
              </EmptyState>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td className="sfa-table__primary">{row.recipientEmail}</td>
                      <td className="sfa-table__muted">{row.subject}</td>
                      <td>
                        <Badge tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE]} dot>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="sfa-table__muted">{formatDateTime(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>
      </Stack>
    </AdminShell>
  );
}
