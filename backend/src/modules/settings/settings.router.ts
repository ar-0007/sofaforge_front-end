import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SETTING_FIELDS } from "@shared/settings/registry";
import { getDb } from "../../db";
import { adminAuditLogs } from "../../db/schema";
import { testMetaConnection } from "../../integrations/pixels/facebook-capi";
import { testTikTokConnection } from "../../integrations/pixels/tiktok-events";
import { adminProcedure, publicProcedure, router } from "../../core/trpc";
import {
  SettingsValidationError,
  readPublicSettings,
  readSettings,
  readSettingsForAdmin,
  saveSettings,
} from "./settings.service";

const SETTING_KEYS = SETTING_FIELDS.map(field => field.key) as [string, ...string[]];

export const settingsRouter = router({
  /**
   * Everything the storefront is allowed to know: pixel IDs, store identity,
   * shipping rules. Secrets are filtered out in the service, not here, so a
   * new secret field can never leak by someone forgetting to update a list.
   */
  public: publicProcedure.query(() => readPublicSettings()),

  /** The admin Settings screens. Secrets read back as a mask. */
  all: adminProcedure.query(() => readSettingsForAdmin()),

  save: adminProcedure
    .input(
      z.object({
        entries: z
          .array(z.object({ key: z.enum(SETTING_KEYS), value: z.string().max(4000) }))
          .min(1)
          .max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await saveSettings(ctx.user.id, input.entries);
        const db = await getDb();
        if (db && result.saved.length > 0) {
          await db.insert(adminAuditLogs).values({
            adminUserId: ctx.user.id,
            action: "settings.updated",
            entityType: "storeSetting",
            // Keys only. A secret's value must never reach the audit log.
            metadata: JSON.stringify({ keys: result.saved }),
          });
        }
        return result;
      } catch (error) {
        if (error instanceof SettingsValidationError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        throw error;
      }
    }),

  /**
   * Sends one throwaway event to each connected platform so the owner sees a
   * green tick instead of waiting on real traffic to find a typo'd token.
   */
  testPixels: adminProcedure
    .input(z.object({ provider: z.enum(["meta", "tiktok", "all"]).default("all") }).optional())
    .mutation(async ({ input }) => {
      const settings = await readSettings();
      const provider = input?.provider ?? "all";
      const checks = [];
      if (provider === "meta" || provider === "all") checks.push(testMetaConnection(settings));
      if (provider === "tiktok" || provider === "all") checks.push(testTikTokConnection(settings));
      return Promise.all(checks);
    }),

  /** Which platforms are configured well enough to fire, for the admin status strip. */
  connectionStatus: adminProcedure.query(async () => {
    const settings = await readSettings();
    return [
      {
        provider: "meta" as const,
        label: "Meta (Facebook & Instagram)",
        enabled: settings["meta.enabled"] === "true",
        browserReady: Boolean(settings["meta.pixelId"]),
        serverReady: Boolean(settings["meta.capiToken"]),
        testMode: Boolean(settings["meta.testEventCode"]),
      },
      {
        provider: "tiktok" as const,
        label: "TikTok",
        enabled: settings["tiktok.enabled"] === "true",
        browserReady: Boolean(settings["tiktok.pixelCode"]),
        serverReady: Boolean(settings["tiktok.accessToken"]),
        testMode: Boolean(settings["tiktok.testEventCode"]),
      },
      {
        provider: "google" as const,
        label: "Google Analytics & Ads",
        enabled: settings["google.enabled"] === "true",
        browserReady: Boolean(settings["google.ga4MeasurementId"] || settings["google.adsConversionId"]),
        serverReady: false,
        testMode: false,
      },
      {
        provider: "snapchat" as const,
        label: "Snapchat",
        enabled: settings["snapchat.enabled"] === "true",
        browserReady: Boolean(settings["snapchat.pixelId"]),
        serverReady: false,
        testMode: false,
      },
      {
        provider: "pinterest" as const,
        label: "Pinterest",
        enabled: settings["pinterest.enabled"] === "true",
        browserReady: Boolean(settings["pinterest.tagId"]),
        serverReady: false,
        testMode: false,
      },
    ];
  }),
});
