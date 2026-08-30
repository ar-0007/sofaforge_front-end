import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { findPreset } from "@shared/catalog/optionPresets";
import { STUDIO_STEPS } from "@shared/catalog/studioSteps";
import { getDb } from "../../db";
import {
  adminAuditLogs,
  productOptionChoices,
  productOptionGroups,
  products,
} from "../../db/schema";
import { imageRef } from "../../core/media";
import { adminProcedure, publicProcedure, router } from "../../core/trpc";

const boolEnum = z.enum(["true", "false"]);

/**
 * How a Custom Studio step is told apart from an ordinary shared option.
 *
 * Both live in `productOptionGroups` with a null `productId`, because both are
 * questions that belong to the catalogue rather than to one piece — but they
 * are asked in different places. "Select Depth" is a question on a product
 * page; "Shape" is a screen in the studio. The store already had global groups
 * from the WooCommerce import before the studio existed, and inheriting those
 * as studio screens would have rewritten the storefront page without anybody
 * asking for it.
 *
 * A prefix rather than a column, because a column means a migration and this
 * distinction is a naming rule the owner can see in the builder. If the two
 * ever need to differ in more than name, that is the moment for the column.
 */
export const STUDIO_SLUG_PREFIX = "studio-";

const groupPayload = z.object({
  /** Null makes the group reusable across every product. */
  productId: z.number().int().positive().nullable(),
  label: z.string().min(1).max(160),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(
      /^[a-z0-9][a-z0-9_-]*$/,
      "Use lowercase letters, digits, - or _ only."
    ),
  helpText: z.string().max(1000).nullable().optional(),
  displayType: z
    .enum(["radio", "dropdown", "swatch", "image", "checkbox", "text"])
    .default("radio"),
  isRequired: boolEnum.default("true"),
  allowMultiple: boolEnum.default("false"),
  isVisible: boolEnum.default("true"),
  sortOrder: z.number().int().min(0).default(0),
});

const choicePayload = z.object({
  groupId: z.number().int().positive(),
  /**
   * Ties this choice to one in an earlier group, so it is only offered while
   * that one is selected — a fabric colour belongs to its material.
   */
  parentChoiceId: z.number().int().positive().nullable().optional(),
  label: z.string().min(1).max(200),
  value: z
    .string()
    .min(1)
    .max(120)
    .regex(
      /^[a-z0-9][a-z0-9_-]*$/,
      "Use lowercase letters, digits, - or _ only."
    ),
  /** Minor units. Negative is a discount, which the owner is allowed to set. */
  priceDelta: z.number().int().min(-10_000_000).max(10_000_000).default(0),
  imageUrl: imageRef.nullable().optional(),
  swatchColor: z
    .string()
    .regex(
      /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
      "Use a hex colour such as #C8A27A."
    )
    .nullable()
    .optional(),
  sku: z.string().max(100).nullable().optional(),
  description: z.string().max(400).nullable().optional(),
  isDefault: boolEnum.default("false"),
  isVisible: boolEnum.default("true"),
  sortOrder: z.number().int().min(0).default(0),
});

async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "The database is temporarily unavailable.",
    });
  return db;
}

