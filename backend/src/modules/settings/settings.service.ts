import { eq, inArray } from "drizzle-orm";
import {
  SECRET_MASK,
  defaultSettings,
  getSettingField,
  validateSetting,
  PUBLIC_SETTING_KEYS,
} from "@shared/settings/registry";
import { getDb } from "../../db";
import { storeSettings } from "../../db/schema";

export type SettingsMap = Record<string, string>;

/**
 * Settings are read on nearly every request that fires a pixel, so they are
 * cached in-process. The TTL is short enough that a save in the admin shows up
 * on the storefront within a minute, and `invalidateSettingsCache()` makes it
 * immediate for the process that did the saving.
 */
const CACHE_TTL_MS = 60_000;
let cache: { values: SettingsMap; loadedAt: number } | null = null;

export function invalidateSettingsCache() {
  cache = null;
}

/**
 * Every setting, defaults filled in, secrets included.
 * Server-side only — never hand this straight to a client.
 */
export async function readSettings(): Promise<SettingsMap> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.values;

  const values: SettingsMap = defaultSettings();
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(storeSettings);
      for (const row of rows) {
        // A stored empty string is a deliberate "clear this", so it wins over
        // the default. Only a NULL value falls back.
        if (row.value !== null) values[row.settingKey] = row.value;
      }
    } catch (error) {
      console.warn("[Settings] Falling back to defaults; the settings table is unavailable.", error);
    }
  }

  cache = { values, loadedAt: Date.now() };
  return values;
}

/** One secret value for server-side use (CAPI tokens). Empty string when unset. */
export async function readSecret(key: string): Promise<string> {
  const field = getSettingField(key);
  if (!field?.secret) throw new Error(`"${key}" is not a secret setting.`);
  const values = await readSettings();
  return values[key] ?? "";
}

/**
 * The subset the storefront may read without authentication: pixel IDs, store
 * identity, shipping rules. Secrets are excluded by construction — they are
 * filtered out of PUBLIC_SETTING_KEYS in the registry itself.
 */
export async function readPublicSettings(): Promise<SettingsMap> {
  const values = await readSettings();
  const publicValues: SettingsMap = {};
  for (const key of PUBLIC_SETTING_KEYS) {
    const value = values[key];
    if (value !== undefined && value !== "") publicValues[key] = value;
  }
  return publicValues;
}

export type AdminSettingsView = {
  values: SettingsMap;
  /** Keys whose secret is stored. The value itself is never returned. */
  secretsSet: string[];
};

/** What the admin Settings screens render from. Secrets read back as a mask. */
export async function readSettingsForAdmin(): Promise<AdminSettingsView> {
  const values = await readSettings();
  const view: SettingsMap = {};
  const secretsSet: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    const field = getSettingField(key);
    if (!field) continue; // a setting removed from the registry: ignore it
    if (field.secret) {
      if (value) {
        secretsSet.push(key);
        view[key] = SECRET_MASK;
      } else {
        view[key] = "";
      }
      continue;
    }
    view[key] = value;
  }

  return { values: view, secretsSet };
}

export type SettingWrite = { key: string; value: string };

export class SettingsValidationError extends Error {}

/**
 * Validates then upserts. Rejects the whole batch if any single value is bad,
 * so the owner never ends up with half a pixel configured.
 *
 * A secret arriving as the mask means "leave it as it is" and is dropped.
 */
export function screenWrites(entries: SettingWrite[]): SettingWrite[] {
  const accepted: SettingWrite[] = [];

  for (const entry of entries) {
    const field = getSettingField(entry.key);
    if (!field) throw new SettingsValidationError(`Unknown setting "${entry.key}".`);
    if (field.secret && entry.value === SECRET_MASK) continue;

    const value = field.type === "textarea" ? entry.value : entry.value.trim();
    const failure = validateSetting(entry.key, value);
    if (failure) throw new SettingsValidationError(failure);
    accepted.push({ key: entry.key, value });
  }

  return accepted;
}

export async function saveSettings(
  adminUserId: number,
  entries: SettingWrite[],
): Promise<{ saved: string[] }> {
  const accepted = screenWrites(entries);
  if (accepted.length === 0) return { saved: [] };

  const db = await getDb();
  if (!db) throw new SettingsValidationError("The database is not connected, so settings cannot be saved yet.");

  const keys = accepted.map(entry => entry.key);
  const existing = await db
    .select({ id: storeSettings.id, settingKey: storeSettings.settingKey })
    .from(storeSettings)
    .where(inArray(storeSettings.settingKey, keys));
  const existingByKey = new Map(existing.map(row => [row.settingKey, row.id]));

  for (const entry of accepted) {
    const field = getSettingField(entry.key)!;
    const existingId = existingByKey.get(entry.key);
    if (existingId) {
      await db
        .update(storeSettings)
        .set({ value: entry.value, settingGroup: field.group, isSecret: field.secret ? "true" : "false", updatedBy: adminUserId })
        .where(eq(storeSettings.id, existingId));
    } else {
      await db.insert(storeSettings).values({
        settingGroup: field.group,
        settingKey: entry.key,
        value: entry.value,
        isSecret: field.secret ? "true" : "false",
        updatedBy: adminUserId,
      });
    }
  }

  invalidateSettingsCache();
  return { saved: keys };
}

/** Whether a platform is switched on and carries the ID its pixel needs. */
export function isPlatformLive(values: SettingsMap, enabledKey: string, idKey: string): boolean {
  return values[enabledKey] === "true" && Boolean(values[idKey]);
}
