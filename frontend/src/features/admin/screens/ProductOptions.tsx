"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Globe,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { OPTION_PRESETS } from "@shared/catalog/optionPresets";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { ImageInput } from "../ImagePicker";
import { slugify, useMoney } from "../adminUtils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Grid,
  Notice,
  PageHead,
  Stack,
  TableWrap,
} from "../ui";

const DISPLAY_TYPES = [
  { value: "radio", label: "Radio buttons — every choice visible" },
  { value: "swatch", label: "Colour swatches — a tile per choice" },
  { value: "image", label: "Image swatches — a photo per choice" },
  { value: "dropdown", label: "Dropdown — best past six choices" },
  { value: "checkbox", label: "Checkboxes — several answers allowed" },
  { value: "text", label: "Free text — the shopper types an answer" },
] as const;

type GroupDraft = {
  id?: number;
  label: string;
  slug: string;
  helpText: string;
  displayType: (typeof DISPLAY_TYPES)[number]["value"];
  isRequired: boolean;
  allowMultiple: boolean;
  isVisible: boolean;
  isGlobal: boolean;
};

type ChoiceDraft = {
  id?: number;
  groupId: number;
  /** Only offer this choice while the chosen parent is selected. */
  parentChoiceId: number | null;
  label: string;
  value: string;
  priceDeltaMajor: string;
  imageUrl: string;
  swatchColor: string;
  sku: string;
  description: string;
  isDefault: boolean;
  isVisible: boolean;
};

const blankGroup = (): GroupDraft => ({
  label: "",
  slug: "",
  helpText: "",
  displayType: "radio",
  isRequired: true,
  allowMultiple: false,
  isVisible: true,
  isGlobal: false,
});

const blankChoice = (groupId: number): ChoiceDraft => ({
  groupId,
  parentChoiceId: null,
  label: "",
  value: "",
  priceDeltaMajor: "0",
  imageUrl: "",
  swatchColor: "",
  sku: "",
  description: "",
  isDefault: false,
  isVisible: true,
});

/**
 * The configurator builder.
 *
 * This is what turns a flat product into the kind of page a made-to-order sofa
 * needs: "Select Depth" with a price on each choice, "Select Material" as
 * swatches, "Back Cushion Style" as photos. The owner defines the questions and
 * what each answer does to the price; the storefront renders whatever is here.
 */
