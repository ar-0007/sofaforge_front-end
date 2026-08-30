import { createHash } from "node:crypto";

/**
 * Both Meta and TikTok require personal identifiers to arrive as lowercase,
 * trimmed, SHA-256 hex. Sending a raw email is a privacy breach and the
 * platforms reject it, so every identifier goes through here.
 */
export function hashIdentifier(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  if (!normalised) return undefined;
  return createHash("sha256").update(normalised).digest("hex");
}

/** Phone numbers hash without punctuation or a leading +, digits only. */
export function hashPhone(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D+/g, "");
  if (!digits) return undefined;
  return createHash("sha256").update(digits).digest("hex");
}