async function audit(
  adminUserId: number,
  action: string,
  entityId?: number,
  metadata?: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminAuditLogs).values({
    adminUserId,
    action,
    entityType: "productOption",
    entityId,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

/**
 * A group plus its choices, ready for the storefront configurator or the admin
 * builder. Both read the same shape so the preview in the admin cannot drift
 * from what a shopper actually sees.
 */
export type OptionGroupWithChoices = {
  id: number;
  productId: number | null;
  label: string;
  slug: string;
  helpText: string | null;
  displayType: string;
  isRequired: boolean;
  allowMultiple: boolean;
  /** The builder shows hidden steps; the storefront never receives them. */
  isVisible: boolean;
  sortOrder: number;
  choices: Array<{
    id: number;
    /** Set when the choice only applies under another — a colour under its material. */
    parentChoiceId: number | null;
    label: string;
    value: string;
    priceDelta: number;
    imageUrl: string | null;
    swatchColor: string | null;
    sku: string | null;
    description: string | null;
    isDefault: boolean;
    sortOrder: number;
  }>;
};

/**
 * Every option a shopper answers for this product: the ones defined on it, plus
 * the global groups that apply to the whole catalogue.
 */
export async function readOptionsForProduct(
  productId: number,
  { visibleOnly = true }: { visibleOnly?: boolean } = {}
): Promise<OptionGroupWithChoices[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const groupWhere = visibleOnly
      ? and(
          or(
            eq(productOptionGroups.productId, productId),
            isNull(productOptionGroups.productId)
          ),
          eq(productOptionGroups.isVisible, "true")
        )
      : or(
          eq(productOptionGroups.productId, productId),
          isNull(productOptionGroups.productId)
        );

    const groups = await db
      .select()
      .from(productOptionGroups)
      .where(groupWhere)
      .orderBy(asc(productOptionGroups.sortOrder), asc(productOptionGroups.id));
    if (groups.length === 0) return [];

    const groupIds = groups.map(group => group.id);
    const choiceWhere = visibleOnly
      ? and(
          inArray(productOptionChoices.groupId, groupIds),
          eq(productOptionChoices.isVisible, "true")
        )
      : inArray(productOptionChoices.groupId, groupIds);

    const choices = await db
      .select()
      .from(productOptionChoices)
      .where(choiceWhere)
      .orderBy(
        asc(productOptionChoices.sortOrder),
        asc(productOptionChoices.id)
      );

    const byGroup = new Map<number, OptionGroupWithChoices["choices"]>();
    for (const choice of choices) {
      const list = byGroup.get(choice.groupId) ?? [];
      list.push({
        id: choice.id,
        parentChoiceId: choice.parentChoiceId,
        label: choice.label,
        value: choice.value,
        priceDelta: choice.priceDelta,
        imageUrl: choice.imageUrl,
        swatchColor: choice.swatchColor,
        sku: choice.sku,
        description: choice.description,
        isDefault: choice.isDefault === "true",
        sortOrder: choice.sortOrder,
      });
      byGroup.set(choice.groupId, list);
    }

    return groups.map(group => ({
      id: group.id,
      productId: group.productId,
      label: group.label,
      slug: group.slug,
      helpText: group.helpText,
      displayType: group.displayType,
      isRequired: group.isRequired === "true",
      allowMultiple: group.allowMultiple === "true",
      isVisible: group.isVisible === "true",
      sortOrder: group.sortOrder,
      choices: byGroup.get(group.id) ?? [],
    }));
  } catch (error) {
    console.warn("[Catalog] Product options unavailable.", error);
    return [];
  }
}

/**
 * The Custom Studio's steps.
 *
 * These are the global option groups — the rows with no `productId` — read in
 * their own right rather than as an appendix to a product. The storefront's
 * step-by-step configurator is exactly this list, in this order, which is what
 * makes the studio editable at all: it is catalogue data, not page code.
 */
export async function readStudioSteps({
  visibleOnly = true,
}: { visibleOnly?: boolean } = {}): Promise<OptionGroupWithChoices[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const isStudioStep = and(
      isNull(productOptionGroups.productId),
      like(productOptionGroups.slug, `${STUDIO_SLUG_PREFIX}%`)
    );
    const groupWhere = visibleOnly
      ? and(isStudioStep, eq(productOptionGroups.isVisible, "true"))
      : isStudioStep;

    const groups = await db
      .select()
      .from(productOptionGroups)
      .where(groupWhere)
      .orderBy(asc(productOptionGroups.sortOrder), asc(productOptionGroups.id));
    if (groups.length === 0) return [];

    const groupIds = groups.map(group => group.id);
    const choiceWhere = visibleOnly
      ? and(
          inArray(productOptionChoices.groupId, groupIds),
          eq(productOptionChoices.isVisible, "true")
        )
      : inArray(productOptionChoices.groupId, groupIds);

    const choices = await db
      .select()
      .from(productOptionChoices)
      .where(choiceWhere)
      .orderBy(
        asc(productOptionChoices.sortOrder),
        asc(productOptionChoices.id)
      );

    const byGroup = new Map<number, OptionGroupWithChoices["choices"]>();
    for (const choice of choices) {
      const list = byGroup.get(choice.groupId) ?? [];
      list.push({
        id: choice.id,
        parentChoiceId: choice.parentChoiceId,
        label: choice.label,
        value: choice.value,
        priceDelta: choice.priceDelta,
        imageUrl: choice.imageUrl,
        swatchColor: choice.swatchColor,
        sku: choice.sku,
        description: choice.description,
        isDefault: choice.isDefault === "true",
        sortOrder: choice.sortOrder,
      });
      byGroup.set(choice.groupId, list);
    }

    return groups.map(group => ({
      id: group.id,
      productId: group.productId,
      label: group.label,
      slug: group.slug,
      helpText: group.helpText,
      displayType: group.displayType,
      isRequired: group.isRequired === "true",
      allowMultiple: group.allowMultiple === "true",
      isVisible: group.isVisible === "true",
      sortOrder: group.sortOrder,
      choices: byGroup.get(group.id) ?? [],
    }));
  } catch (error) {
    console.warn("[Catalog] Custom Studio steps unavailable.", error);
    return [];
  }
}

