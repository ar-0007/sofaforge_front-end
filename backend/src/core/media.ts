/**
 * Local media storage.
 *
 * The owner is not a developer: they have photographs on a phone or a laptop,
 * not URLs. So images are uploaded straight into the app and served back from
 * it — no S3 account, no CDN sign-up, nothing to configure before the shop can
 * have pictures. Files live in one folder on disk (UPLOAD_DIR, `uploads/` next
 * to the backend by default) and are served read-only under `/api/uploads/`,
 * which is already the path a gateway/proxy forwards to this process.
 */

import express, { type Express } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

/** Everything a browser can display, and nothing it can execute. */
const ACCEPTED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
]);

/** 12 MB of decoded bytes. The admin downsizes before sending, so this is a guard, not a budget. */
const MAX_BYTES = 12 * 1024 * 1024;

export const UPLOAD_URL_PREFIX = "/api/uploads";

export function uploadDir(): string {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), "uploads");
}

/**
 * An image reference the admin may store: an uploaded file, an absolute
 * http(s) URL (imported catalogues still carry those), or a site-relative
 * path. `z.string().url()` alone would reject our own uploads.
 */
export const imageRef = z
  .string()
  .max(2048)
  .refine(
    value => value === "" || /^https?:\/\//i.test(value) || value.startsWith("/"),
    { message: "Enter an uploaded image or a link starting with http:// or https://" },
  );

function safeStem(fileName: string): string {
  const stem = path.basename(fileName).replace(/\.[^.]+$/, "");
  const slug = stem
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "image";
}

export type SavedImage = { url: string; fileName: string; bytes: number };

/**
 * Writes a browser `data:` URL to disk and returns the path the storefront
 * should use. The caller is responsible for authorisation.
 */
export async function saveDataUrl(dataUrl: string, originalName: string): Promise<SavedImage> {
  const match = /^data:([a-z0-9/+.-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) throw new Error("That file could not be read as an image.");

  const [, mime, base64] = match;
  const extension = ACCEPTED.get(mime.toLowerCase());
  if (!extension) {
    throw new Error("Only JPG, PNG, WEBP, AVIF and GIF images can be uploaded.");
  }

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) throw new Error("That file is empty.");
  if (bytes.length > MAX_BYTES) {
    throw new Error(`That image is larger than ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`);
  }

  const directory = uploadDir();
  await fs.mkdir(directory, { recursive: true });

  const fileName = `${safeStem(originalName)}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}.${extension}`;
  await fs.writeFile(path.join(directory, fileName), bytes);

  return { url: `${UPLOAD_URL_PREFIX}/${fileName}`, fileName, bytes: bytes.length };
}

/** Newest first — the library picker only ever shows a recent page of these. */
export async function listUploads(limit = 60): Promise<Array<{ url: string; fileName: string; uploadedAt: Date }>> {
  const directory = uploadDir();
  let names: string[];
  try {
    names = await fs.readdir(directory);
  } catch {
    return [];
  }

  const extensions = new Set(ACCEPTED.values());
  const entries = await Promise.all(
    names
      .filter(name => extensions.has(path.extname(name).slice(1).toLowerCase()))
      .map(async name => {
        try {
          const stat = await fs.stat(path.join(directory, name));
          return { url: `${UPLOAD_URL_PREFIX}/${name}`, fileName: name, uploadedAt: stat.mtime };
        } catch {
          return null;
        }
      }),
  );

  return entries
    .filter((entry): entry is { url: string; fileName: string; uploadedAt: Date } => entry !== null)
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .slice(0, limit);
}

/** Serves the upload folder read-only. Registered before the SPA catch-all. */
export function registerUploadRoutes(app: Express) {
  app.use(
    UPLOAD_URL_PREFIX,
    express.static(uploadDir(), {
      index: false,
      dotfiles: "deny",
      fallthrough: false,
      maxAge: "365d",
      immutable: true,
    }),
  );
}
