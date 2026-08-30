"use client";

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { ImageInput } from "../ImagePicker";
import { slugify, useMoney } from "../adminUtils";
import { Badge, Button, Card, EmptyState, Field, Notice, PageHead, Stack } from "../ui";

/**
 * Studio steps are the global option groups whose slug starts with this.
 * Ordinary shared options — the ones product pages ask — deliberately do not,
 * so the two lists never blur into each other. Mirrors STUDIO_SLUG_PREFIX on
 * the router.
 */
const STUDIO_PREFIX = "studio-";

/** Adds the prefix if the owner has not typed it. */
function studioSlug(value: string) {
  const slug = slugify(value);
  return slug.startsWith(STUDIO_PREFIX) ? slug : `${STUDIO_PREFIX}${slug}`;
}

/**
 * The Custom Studio builder.
 *
 * The storefront's step-by-step configurator used to live as four hard-coded
 * arrays inside the page, so adding a fabric or repricing a size meant editing
 * code. This screen is the other end of that: the steps are rows now, and this
 * is where the owner writes them.
 *
 * The order of the cards on this page *is* the order of the steps a shopper
 * walks through, which is why reordering is a first-class control rather than
 * a number field buried in a form.
 *
 * Underneath, a step is a global option group — the same table that powers the
 * per-product configurator. One builder pattern, one price model: whatever the
 * shopper picks, their total is the sum of the deltas.
 */

const DISPLAY_TYPES = [
  { value: "image", label: "Photo tiles — a picture per choice" },
  { value: "swatch", label: "Colour swatches — a circle per choice" },
  { value: "radio", label: "Titled cards — a name and a note per choice" },
  { value: "dropdown", label: "Dropdown — best past six choices" },
] as const;

type StepDraft = {
  id?: number;
  label: string;
  slug: string;
  helpText: string;
  displayType: string;
  isVisible: boolean;
};

type OptionDraft = {
  id?: number;
  groupId: number;
  label: string;
  value: string;
  /** Major units in the form; the router speaks minor units. */
  price: string;
  description: string;
  swatchColor: string;
  imageUrl: string;
  isDefault: boolean;
  isVisible: boolean;
};

function blankStep(): StepDraft {
  return { label: "", slug: "", helpText: "", displayType: "radio", isVisible: true };
}

function blankOption(groupId: number): OptionDraft {
  return {
    groupId,
    label: "",
    value: "",
    price: "0",
    description: "",
    swatchColor: "",
    imageUrl: "",
    isDefault: false,
    isVisible: true,
  };
}