/**
 * The admin builder behind Catalog -> Product options: define the questions a
 * shopper answers on a product page and what each answer does to the price.
 */
export const productOptionsRouter = router({
  /** Everything for one product, hidden groups included, for the builder. */
  forProduct: adminProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(({ input }) =>
      readOptionsForProduct(input.productId, { visibleOnly: false })
    ),

  /** The Custom Studio's steps, hidden ones included, for its builder. */
  studioSteps: adminProcedure.query(() =>
    readStudioSteps({ visibleOnly: false })
  ),

  /**
   * Create the steps the storefront was hard-coded with.
   *
   * Refuses once anything global exists rather than merging: a second run has
   * no way to tell an owner's edit from a missing row, and quietly restoring a
   * fabric somebody deleted on purpose is worse than doing nothing at all.
   */
  seedStudio: adminProcedure.mutation(async ({ ctx }) => {
    const db = await requireDb();

    const existing = await db
      .select({ id: productOptionGroups.id })
      .from(productOptionGroups)
      .where(
        and(
          isNull(productOptionGroups.productId),
          like(productOptionGroups.slug, `${STUDIO_SLUG_PREFIX}%`)
        )
      );

    if (existing.length > 0) {
      const populated = await db
        .select({ groupId: productOptionChoices.groupId })
        .from(productOptionChoices)
        .where(
          inArray(
            productOptionChoices.groupId,
            existing.map(group => group.id)
          )
        )
        .limit(1);

      // A studio the owner has actually filled in is never overwritten.
      if (populated.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "The Custom Studio already has steps. Delete them first to start over.",
        });
      }

      // Steps with no options at all are the debris of a run that died part
      // way. Clearing them is the difference between a retry that works and an
      // owner locked out of their own studio by a half-write.
      await db.delete(productOptionGroups).where(
        inArray(
          productOptionGroups.id,
          existing.map(group => group.id)
        )
      );
    }

    let steps = 0;
    let options = 0;

    // All or nothing: a run that fails on the third step used to leave two
    // steps standing with no options, and the guard above then refused to
    // retry — the owner was locked out of their own studio by a half-write.
    await db.transaction(async tx => {
      for (const [index, step] of STUDIO_STEPS.entries()) {
        const inserted = await tx.insert(productOptionGroups).values({
          productId: null,
          label: step.label,
          slug: step.slug,
          helpText: step.helpText,
          displayType: step.displayType,
          isRequired: "true",
          allowMultiple: "false",
          isVisible: "true",
          sortOrder: index,
        });
        const groupId = Number(inserted[0].insertId);
        steps += 1;

        for (const [position, choice] of step.choices.entries()) {
          await tx.insert(productOptionChoices).values({
            groupId,
            label: choice.label,
            value: choice.value,
            priceDelta: choice.priceDelta,
            imageUrl: choice.imageUrl ?? null,
            swatchColor: choice.swatchColor ?? null,
            description: choice.description ?? null,
            isDefault: choice.isDefault ? "true" : "false",
            isVisible: "true",
            sortOrder: position,
          });
          options += 1;
        }
      }
    });

    await audit(ctx.user.id, "studio.seed", undefined, { steps, options });

    return { steps, options };
  }),

  /** Groups shared by the whole catalogue. */
  /**
   * The questions every product inherits, with how many answers each offers.
   *
   * The count is what makes this useful before a product exists: the add form
   * can tell the owner exactly what a new piece will already be configurable
   * with, instead of implying they have to build it themselves.
   */
  globalGroups: adminProcedure.query(async () => {
    const db = await requireDb();
    const groups = await db
      .select()
      .from(productOptionGroups)
      .where(isNull(productOptionGroups.productId))
      .orderBy(asc(productOptionGroups.sortOrder), asc(productOptionGroups.id));
    if (groups.length === 0) return [];

    const counts = await db
      .select({
        groupId: productOptionChoices.groupId,
        total: sql<number>`count(*)`,
      })
      .from(productOptionChoices)
      .where(
        and(
          inArray(
            productOptionChoices.groupId,
            groups.map(group => group.id)
          ),
          eq(productOptionChoices.isVisible, "true")
        )
      )
      .groupBy(productOptionChoices.groupId);

    const totalByGroup = new Map(
      counts.map(row => [row.groupId, Number(row.total)])
    );
    return groups.map(group => ({
      ...group,
      choiceCount: totalByGroup.get(group.id) ?? 0,
    }));
  }),

  saveGroup: adminProcedure
    .input(groupPayload.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, ...group } = input;

      if (group.productId !== null) {
        const [owner] = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.id, group.productId))
          .limit(1);
        if (!owner)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That product no longer exists.",
          });
      }

      // A slug is what a cart line stores, so two groups sharing one on the
      // same product would make an order impossible to read back.
      const clash = await db
        .select({ id: productOptionGroups.id })
        .from(productOptionGroups)
        .where(
          and(
            eq(productOptionGroups.slug, group.slug),
            group.productId === null
              ? isNull(productOptionGroups.productId)
              : eq(productOptionGroups.productId, group.productId)
          )
        );
      if (clash.some(row => row.id !== id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Another option on this product already uses the name "${group.slug}".`,
        });
      }

      if (id) {
        await db
          .update(productOptionGroups)
          .set(group)
          .where(eq(productOptionGroups.id, id));
        await audit(ctx.user.id, "option.group_updated", id, {
          label: group.label,
        });
        return { id };
      }
      const result = await db.insert(productOptionGroups).values(group);
      const createdId = Number(result[0].insertId);
      await audit(ctx.user.id, "option.group_created", createdId, {
        label: group.label,
      });
      return { id: createdId };
    }),

  deleteGroup: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db
        .delete(productOptionChoices)
        .where(eq(productOptionChoices.groupId, input.id));
      await db
        .delete(productOptionGroups)
        .where(eq(productOptionGroups.id, input.id));
      await audit(ctx.user.id, "option.group_deleted", input.id);
      return { success: true };
    }),

  saveChoice: adminProcedure
    .input(choicePayload.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, ...choice } = input;

      const [group] = await db
        .select()
        .from(productOptionGroups)
        .where(eq(productOptionGroups.id, choice.groupId))
        .limit(1);
      if (!group)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That option group no longer exists.",
        });

      const siblings = await db
        .select({
          id: productOptionChoices.id,
          value: productOptionChoices.value,
        })
        .from(productOptionChoices)
        .where(eq(productOptionChoices.groupId, choice.groupId));
      if (siblings.some(row => row.value === choice.value && row.id !== id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This option already has a choice named "${choice.value}".`,
        });
      }

      if (id) {
        await db
          .update(productOptionChoices)
          .set(choice)
          .where(eq(productOptionChoices.id, id));
      } else {
        const result = await db.insert(productOptionChoices).values(choice);
        await audit(
          ctx.user.id,
          "option.choice_created",
          Number(result[0].insertId),
          { label: choice.label }
        );
      }

      // Only one default per single-answer group, or the storefront has to pick
      // arbitrarily between them on first render.
      if (choice.isDefault === "true" && group.allowMultiple === "false") {
        const keepId = id ?? null;
        for (const sibling of siblings) {
          if (sibling.id === keepId) continue;
          await db
            .update(productOptionChoices)
            .set({ isDefault: "false" })
            .where(eq(productOptionChoices.id, sibling.id));
        }
      }

      return { success: true };
    }),

  deleteChoice: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db
        .delete(productOptionChoices)
        .where(eq(productOptionChoices.id, input.id));
      await audit(ctx.user.id, "option.choice_deleted", input.id);
      return { success: true };
    }),

  /**
   * Applies a ready-made question set — the standard sectional sofa options,
   * say — in one go, so listing a product does not start with twenty minutes
   * of typing the same fields.
   *
   * Existing options are left alone and any slug that already exists is
   * skipped, so applying a preset twice cannot duplicate or overwrite work.
   */
  applyPreset: adminProcedure
    .input(
      z.object({
        productId: z.number().int().positive(),
        presetId: z.string().max(40),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const preset = findPreset(input.presetId);
      if (!preset)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That option preset does not exist.",
        });

      const [owner] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);
      if (!owner)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That product no longer exists.",
        });

      const existing = await db
        .select({
          slug: productOptionGroups.slug,
          sortOrder: productOptionGroups.sortOrder,
        })
        .from(productOptionGroups)
        .where(eq(productOptionGroups.productId, input.productId));
      const takenSlugs = new Set(existing.map(row => row.slug));
      let sortOrder = existing.reduce(
        (highest, row) => Math.max(highest, row.sortOrder + 1),
        0
      );

      const added: string[] = [];
      const skipped: string[] = [];

      for (const group of preset.groups) {
        if (takenSlugs.has(group.slug)) {
          skipped.push(group.label);
          continue;
        }

        const result = await db.insert(productOptionGroups).values({
          productId: input.productId,
          label: group.label,
          slug: group.slug,
          helpText: group.helpText ?? null,
          displayType: group.displayType,
          isRequired: group.isRequired ? "true" : "false",
          allowMultiple: "false",
          isVisible: "true",
          sortOrder: sortOrder++,
        });
        const groupId = Number(result[0].insertId);

        for (const [index, choice] of group.choices.entries()) {
          await db.insert(productOptionChoices).values({
            groupId,
            label: choice.label,
            value: choice.value,
            // A preset never guesses a price: the owner sets what an upgrade costs.
            priceDelta: 0,
            swatchColor: choice.swatchColor ?? null,
            description: choice.description ?? null,
            // First choice is the default, so the page opens on a valid price.
            isDefault: index === 0 ? "true" : "false",
            isVisible: "true",
            sortOrder: index,
          });
        }

        added.push(group.label);
      }

      await audit(ctx.user.id, "option.preset_applied", input.productId, {
        preset: preset.id,
        added,
        skipped,
      });
      return { added, skipped };
    }),

  /** Persist a reordering from the builder in one round trip. */
  reorderGroups: adminProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).max(60) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      for (const [index, id] of input.ids.entries()) {
        await db
          .update(productOptionGroups)
          .set({ sortOrder: index })
          .where(eq(productOptionGroups.id, id));
      }
      return { success: true };
    }),

  reorderChoices: adminProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).max(200) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      for (const [index, id] of input.ids.entries()) {
        await db
          .update(productOptionChoices)
          .set({ sortOrder: index })
          .where(eq(productOptionChoices.id, id));
      }
      return { success: true };
    }),
});

/** What the storefront Custom Studio calls to build its steps. */
export const publicStudioStepsProcedure = publicProcedure.query(() =>
  readStudioSteps()
);

/** What the storefront product page calls to build its configurator. */
export const publicProductOptionsProcedure = publicProcedure
  .input(z.object({ productId: z.number().int().positive() }))
  .query(({ input }) => readOptionsForProduct(input.productId));
