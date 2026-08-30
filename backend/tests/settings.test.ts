import { describe, expect, it } from "vitest";
import {
  PUBLIC_SETTING_KEYS,
  SECRET_MASK,
  SETTING_FIELDS,
  defaultSettings,
  fieldsInGroup,
  sectionsInGroup,
  validateSetting,
} from "@shared/settings/registry";
import { SettingsValidationError, screenWrites } from "../src/modules/settings/settings.service";

describe("settings registry", () => {
  it("never exposes a secret through the public key list", () => {
    const secretKeys = SETTING_FIELDS.filter(field => field.secret).map(field => field.key);
    expect(secretKeys.length).toBeGreaterThan(0);
    for (const key of secretKeys) {
      expect(PUBLIC_SETTING_KEYS).not.toContain(key);
    }
  });

  it("keeps every key unique so one field cannot shadow another", () => {
    const keys = SETTING_FIELDS.map(field => field.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("groups fields into sections in declaration order", () => {
    expect(sectionsInGroup("marketing")[0]).toBe("Meta - Facebook & Instagram");
    expect(fieldsInGroup("marketing").every(field => field.group === "marketing")).toBe(true);
  });

  it("supplies defaults for the fields that declare one", () => {
    const defaults = defaultSettings();
    expect(defaults["checkout.currency"]).toBe("CAD");
    expect(defaults["meta.enabled"]).toBe("false");
  });
});

describe("validateSetting", () => {
  it("accepts a well-formed Meta pixel id and rejects a malformed one", () => {
    expect(validateSetting("meta.pixelId", "1234567890123456")).toBeNull();
    expect(validateSetting("meta.pixelId", "not-a-pixel")).toMatch(/6-32 digits/);
  });

  it("accepts a well-formed TikTok pixel code and rejects punctuation", () => {
    expect(validateSetting("tiktok.pixelCode", "C1A2B3C4D5E6F7G8H9")).toBeNull();
    expect(validateSetting("tiktok.pixelCode", "bad code!")).toMatch(/letters, digits/);
  });

  it("holds GA4 and Google Ads ids to their documented prefixes", () => {
    expect(validateSetting("google.ga4MeasurementId", "G-ABCD1234")).toBeNull();
    expect(validateSetting("google.ga4MeasurementId", "UA-12345-1")).toMatch(/G-/);
    expect(validateSetting("google.adsConversionId", "AW-123456789")).toBeNull();
  });

  it("treats an empty value as clearing the setting, never as invalid", () => {
    expect(validateSetting("meta.pixelId", "")).toBeNull();
    expect(validateSetting("store.supportEmail", "")).toBeNull();
  });

  it("rejects values that are not what the field type promises", () => {
    expect(validateSetting("meta.enabled", "yes")).toMatch(/true or false/);
    expect(validateSetting("checkout.flatShipping", "free")).toMatch(/number/);
    expect(validateSetting("checkout.currency", "XYZ")).toMatch(/one of the listed options/);
    expect(validateSetting("store.supportEmail", "not-an-email")).toMatch(/valid email/);
    expect(validateSetting("store.instagram", "instagram.com/sofaco")).toMatch(/http/);
  });

  it("refuses a key that is not in the registry", () => {
    expect(validateSetting("meta.secretBackdoor", "1")).toMatch(/Unknown setting/);
  });
});

describe("screenWrites", () => {
  it("drops a secret that came back as the mask, so an untouched token survives a save", () => {
    const accepted = screenWrites([
      { key: "meta.capiToken", value: SECRET_MASK },
      { key: "meta.pixelId", value: "1234567890123456" },
    ]);
    expect(accepted).toEqual([{ key: "meta.pixelId", value: "1234567890123456" }]);
  });

  it("keeps a genuinely retyped secret", () => {
    const accepted = screenWrites([{ key: "meta.capiToken", value: "EAAG-real-token" }]);
    expect(accepted).toEqual([{ key: "meta.capiToken", value: "EAAG-real-token" }]);
  });

  it("keeps an emptied secret, which is how a token is removed", () => {
    expect(screenWrites([{ key: "tiktok.accessToken", value: "" }])).toEqual([
      { key: "tiktok.accessToken", value: "" },
    ]);
  });

  it("rejects the whole batch when any single value is invalid", () => {
    expect(() =>
      screenWrites([
        { key: "meta.pixelId", value: "1234567890123456" },
        { key: "tiktok.pixelCode", value: "!!!" },
      ]),
    ).toThrow(SettingsValidationError);
  });

  it("trims incidental whitespace off a pasted id", () => {
    expect(screenWrites([{ key: "meta.pixelId", value: "  1234567890123456  " }])).toEqual([
      { key: "meta.pixelId", value: "1234567890123456" },
    ]);
  });
});