export default function CustomStudio() {
  const { format, symbol } = useMoney();
  const utils = trpc.useUtils();

  const steps = trpc.admin.options.studioSteps.useQuery(undefined, { retry: false });
  const databaseDown = Boolean(steps.error);

  const [stepDraft, setStepDraft] = useState<StepDraft | null>(null);
  const [optionDraft, setOptionDraft] = useState<OptionDraft | null>(null);

  const refresh = () => {
    void utils.admin.options.studioSteps.invalidate();
    void utils.admin.options.globalGroups.invalidate();
  };

  const seed = trpc.admin.options.seedStudio.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.steps} steps created`, {
        description: `${result.options} options, exactly as the storefront shipped them.`,
      });
      refresh();
    },
    onError: (error) => toast.error("Could not create the steps", { description: error.message }),
  });

  const saveGroup = trpc.admin.options.saveGroup.useMutation({
    onSuccess: () => {
      toast.success("Step saved");
      setStepDraft(null);
      refresh();
    },
    onError: (error) => toast.error("Could not save the step", { description: error.message }),
  });

  const deleteGroup = trpc.admin.options.deleteGroup.useMutation({
    onSuccess: () => {
      toast.success("Step removed");
      refresh();
    },
    onError: (error) => toast.error("Could not remove the step", { description: error.message }),
  });

  const saveChoice = trpc.admin.options.saveChoice.useMutation({
    onSuccess: () => {
      toast.success("Option saved");
      setOptionDraft(null);
      refresh();
    },
    onError: (error) => toast.error("Could not save the option", { description: error.message }),
  });

  const deleteChoice = trpc.admin.options.deleteChoice.useMutation({
    onSuccess: () => {
      toast.success("Option removed");
      refresh();
    },
    onError: (error) => toast.error("Could not remove the option", { description: error.message }),
  });

  const reorder = trpc.admin.options.reorderGroups.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error("Could not reorder", { description: error.message }),
  });

  const list = steps.data ?? [];

  /**
   * What the cheapest possible piece costs: the lowest option in every step
   * added together. It is the number the storefront prints under "starting
   * total" before the shopper touches anything, so it belongs on this screen
   * too — a repriced fabric that moves the entry price should be visible here.
   */
  const startingTotal = useMemo(
    () =>
      list.reduce((total, step) => {
        const prices = step.choices.map((choice) => choice.priceDelta);
        return total + (prices.length ? Math.min(...prices) : 0);
      }, 0),
    [list],
  );

  const move = (index: number, direction: -1 | 1) => {
    const next = [...list];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ ids: next.map((step) => step.id) });
  };

  const submitStep = (event: FormEvent) => {
    event.preventDefault();
    if (!stepDraft) return;
    saveGroup.mutate({
      id: stepDraft.id,
      productId: null,
      label: stepDraft.label.trim(),
      slug: studioSlug(stepDraft.slug.trim() || stepDraft.label),
      helpText: stepDraft.helpText.trim() || null,
      displayType: stepDraft.displayType as "radio",
      isRequired: "true",
      allowMultiple: "false",
      isVisible: stepDraft.isVisible ? "true" : "false",
      sortOrder: stepDraft.id ? (list.find((step) => step.id === stepDraft.id)?.sortOrder ?? 0) : list.length,
    });
  };

  const submitOption = (event: FormEvent) => {
    event.preventDefault();
    if (!optionDraft) return;
    const major = Number(optionDraft.price.replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(major)) {
      toast.error("That price is not a number");
      return;
    }
    saveChoice.mutate({
      id: optionDraft.id,
      groupId: optionDraft.groupId,
      label: optionDraft.label.trim(),
      value: optionDraft.value.trim() || slugify(optionDraft.label),
      priceDelta: Math.round(major * 100),
      description: optionDraft.description.trim() || null,
      swatchColor: optionDraft.swatchColor.trim() || null,
      imageUrl: optionDraft.imageUrl.trim() || null,
      isDefault: optionDraft.isDefault ? "true" : "false",
      isVisible: optionDraft.isVisible ? "true" : "false",
      sortOrder: 0,
    });
  };

  return (
    <AdminShell title="Custom Studio" breadcrumb="Custom Studio">
      <PageHead
        title="Custom Studio"
        description="The steps a shopper walks through to design a piece from scratch, in the order they walk through them."
        actions={
          <>
            <Link href="/custom-studio" target="_blank" rel="noreferrer" className="sfa-btn sfa-btn--secondary">
              <ExternalLink size={15} aria-hidden="true" />
              View the studio
            </Link>
            {list.length > 0 ? (
              <Button variant="primary" icon={Plus} onClick={() => setStepDraft(blankStep())}>
                Add step
              </Button>
            ) : null}
          </>
        }
      />

      <Stack gap={16}>
        {databaseDown ? (
          <Notice tone="warning" title="The database is not connected.">
            The builder is wired and will load the steps as soon as the connection is live.
          </Notice>
        ) : null}

        {/* -------------------------------------------------- how it works */}
        <Notice tone="info" title="How this reaches the shopper">
          Each card below is one screen of the Custom Studio, shown top to bottom in this order. A
          shopper answers every step, and their total is the sum of the prices on the answers they
          picked — which is why the first step carries the price of the piece and the rest carry
          upgrades. As it stands the cheapest possible design comes to{" "}
          <strong>{format(startingTotal)}</strong>.
        </Notice>

        {/* ------------------------------------------------------ the steps */}
        {steps.isLoading ? (
          <div className="sfa-skeleton" style={{ height: 220 }} />
        ) : list.length === 0 ? (
          <Card>
            <EmptyState title="The Custom Studio has no steps yet" icon={Layers}>
              The storefront is still showing the four steps it was built with — shape, fabric,
              colour and scale — but they live in code, so nothing here can change them. Create them
              as editable steps and the studio starts reading from this screen instead. Nothing a
              shopper sees changes: the labels, photos and prices come across exactly as they are.
            </EmptyState>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                variant="primary"
                icon={Wand2}
                disabled={seed.isPending}
                onClick={() => seed.mutate()}
              >
                {seed.isPending ? "Creating…" : "Create the four standard steps"}
              </Button>
              <Button icon={Plus} onClick={() => setStepDraft(blankStep())}>
                Start from scratch
              </Button>
            </div>
          </Card>
        ) : (
          list.map((step, index) => (
            <Card
              key={step.id}
              title={
                <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="sfa-mono" style={{ color: "var(--sfa-text-muted)" }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step.label}
                  <Badge tone="accent">{displayLabel(step.displayType)}</Badge>
                  {step.isVisible === false ? <Badge tone="warning">Hidden</Badge> : null}
                </span>
              }
              description={step.helpText ?? `${step.choices.length} options · slug ${step.slug}`}
              actions={
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    size="icon"
                    title="Move up"
                    icon={ArrowUp}
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                  />
                  <Button
                    size="icon"
                    title="Move down"
                    icon={ArrowDown}
                    disabled={index === list.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                  />
                  <Button
                    size="icon"
                    title="Edit step"
                    icon={Pencil}
                    onClick={() =>
                      setStepDraft({
                        id: step.id,
                        label: step.label,
                        slug: step.slug,
                        helpText: step.helpText ?? "",
                        displayType: step.displayType,
                        isVisible: step.isVisible !== false,
                      })
                    }
                  />
                  <Button
                    size="icon"
                    variant="danger"
                    title="Delete step"
                    icon={Trash2}
                    disabled={deleteGroup.isPending}
                    onClick={() => {
                      // A step takes its options with it, so the confirmation
                      // says how many rather than asking "are you sure".
                      if (
                        !window.confirm(
                          `Delete "${step.label}" and its ${step.choices.length} options? The studio will drop to ${list.length - 1} steps.`,
                        )
                      ) {
                        return;
                      }
                      deleteGroup.mutate({ id: step.id });
                    }}
                  />
                </div>
              }
              footer={
                <Button size="sm" icon={Plus} onClick={() => setOptionDraft(blankOption(step.id))}>
                  Add an option to {step.label}
                </Button>
              }
            >
              {step.choices.length === 0 ? (
                <p className="sfa-help">
                  No options yet. A step with nothing to choose is skipped on the storefront.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {step.choices.map((choice) => (
                    <div
                      key={choice.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: "var(--sfa-radius-sm)",
                        background: "var(--sfa-surface-2)",
                      }}
                    >
                      <Preview imageUrl={choice.imageUrl} swatchColor={choice.swatchColor} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 13.5 }}>{choice.label}</strong>
                          {choice.isDefault ? <Badge tone="success">Preselected</Badge> : null}
                        </div>
                        <div className="sfa-help" style={{ margin: 0 }}>
                          {choice.description || choice.value}
                        </div>
                      </div>

                      <span
                        style={{
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {choice.priceDelta === 0 ? "Included" : format(choice.priceDelta)}
                      </span>

                      <Button
                        size="icon"
                        title="Edit option"
                        icon={Pencil}
                        onClick={() =>
                          setOptionDraft({
                            id: choice.id,
                            groupId: step.id,
                            label: choice.label,
                            value: choice.value,
                            price: String(choice.priceDelta / 100),
                            description: choice.description ?? "",
                            swatchColor: choice.swatchColor ?? "",
                            imageUrl: choice.imageUrl ?? "",
                            isDefault: choice.isDefault,
                            isVisible: true,
                          })
                        }
                      />
                      <Button
                        size="icon"
                        variant="danger"
                        title="Delete option"
                        icon={Trash2}
                        disabled={deleteChoice.isPending}
                        onClick={() => {
                          if (!window.confirm(`Delete "${choice.label}"?`)) return;
                          deleteChoice.mutate({ id: choice.id });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </Stack>

      {/* ------------------------------------------------------------ forms */}
      {stepDraft ? (
        <Drawer title={stepDraft.id ? "Edit step" : "Add a step"} onClose={() => setStepDraft(null)}>
          <form onSubmit={submitStep} style={{ display: "grid", gap: 14 }}>
            <Field label="Step name" help="What the shopper sees above the choices — Shape, Fabric, Legs.">
              <input
                className="sfa-input"
                value={stepDraft.label}
                required
                onChange={(event) =>
                  setStepDraft({
                    ...stepDraft,
                    label: event.target.value,
                    // The slug follows the name until the step exists; after
                    // that it is left alone, because saved answers reference it.
                    slug: stepDraft.id ? stepDraft.slug : studioSlug(event.target.value),
                  })
                }
              />
            </Field>

            <Field
              label="Reference name"
              help={`Used in carts, saved designs and analytics. Kept under the ${STUDIO_PREFIX} prefix, which is what separates a studio screen from an ordinary shared product option. Changing it on a live step orphans anything already saved against the old one.`}
            >
              <input
                className="sfa-input"
                value={stepDraft.slug}
                required
                onChange={(event) => setStepDraft({ ...stepDraft, slug: event.target.value })}
              />
            </Field>

            <Field label="Help text" help="One line under the heading. Optional.">
              <input
                className="sfa-input"
                value={stepDraft.helpText}
                onChange={(event) => setStepDraft({ ...stepDraft, helpText: event.target.value })}
              />
            </Field>

            <Field label="How the choices are shown">
              <select
                className="sfa-input"
                value={stepDraft.displayType}
                onChange={(event) => setStepDraft({ ...stepDraft, displayType: event.target.value })}
              >
                {DISPLAY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={stepDraft.isVisible}
                onChange={(event) => setStepDraft({ ...stepDraft, isVisible: event.target.checked })}
              />
              Show this step in the studio
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" type="submit" disabled={saveGroup.isPending}>
                {saveGroup.isPending ? "Saving…" : "Save step"}
              </Button>
              <Button onClick={() => setStepDraft(null)}>Cancel</Button>
            </div>
          </form>
        </Drawer>
      ) : null}

      {optionDraft ? (
        <Drawer
          title={optionDraft.id ? "Edit option" : "Add an option"}
          onClose={() => setOptionDraft(null)}
        >
          <form onSubmit={submitOption} style={{ display: "grid", gap: 14 }}>
            <Field label="Option name">
              <input
                className="sfa-input"
                value={optionDraft.label}
                required
                onChange={(event) =>
                  setOptionDraft({
                    ...optionDraft,
                    label: event.target.value,
                    value: optionDraft.id ? optionDraft.value : slugify(event.target.value),
                  })
                }
              />
            </Field>

            <Field
              label={`Price (${symbol})`}
              help="What this answer adds to the total. On the first step this is the price of the piece itself. A negative number discounts."
            >
              <input
                className="sfa-input"
                inputMode="decimal"
                value={optionDraft.price}
                onChange={(event) => setOptionDraft({ ...optionDraft, price: event.target.value })}
              />
            </Field>

            <Field label="Note" help="The small line under the name — “Soft · natural”. Optional.">
              <input
                className="sfa-input"
                value={optionDraft.description}
                onChange={(event) => setOptionDraft({ ...optionDraft, description: event.target.value })}
              />
            </Field>

            <Field label="Swatch colour" help="A hex colour such as #D6C5AD, for swatch steps.">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="sfa-input"
                  value={optionDraft.swatchColor}
                  placeholder="#D6C5AD"
                  onChange={(event) => setOptionDraft({ ...optionDraft, swatchColor: event.target.value })}
                />
                <input
                  type="color"
                  aria-label="Pick a swatch colour"
                  value={/^#[0-9a-fA-F]{6}$/.test(optionDraft.swatchColor) ? optionDraft.swatchColor : "#D6C5AD"}
                  onChange={(event) => setOptionDraft({ ...optionDraft, swatchColor: event.target.value })}
                  style={{ width: 44, height: 38, border: 0, background: "none", padding: 0 }}
                />
              </div>
            </Field>

            <Field label="Photo" help="For photo-tile steps. Leave empty for the others.">
              <ImageInput
                value={optionDraft.imageUrl}
                onChange={(next) => setOptionDraft({ ...optionDraft, imageUrl: next })}
                label="Drag a photo here, or click to choose"
                hint="Shown as the tile a shopper picks."
              />
            </Field>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={optionDraft.isDefault}
                onChange={(event) => setOptionDraft({ ...optionDraft, isDefault: event.target.checked })}
              />
              Preselect this one when the studio opens
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" type="submit" disabled={saveChoice.isPending}>
                {saveChoice.isPending ? "Saving…" : "Save option"}
              </Button>
              <Button onClick={() => setOptionDraft(null)}>Cancel</Button>
            </div>
          </form>
        </Drawer>
      ) : null}
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ parts -- */

function displayLabel(value: string) {
  return DISPLAY_TYPES.find((type) => type.value === value)?.label.split(" — ")[0] ?? value;
}

/** The swatch or photo exactly as the shopper will meet it. */
function Preview({ imageUrl, swatchColor }: { imageUrl: string | null; swatchColor: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        style={{ width: 46, height: 34, objectFit: "cover", borderRadius: 6, flex: "none" }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        flex: "none",
        background: swatchColor ?? "var(--sfa-surface-3)",
        border: "1px solid var(--sfa-border)",
      }}
    />
  );
}

/** A plain side panel. The admin has no modal primitive and does not need one. */
function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(31, 27, 23, 0.35)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(460px, 100%)",
          background: "var(--sfa-surface)",
          borderInlineStart: "1px solid var(--sfa-border)",
          padding: 20,
          overflowY: "auto",
          boxShadow: "var(--sfa-shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBlockEnd: 16,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 650, margin: 0 }}>{title}</h2>
          <Button size="icon" title="Close" icon={X} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

/** Re-exported for the nav's icon, so the menu and the screen agree. */
export const CUSTOM_STUDIO_ICONS = { Layers, Eye, EyeOff };
