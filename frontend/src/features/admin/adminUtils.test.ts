import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_STATUS_TONE, databaseIsReady, parseGallery, slugify } from "./adminUtils";

describe("slugify", () => {
  it("turns a product name into a URL-safe slug", () => {
    expect(slugify("Stanton XL Sectional")).toBe("stanton-xl-sectional");
  });

  it("collapses punctuation and trims the dashes it leaves behind", () => {
    expect(slugify('  40" Comfy Depth — Luxe!  ')).toBe("40-comfy-depth-luxe");
  });

  it("stays inside the column length the backend accepts", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("parseGallery", () => {
  it("reads the JSON array the admin writes", () => {
    expect(parseGallery('["https://a.jpg","https://b.jpg"]')).toEqual(["https://a.jpg", "https://b.jpg"]);
  });

  it("falls back to newline-separated URLs, which older rows stored", () => {
    expect(parseGallery("https://a.jpg\n  https://b.jpg  \n\n")).toEqual(["https://a.jpg", "https://b.jpg"]);
  });

  it("returns an empty list rather than throwing on a null or malformed value", () => {
    expect(parseGallery(null)).toEqual([]);
    expect(parseGallery("")).toEqual([]);
    expect(parseGallery("{not json")).toEqual(["{not json"]);
  });

  it("drops non-string entries so a bad row cannot render as [object Object]", () => {
    expect(parseGallery('["https://a.jpg", 42, null]')).toEqual(["https://a.jpg"]);
  });
});

describe("databaseIsReady", () => {
  it("is true only when every query resolved with data", () => {
    expect(databaseIsReady([{ data: [] }, { data: {} }])).toBe(true);
  });

  it("is false while a query is still loading", () => {
    expect(databaseIsReady([{ data: [] }, {}])).toBe(false);
  });

  it("is false when any query errored, even if the others succeeded", () => {
    expect(databaseIsReady([{ data: [] }, { data: [], error: new Error("down") }])).toBe(false);
  });
});

describe("order status tones", () => {
  it("assigns a tone to every status the backend can return", () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_TONE[status]).toBeTruthy();
    }
  });

  it("marks delivered as success and cancelled as danger", () => {
    expect(ORDER_STATUS_TONE.delivered).toBe("success");
    expect(ORDER_STATUS_TONE.cancelled).toBe("danger");
  });
});
