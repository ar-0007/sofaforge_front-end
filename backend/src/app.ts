import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./core/oauth";
import { registerStorageProxy } from "./core/storageProxy";
import { registerUploadRoutes } from "./core/media";
import { createContext } from "./core/context";
import { serveStatic } from "./core/static";
import { appRouter } from "./modules/app.router";
import { registerDevAuthRoutes } from "./modules/auth/devAuth";

/**
 * Builds the Express app. No frontend knowledge lives here — the API only
 * speaks HTTP, so the frontend can be deployed and scaled independently.
 */
export function createApp() {
  const app = express();

  // Larger body limit for file uploads.
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Allow the separately-hosted frontend to call the API with cookies.
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "content-type,authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Uploaded product photography, served straight from disk.
  registerUploadRoutes(app);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerDevAuthRoutes(app);

  // All API routes start with /api/ so a gateway can route them.
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  if (process.env.SERVE_STATIC === "true") {
    serveStatic(app);
  }

  return app;
}
