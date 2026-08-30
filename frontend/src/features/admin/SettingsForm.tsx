"use client";

import { Eye, EyeOff, KeyRound, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  SECRET_MASK,
  fieldsInGroup,
  sectionsInGroup,
  validateSetting,
  type SettingField,
  type SettingGroupId,
} from "@shared/settings/registry";
import { trpc } from "@/lib/trpc";
import { Button, Card, FormRow, Notice, Stack, Switch } from "./ui";

/**
 * Renders one settings group straight from the shared registry.
 *
 * There is no per-field markup anywhere: add a field to
 * `shared/settings/registry.ts` and it appears here, validated on both sides,
 * with the same help text the backend enforces.
 */
export default function SettingsForm({
  group,
  intro,
  children,
}: {
  group: SettingGroupId;
  intro?: React.ReactNode;
  /** Extra content placed above the form — status panels, connection tests. */
  children?: React.ReactNode;
}) {
  const utils = trpc.useUtils();
  const settings = trpc.settings.all.useQuery(undefined, { retry: false });
  const save = trpc.settings.save.useMutation();

  const fields = useMemo(() => fieldsInGroup(group), [group]);
  const sections = useMemo(() => sectionsInGroup(group), [group]);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<string[]>([]);

  const saved = settings.data?.values;
  const secretsSet = settings.data?.secretsSet ?? [];

  // The draft holds only what the owner changed. Everything else falls through
  // to the saved value, so a save that lands elsewhere is not overwritten by a
  // stale copy of the whole form.
  const valueOf = (key: string) => draft[key] ?? saved?.[key] ?? "";
  const isDirty = Object.keys(draft).length > 0;

  useEffect(() => {
    // A fresh server payload means whatever we sent is now the saved state.
    setDraft({});
  }, [settings.dataUpdatedAt]);

  const errors = useMemo(() => {
    const found: Record<string, string> = {};
    for (const [key, value] of Object.entries(draft)) {
      // A secret still showing its mask has not been retyped — nothing to check.
      if (value === SECRET_MASK) continue;
      const failure = validateSetting(key, value);
      if (failure) found[key] = failure;
    }
    return found;
  }, [draft]);

  const hasErrors = Object.keys(errors).length > 0;

  const setValue = (key: string, value: string) => {
    setDraft(previous => ({ ...previous, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (hasErrors) {
      toast.error("Some values need fixing", { description: Object.values(errors)[0] });
      return;
    }
    const entries = Object.entries(draft)
      .filter(([, value]) => value !== SECRET_MASK)
      .map(([key, value]) => ({ key, value }));
    if (entries.length === 0) return;

    try {
      await save.mutateAsync({ entries: entries as never });
      await Promise.all([utils.settings.all.invalidate(), utils.settings.connectionStatus.invalidate()]);
      setDraft({});
      setRevealed([]);
      toast.success("Settings saved", { description: `${entries.length} setting${entries.length === 1 ? "" : "s"} updated.` });
    } catch (error) {
      toast.error("Settings could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  if (settings.error) {
    return (
      <Notice tone="warning" title="Settings are unavailable.">
        The database is not reachable, so saved settings cannot be loaded or changed yet. Everything on this screen is
        implemented and will work the moment the connection is live.
      </Notice>
    );
  }

  return (
    <form onSubmit={submit}>
      <Stack gap={16}>
        {intro}
        {children}

        {sections.map(section => (
          <Card key={section} title={section}>
            <div className="sfa-form-table">
              {fields
                .filter(field => field.section === section)
                .map(field => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    value={valueOf(field.key)}
                    error={errors[field.key]}
                    loading={settings.isLoading}
                    secretStored={secretsSet.includes(field.key)}
                    revealed={revealed.includes(field.key)}
                    onReveal={() =>
                      setRevealed(previous =>
                        previous.includes(field.key)
                          ? previous.filter(key => key !== field.key)
                          : [...previous, field.key],
                      )
                    }
                    onChange={next => setValue(field.key, next)}
                  />
                ))}
            </div>
          </Card>
        ))}

        <SaveBar
          dirty={isDirty}
          count={Object.keys(draft).length}
          saving={save.isPending}
          blocked={hasErrors}
          onReset={() => {
            setDraft({});
            setRevealed([]);
          }}
        />
      </Stack>
    </form>
  );
}

function FieldRow({
  field,
  value,
  error,
  loading,
  secretStored,
  revealed,
  onReveal,
  onChange,
}: {
  field: SettingField;
  value: string;
  error?: string;
  loading: boolean;
  secretStored: boolean;
  revealed: boolean;
  onReveal: () => void;
  onChange: (next: string) => void;
}) {
  const id = `setting-${field.key.replace(/\./g, "-")}`;

  if (loading) {
    return (
      <div className="sfa-form-row">
        <span className="sfa-label">{field.label}</span>
        <div className="sfa-skeleton" style={{ height: 36 }} />
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <FormRow label={field.label} help={field.help} error={error} htmlFor={id}>
        <Switch id={id} checked={value === "true"} onChange={next => onChange(String(next))} />
      </FormRow>
    );
  }

  if (field.type === "select") {
    return (
      <FormRow label={field.label} help={field.help} error={error} htmlFor={id}>
        <select id={id} className="sfa-select" value={value} onChange={event => onChange(event.target.value)}>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormRow>
    );
  }

  if (field.type === "textarea") {
    return (
      <FormRow label={field.label} help={field.help} error={error} htmlFor={id}>
        <textarea
          id={id}
          className="sfa-textarea"
          value={value}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          aria-invalid={error ? true : undefined}
          onChange={event => onChange(event.target.value)}
        />
      </FormRow>
    );
  }

  if (field.type === "secret") {
    // Stored secrets read back as a mask. Clearing the box is what turns an
    // edit into a real replacement, so the owner can never half-overwrite one.
    const showingMask = value === SECRET_MASK;
    return (
      <FormRow
        label={
          <>
            <KeyRound size={13} aria-hidden="true" />
            {field.label}
          </>
        }
        help={field.help}
        error={error}
        htmlFor={id}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            id={id}
            className="sfa-input sfa-input--mono"
            style={{ flex: "1 1 260px" }}
            type={revealed && !showingMask ? "text" : "password"}
            value={value}
            autoComplete="off"
            spellCheck={false}
            placeholder={secretStored ? "Saved — type a new token to replace it" : "Paste the access token"}
            aria-invalid={error ? true : undefined}
            onChange={event => onChange(event.target.value)}
            onFocus={() => {
              if (showingMask) onChange("");
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            icon={revealed ? EyeOff : Eye}
            title={revealed ? "Hide token" : "Show token"}
            onClick={onReveal}
          />
          {secretStored ? (
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => onChange("")}>
              Remove
            </Button>
          ) : null}
        </div>
        {secretStored && !showingMask && value === "" ? (
          <p className="sfa-help">Saving now will remove the stored token and stop server-side events.</p>
        ) : null}
      </FormRow>
    );
  }

  const inputType = field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : "text";
  const mono = field.pattern !== undefined;

  return (
    <FormRow label={field.label} help={field.help} error={error} htmlFor={id}>
      <input
        id={id}
        className={mono ? "sfa-input sfa-input--mono" : "sfa-input"}
        type={inputType}
        value={value}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        onChange={event => onChange(event.target.value)}
      />
    </FormRow>
  );
}

/**
 * WordPress puts Save at the bottom and leaves it there. This does the same but
 * only appears once something has changed, so nothing is ever saved by reflex.
 */
function SaveBar({
  dirty,
  count,
  saving,
  blocked,
  onReset,
}: {
  dirty: boolean;
  count: number;
  saving: boolean;
  blocked: boolean;
  onReset: () => void;
}) {
  return (
    <div
      className="sfa-card"
      style={{
        position: "sticky",
        bottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        flexWrap: "wrap",
        boxShadow: "var(--sfa-shadow-lg)",
      }}
    >
      <span className="sfa-help" style={{ flex: 1, minWidth: 160 }}>
        {blocked
          ? "Fix the highlighted values before saving."
          : dirty
            ? `${count} unsaved change${count === 1 ? "" : "s"}.`
            : "Everything on this page is saved."}
      </span>
      <Button icon={RotateCcw} disabled={!dirty || saving} onClick={onReset}>
        Discard
      </Button>
      <Button type="submit" variant="primary" icon={Save} disabled={!dirty || saving || blocked}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