export default function ProductOptions({ productId }: { productId: number }) {
  const utils = trpc.useUtils();
  const { format, symbol } = useMoney();

  const products = trpc.admin.listProducts.useQuery(undefined, { retry: false });
  const groups = trpc.admin.options.forProduct.useQuery({ productId }, { retry: false });
  const saveGroup = trpc.admin.options.saveGroup.useMutation();
  const deleteGroup = trpc.admin.options.deleteGroup.useMutation();
  const saveChoice = trpc.admin.options.saveChoice.useMutation();
  const deleteChoice = trpc.admin.options.deleteChoice.useMutation();
  const reorderGroups = trpc.admin.options.reorderGroups.useMutation();
  const applyPreset = trpc.admin.options.applyPreset.useMutation();

  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [choiceDraft, setChoiceDraft] = useState<ChoiceDraft | null>(null);
  const [selection, setSelection] = useState<Record<string, string>>({});

  const product = products.data?.find(entry => entry.id === productId);
  const databaseReady = Boolean(groups.data) && !groups.error;
  const list = groups.data ?? [];

  const refresh = () =>
    Promise.all([utils.admin.options.forProduct.invalidate({ productId }), utils.commerce.getProductOptions.invalidate()]);

  /**
   * What a choice can be tied to: any answer in a question asked earlier.
   *
   * The order matters — a colour can depend on a material because material is
   * asked first. Offering a later question would let the owner build a pair
   * that can never both be satisfied.
   */
  /** Choice id -> "Material — Velvet", for naming a dependency in the list. */
  const parentLabelById = useMemo(() => {
    const labels = new Map<number, string>();
    for (const group of list) {
      for (const choice of group.choices) labels.set(choice.id, choice.label);
    }
    return labels;
  }, [list]);

  const parentOptions = useMemo(() => {
    if (!choiceDraft) return [];
    const position = list.findIndex(group => group.id === choiceDraft.groupId);
    if (position <= 0) return [];
    return list.slice(0, position).flatMap(group =>
      group.choices.map(choice => ({ id: choice.id, label: `${group.label} — ${choice.label}` }))
    );
  }, [list, choiceDraft]);

  // The same arithmetic the storefront will do, so the owner sees the real
  // price a shopper would land on before publishing.
  const previewTotal = useMemo(() => {
    const base = product?.startingPrice ?? 0;
    let total = base;
    for (const group of list) {
      const chosenValue = selection[group.slug] ?? group.choices.find(choice => choice.isDefault)?.value;
      const chosen = group.choices.find(choice => choice.value === chosenValue);
      if (chosen) total += chosen.priceDelta;
    }
    return total;
  }, [list, selection, product?.startingPrice]);

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!groupDraft || !databaseReady) return;
    try {
      await saveGroup.mutateAsync({
        id: groupDraft.id,
        productId: groupDraft.isGlobal ? null : productId,
        label: groupDraft.label,
        slug: groupDraft.slug || slugify(groupDraft.label),
        helpText: groupDraft.helpText || null,
        displayType: groupDraft.displayType,
        isRequired: groupDraft.isRequired ? "true" : "false",
        allowMultiple: groupDraft.displayType === "checkbox" && groupDraft.allowMultiple ? "true" : "false",
        isVisible: groupDraft.isVisible ? "true" : "false",
        sortOrder: list.length,
      });
      await refresh();
      setGroupDraft(null);
      toast.success(groupDraft.id ? "Option updated" : "Option added");
    } catch (error) {
      toast.error("Option could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const submitChoice = async (event: FormEvent) => {
    event.preventDefault();
    if (!choiceDraft || !databaseReady) return;
    const delta = Number(choiceDraft.priceDeltaMajor);
    if (!Number.isFinite(delta)) {
      toast.error("Enter a valid price change");
      return;
    }
    try {
      await saveChoice.mutateAsync({
        id: choiceDraft.id,
        groupId: choiceDraft.groupId,
        parentChoiceId: choiceDraft.parentChoiceId,
        label: choiceDraft.label,
        value: choiceDraft.value || slugify(choiceDraft.label),
        priceDelta: Math.round(delta * 100),
        imageUrl: choiceDraft.imageUrl || null,
        swatchColor: choiceDraft.swatchColor || null,
        sku: choiceDraft.sku || null,
        description: choiceDraft.description || null,
        isDefault: choiceDraft.isDefault ? "true" : "false",
        isVisible: choiceDraft.isVisible ? "true" : "false",
        sortOrder: 0,
      });
      await refresh();
      setChoiceDraft(null);
      toast.success("Choice saved");
    } catch (error) {
      toast.error("Choice could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const usePreset = async (presetId: string) => {
    if (!databaseReady) {
      toast.info("Database connection required");
      return;
    }
    try {
      const result = await applyPreset.mutateAsync({ productId, presetId });
      await refresh();
      setPresetPickerOpen(false);
      if (result.added.length === 0) {
        toast.info("Nothing to add", { description: "This product already has every question in that set." });
      } else {
        toast.success(`Added ${result.added.length} option${result.added.length === 1 ? "" : "s"}`, {
          description: result.skipped.length
            ? `Skipped ${result.skipped.join(", ")} — already on this product.`
            : "Now set the price each choice adds.",
        });
      }
    } catch (error) {
      toast.error("Preset could not be applied", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...list];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await reorderGroups.mutateAsync({ ids: next.map(group => group.id) });
      await refresh();
    } catch (error) {
      toast.error("Order could not be saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="Product options" breadcrumb="Catalog">
      <PageHead
        title={product ? `Options — ${product.name}` : "Product options"}
        description="The questions a shopper answers on this product page, and what each answer adds to the price."
        actions={
          <>
            <Link href="/admin/products" className="sfa-btn sfa-btn--secondary">
              <ArrowLeft size={15} aria-hidden="true" />
              Back to products
            </Link>
            <Button icon={Sparkles} onClick={() => setPresetPickerOpen(open => !open)}>
              Use a preset
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setGroupDraft(blankGroup())}>
              Add option
            </Button>
          </>
        }
      />

      <Stack gap={16}>
        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            The builder is complete and will save real options once the connection is live.
          </Notice>
        ) : null}

        {presetPickerOpen ? (
          <Card
            title="Start from a ready-made set"
            description="The standard questions for this kind of piece, added in one go. Prices start at zero — set what each upgrade costs afterwards."
            actions={
              <Button size="icon" variant="ghost" icon={X} title="Close" onClick={() => setPresetPickerOpen(false)} />
            }
          >
            <Grid min={260}>
              {OPTION_PRESETS.map(preset => (
                <div
                  key={preset.id}
                  style={{
                    border: "1px solid var(--sfa-border)",
                    borderRadius: "var(--sfa-radius-sm)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 650, fontSize: 13.5 }}>{preset.label}</p>
                    <p className="sfa-help" style={{ marginBlockStart: 3 }}>
                      {preset.description}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {preset.groups.map(group => (
                      <Badge key={group.slug} tone="neutral">
                        {group.label}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    icon={Sparkles}
                    disabled={!databaseReady || applyPreset.isPending}
                    onClick={() => void usePreset(preset.id)}
                  >
                    {applyPreset.isPending ? "Adding…" : `Add these ${preset.groups.length} options`}
                  </Button>
                </div>
              ))}
            </Grid>
          </Card>
        ) : null}

        {groupDraft ? (
          <Card
            title={groupDraft.id ? "Edit option" : "New option"}
            description="An option is one question — Select Depth, Select Material, Back Cushion Style."
            actions={<Button size="icon" variant="ghost" icon={X} title="Close" onClick={() => setGroupDraft(null)} />}
          >
            <form onSubmit={submitGroup}>
              <Stack gap={16}>
                <Grid min={250}>
                  <Field label="Question shown to the shopper" htmlFor="g-label">
                    <input
                      id="g-label"
                      className="sfa-input"
                      required
                      placeholder="Select Depth"
                      value={groupDraft.label}
                      onChange={event =>
                        setGroupDraft({
                          ...groupDraft,
                          label: event.target.value,
                          slug: groupDraft.id ? groupDraft.slug : slugify(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field
                    label="Internal name"
                    htmlFor="g-slug"
                    help="Stored on every order line. Changing it on a live product makes old orders harder to read."
                  >
                    <input
                      id="g-slug"
                      className="sfa-input sfa-input--mono"
                      required
                      value={groupDraft.slug}
                      onChange={event => setGroupDraft({ ...groupDraft, slug: slugify(event.target.value) })}
                    />
                  </Field>
                </Grid>

                <Field label="How it looks" htmlFor="g-type">
                  <select
                    id="g-type"
                    className="sfa-select"
                    value={groupDraft.displayType}
                    onChange={event =>
                      setGroupDraft({ ...groupDraft, displayType: event.target.value as GroupDraft["displayType"] })
                    }
                  >
                    {DISPLAY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Helper text" htmlFor="g-help" help="Optional. Sits under the question on the product page.">
                  <input
                    id="g-help"
                    className="sfa-input"
                    value={groupDraft.helpText}
                    onChange={event => setGroupDraft({ ...groupDraft, helpText: event.target.value })}
                  />
                </Field>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <Check
                    label="Required"
                    checked={groupDraft.isRequired}
                    onChange={next => setGroupDraft({ ...groupDraft, isRequired: next })}
                  />
                  <Check
                    label="Visible on the storefront"
                    checked={groupDraft.isVisible}
                    onChange={next => setGroupDraft({ ...groupDraft, isVisible: next })}
                  />
                  {groupDraft.displayType === "checkbox" ? (
                    <Check
                      label="Allow several answers"
                      checked={groupDraft.allowMultiple}
                      onChange={next => setGroupDraft({ ...groupDraft, allowMultiple: next })}
                    />
                  ) : null}
                  <Check
                    label="Reuse across every product"
                    checked={groupDraft.isGlobal}
                    onChange={next => setGroupDraft({ ...groupDraft, isGlobal: next })}
                  />
                </div>

                {groupDraft.isGlobal ? (
                  <Notice tone="info">
                    A shared option appears on every product in the catalogue. Editing it here changes it everywhere.
                  </Notice>
                ) : null}

                <div style={{ display: "flex", gap: 8, paddingBlockStart: 12, borderBlockStart: "1px solid var(--sfa-border)" }}>
                  <Button type="submit" variant="primary" disabled={!databaseReady || saveGroup.isPending}>
                    {groupDraft.id ? "Save option" : "Add option"}
                  </Button>
                  <Button onClick={() => setGroupDraft(null)}>Cancel</Button>
                </div>
              </Stack>
            </form>
          </Card>
        ) : null}

        {choiceDraft ? (
          <Card
            title={choiceDraft.id ? "Edit choice" : "New choice"}
            description="One answer to the question, and what it does to the price."
            actions={<Button size="icon" variant="ghost" icon={X} title="Close" onClick={() => setChoiceDraft(null)} />}
          >
            <form onSubmit={submitChoice}>
              <Stack gap={16}>
                <Grid min={230}>
                  <Field label="Choice label" htmlFor="c-label">
                    <input
                      id="c-label"
                      className="sfa-input"
                      required
                      placeholder='40" Comfy Depth'
                      value={choiceDraft.label}
                      onChange={event =>
                        setChoiceDraft({
                          ...choiceDraft,
                          label: event.target.value,
                          value: choiceDraft.id ? choiceDraft.value : slugify(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Internal value" htmlFor="c-value">
                    <input
                      id="c-value"
                      className="sfa-input sfa-input--mono"
                      required
                      value={choiceDraft.value}
                      onChange={event => setChoiceDraft({ ...choiceDraft, value: slugify(event.target.value) })}
                    />
                  </Field>
                  <Field
                    label={`Price change (${symbol})`}
                    htmlFor="c-price"
                    help="Added to the product price. Use a negative number for a discount, 0 for no change."
                  >
                    <input
                      id="c-price"
                      className="sfa-input"
                      type="number"
                      step="0.01"
                      value={choiceDraft.priceDeltaMajor}
                      onChange={event => setChoiceDraft({ ...choiceDraft, priceDeltaMajor: event.target.value })}
                    />
                  </Field>
                  <Field label="SKU" htmlFor="c-sku" help="Optional. Useful when a choice maps to stock.">
                    <input
                      id="c-sku"
                      className="sfa-input sfa-input--mono"
                      value={choiceDraft.sku}
                      onChange={event => setChoiceDraft({ ...choiceDraft, sku: event.target.value })}
                    />
                  </Field>
                  <Field label="Swatch colour" htmlFor="c-colour" help="Hex, for colour swatch options.">
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        id="c-colour"
                        className="sfa-input sfa-input--mono"
                        placeholder="#C8A27A"
                        value={choiceDraft.swatchColor}
                        onChange={event => setChoiceDraft({ ...choiceDraft, swatchColor: event.target.value })}
                      />
                      <input
                        type="color"
                        aria-label="Pick swatch colour"
                        value={/^#[0-9a-fA-F]{6}$/.test(choiceDraft.swatchColor) ? choiceDraft.swatchColor : "#c8a27a"}
                        onChange={event => setChoiceDraft({ ...choiceDraft, swatchColor: event.target.value })}
                        style={{ width: 40, height: 36, border: "1px solid var(--sfa-border-strong)", borderRadius: 7, padding: 2 }}
                      />
                    </div>
                  </Field>
                  <Field
                    label="Only show under"
                    htmlFor="c-parent"
                    help={
                      parentOptions.length > 0
                        ? "Ties this choice to an earlier answer — a colour to its material."
                        : "Available once an earlier question has choices to tie this to."
                    }
                  >
                    <select
                      id="c-parent"
                      className="sfa-input"
                      disabled={parentOptions.length === 0}
                      value={choiceDraft.parentChoiceId ?? ""}
                      onChange={event =>
                        setChoiceDraft({
                          ...choiceDraft,
                          parentChoiceId: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    >
                      <option value="">Always shown</option>
                      {parentOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Swatch photo" help="For image swatches such as fabrics or cushion styles.">
                    <ImageInput
                      value={choiceDraft.imageUrl}
                      onChange={next => setChoiceDraft({ ...choiceDraft, imageUrl: next })}
                      label="Drag a swatch here, or click to choose"
                      hint="A close-up of the fabric or finish."
                    />
                  </Field>
                </Grid>

                <Field label="Short description" htmlFor="c-desc">
                  <input
                    id="c-desc"
                    className="sfa-input"
                    value={choiceDraft.description}
                    onChange={event => setChoiceDraft({ ...choiceDraft, description: event.target.value })}
                  />
                </Field>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <Check
                    label="Selected by default"
                    checked={choiceDraft.isDefault}
                    onChange={next => setChoiceDraft({ ...choiceDraft, isDefault: next })}
                  />
                  <Check
                    label="Visible"
                    checked={choiceDraft.isVisible}
                    onChange={next => setChoiceDraft({ ...choiceDraft, isVisible: next })}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, paddingBlockStart: 12, borderBlockStart: "1px solid var(--sfa-border)" }}>
                  <Button type="submit" variant="primary" disabled={!databaseReady || saveChoice.isPending}>
                    Save choice
                  </Button>
                  <Button onClick={() => setChoiceDraft(null)}>Cancel</Button>
                </div>
              </Stack>
            </form>
          </Card>
        ) : null}

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }} className="sfa-dash-split">
          <Stack gap={16}>
            {list.length === 0 ? (
              <Card>
                <EmptyState
                  title="No options on this product yet"
                  icon={SlidersHorizontal}
                  action={
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <Button variant="primary" icon={Sparkles} onClick={() => setPresetPickerOpen(true)}>
                        Use a preset
                      </Button>
                      <Button icon={Plus} onClick={() => setGroupDraft(blankGroup())}>
                        Build one by hand
                      </Button>
                    </div>
                  }
                >
                  Add questions like Configuration, Select Depth, Select Material or Back Cushion Style. Each answer
                  can carry its own price, so the total updates as the shopper configures.
                </EmptyState>
              </Card>
            ) : (
              list.map((group, index) => (
                <Card
                  key={group.id}
                  title={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {group.label}
                      <Badge tone="neutral">{group.displayType}</Badge>
                      {group.isRequired ? <Badge tone="accent">Required</Badge> : null}
                      {group.productId === null ? (
                        <Badge tone="info">
                          <Globe size={11} aria-hidden="true" />
                          Shared
                        </Badge>
                      ) : null}
                    </span>
                  }
                  description={group.helpText ?? `Stored as “${group.slug}”`}
                  flush
                  actions={
                    <div style={{ display: "flex", gap: 2 }}>
                      <Button
                        size="icon"
                        variant="ghost"
                        icon={ChevronUp}
                        title="Move up"
                        disabled={index === 0}
                        onClick={() => void move(index, -1)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        icon={ChevronDown}
                        title="Move down"
                        disabled={index === list.length - 1}
                        onClick={() => void move(index, 1)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        icon={Pencil}
                        title="Edit option"
                        onClick={() =>
                          setGroupDraft({
                            id: group.id,
                            label: group.label,
                            slug: group.slug,
                            helpText: group.helpText ?? "",
                            displayType: group.displayType as GroupDraft["displayType"],
                            isRequired: group.isRequired,
                            allowMultiple: group.allowMultiple,
                            isVisible: true,
                            isGlobal: group.productId === null,
                          })
                        }
                      />
                      <Button
                        size="icon"
                        variant="danger"
                        icon={Trash2}
                        title="Delete option"
                        disabled={!databaseReady || deleteGroup.isPending}
                        onClick={async () => {
                          if (!window.confirm(`Delete “${group.label}” and all of its choices?`)) return;
                          try {
                            await deleteGroup.mutateAsync({ id: group.id });
                            await refresh();
                            toast.success("Option deleted");
                          } catch (error) {
                            toast.error("Option could not be deleted", {
                              description: error instanceof Error ? error.message : "Please try again.",
                            });
                          }
                        }}
                      />
                    </div>
                  }
                  footer={
                    <Button icon={Plus} size="sm" onClick={() => setChoiceDraft(blankChoice(group.id))}>
                      Add choice
                    </Button>
                  }
                >
                  {group.choices.length === 0 ? (
                    <EmptyState title="No choices yet">
                      A question with no answers is hidden from the product page.
                    </EmptyState>
                  ) : (
                    <TableWrap>
                      <thead>
                        <tr>
                          <th>Choice</th>
                          <th className="sfa-table__num">Price change</th>
                          <th>Flags</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {group.choices.map(choice => (
                          <tr key={choice.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <Swatch imageUrl={choice.imageUrl} color={choice.swatchColor} />
                                <div>
                                  <div className="sfa-table__primary">{choice.label}</div>
                                  <div className="sfa-table__muted sfa-mono" style={{ fontSize: 11.5 }}>
                                    {choice.value}
                                    {choice.sku ? ` · ${choice.sku}` : ""}
                                  </div>
                                  {choice.parentChoiceId ? (
                                    <div className="sfa-table__muted" style={{ fontSize: 11.5 }}>
                                      Only under {parentLabelById.get(choice.parentChoiceId) ?? "a removed choice"}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="sfa-table__num">
                              {choice.priceDelta === 0 ? (
                                <span className="sfa-table__muted">No change</span>
                              ) : (
                                <span style={{ color: choice.priceDelta < 0 ? "var(--sfa-success)" : undefined }}>
                                  {choice.priceDelta > 0 ? "+" : "−"}
                                  {format(Math.abs(choice.priceDelta))}
                                </span>
                              )}
                            </td>
                            <td>
                              {choice.isDefault ? <Badge tone="success">Default</Badge> : null}
                            </td>
                            <td>
                              <div className="sfa-row-actions">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  icon={Pencil}
                                  title="Edit choice"
                                  onClick={() =>
                                    setChoiceDraft({
                                      id: choice.id,
                                      groupId: group.id,
                                      label: choice.label,
                                      value: choice.value,
                                      parentChoiceId: choice.parentChoiceId,
                                      priceDeltaMajor: String(choice.priceDelta / 100),
                                      imageUrl: choice.imageUrl ?? "",
                                      swatchColor: choice.swatchColor ?? "",
                                      sku: choice.sku ?? "",
                                      description: choice.description ?? "",
                                      isDefault: choice.isDefault,
                                      isVisible: true,
                                    })
                                  }
                                />
                                <Button
                                  size="icon"
                                  variant="danger"
                                  icon={Trash2}
                                  title="Delete choice"
                                  disabled={!databaseReady || deleteChoice.isPending}
                                  onClick={async () => {
                                    if (!window.confirm(`Delete the choice “${choice.label}”?`)) return;
                                    try {
                                      await deleteChoice.mutateAsync({ id: choice.id });
                                      await refresh();
                                      toast.success("Choice deleted");
                                    } catch (error) {
                                      toast.error("Choice could not be deleted", {
                                        description: error instanceof Error ? error.message : "Please try again.",
                                      });
                                    }
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  )}
                </Card>
              ))
            )}
          </Stack>

          <Stack gap={16}>
            <Card
              title="Live preview"
              description="Exactly what a shopper sees, with the price it lands on."
            >
              {list.length === 0 ? (
                <EmptyState title="Nothing to preview yet" icon={Eye} />
              ) : (
                <Stack gap={16}>
                  {list.map(group => {
                    const chosen = selection[group.slug] ?? group.choices.find(choice => choice.isDefault)?.value ?? "";
                    return (
                      <div key={group.id}>
                        <p style={{ fontSize: 12.5, fontWeight: 650, marginBlockEnd: 7 }}>
                          {group.label}
                          {group.isRequired ? <span style={{ color: "var(--sfa-danger)" }}> *</span> : null}
                        </p>
                        {group.choices.length === 0 ? (
                          <p className="sfa-help">No choices yet.</p>
                        ) : group.displayType === "dropdown" ? (
                          <select
                            className="sfa-select"
                            value={chosen}
                            onChange={event => setSelection({ ...selection, [group.slug]: event.target.value })}
                          >
                            {group.choices.map(choice => (
                              <option key={choice.id} value={choice.value}>
                                {choice.label}
                                {choice.priceDelta ? ` (+${format(choice.priceDelta)})` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                            {group.choices.map(choice => {
                              const active = chosen === choice.value;
                              return (
                                <button
                                  key={choice.id}
                                  type="button"
                                  onClick={() => setSelection({ ...selection, [group.slug]: choice.value })}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                    padding: "7px 10px",
                                    borderRadius: "var(--sfa-radius-sm)",
                                    border: `1px solid ${active ? "var(--sfa-accent)" : "var(--sfa-border-strong)"}`,
                                    background: active ? "var(--sfa-accent-soft)" : "var(--sfa-surface)",
                                    color: "var(--sfa-text)",
                                    fontSize: 12.5,
                                    cursor: "pointer",
                                  }}
                                >
                                  <Swatch imageUrl={choice.imageUrl} color={choice.swatchColor} size={18} />
                                  <span>{choice.label}</span>
                                  {choice.priceDelta ? (
                                    <span className="sfa-table__muted">
                                      {choice.priceDelta > 0 ? "+" : "−"}
                                      {format(Math.abs(choice.priceDelta))}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {group.helpText ? <p className="sfa-help" style={{ marginBlockStart: 5 }}>{group.helpText}</p> : null}
                      </div>
                    );
                  })}

                  <hr className="sfa-sep" />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="sfa-help">Configured price</span>
                    <strong style={{ fontSize: 20, letterSpacing: "-0.02em" }}>{format(previewTotal)}</strong>
                  </div>
                  <p className="sfa-help">
                    Base {format(product?.startingPrice ?? 0)} plus the selected options.
                  </p>
                </Stack>
              )}
            </Card>

            <Card title="Tips">
              <Stack gap={9}>
                <Tip icon={EyeOff}>An option with no visible choices is hidden from the product page automatically.</Tip>
                <Tip icon={Globe}>Mark an option shared when the same question applies to your whole catalogue.</Tip>
                <Tip icon={SlidersHorizontal}>Give one choice per option a default so the page opens on a valid price.</Tip>
              </Stack>
            </Card>
          </Stack>
        </div>
      </Stack>
    </AdminShell>
  );
}

function Swatch({ imageUrl, color, size = 24 }: { imageUrl: string | null; color: string | null; size?: number }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- swatches are arbitrary remote URLs
    return <img src={imageUrl} alt="" style={{ width: size, height: size, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        flexShrink: 0,
        background: color ?? "var(--sfa-surface-3)",
        border: "1px solid var(--sfa-border)",
      }}
    />
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="sfa-switch">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span className="sfa-switch__track" aria-hidden="true" />
      <span style={{ fontSize: 13.5 }}>{label}</span>
    </label>
  );
}

function Tip({ icon: Icon, children }: { icon: typeof Globe; children: React.ReactNode }) {
  return (
    <p style={{ display: "flex", gap: 8, alignItems: "flex-start" }} className="sfa-help">
      <Icon size={14} aria-hidden="true" style={{ flexShrink: 0, marginBlockStart: 2, color: "var(--sfa-accent)" }} />
      <span>{children}</span>
    </p>
  );
}
