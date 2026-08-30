import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Optional: serve the built frontend from the API process.
 *
 * The frontend is a separate app with its own dev/preview server, so this is
 * OFF by default. Enable it only for single-container deployments by setting
 * SERVE_STATIC=true (and optionally STATIC_DIR).
 */
export function serveStatic(app: Express) {
  const distPath = process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : path.resolve(import.meta.dirname, "../../../frontend/dist");

  if (!fs.existsSync(distPath)) {
    console.error(
      `[static] Build directory not found: ${distPath}. Run "pnpm --filter frontend build" first.`
    );
    return;
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
