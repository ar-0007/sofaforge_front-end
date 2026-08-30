import type { PixelDispatchResult } from "./types";

const TIMEOUT_MS = 6_000;

/** Strips keys the platforms reject as empty, so payloads stay minimal. */
export function dropEmpty(record: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

/**
 * Shared POST for every server-side pixel.
 *
 * Tracking must never take a checkout down with it, so a network failure,
 * timeout or platform rejection resolves to `ok: false` instead of throwing.
 */
export async function post(
  provider: "meta" | "tiktok",
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<PixelDispatchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      return { provider, ok: false, message: extractMessage(text) ?? `${provider} returned HTTP ${response.status}.` };
    }
    // TikTok answers 200 with a non-zero `code` when it rejects an event.
    const parsed = safeJson(text);
    if (parsed && typeof parsed.code === "number" && parsed.code !== 0) {
      return { provider, ok: false, message: String(parsed.message ?? `${provider} rejected the event.`) };
    }
    return { provider, ok: true };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      provider,
      ok: false,
      message: aborted ? `${provider} did not respond in time.` : `${provider} could not be reached.`,
    };
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Platform errors nest the useful sentence differently; find it either way. */
function extractMessage(text: string): string | null {
  const parsed = safeJson(text);
  if (!parsed) return null;
  const error = parsed.error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  if (typeof parsed.message === "string") return parsed.message;
  return null;
}
