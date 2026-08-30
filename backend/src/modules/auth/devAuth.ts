import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../../core/cookies";
import { sdk } from "../../core/sdk";
import * as db from "../../db";

/**
 * Local email + password login for development.
 *
 * The real login is Manus OAuth, which is not reachable from a local machine,
 * and the `users` table has no password column yet. This route fills that gap
 * so the dashboard is usable locally: it checks the credentials against two env
 * vars, upserts an admin row, and issues the same session JWT the OAuth
 * callback would.
 *
 * It is OFF in production. Replace it once the real auth decision is made
 * (see ARCHITECTURE.md section 8).
 */

const DEFAULT_EMAIL = "admin@sofaco.local";
const DEFAULT_PASSWORD = "sofa-admin";

export function isDevLoginEnabled() {
  if (process.env.ALLOW_DEV_LOGIN === "true") return true;
  if (process.env.ALLOW_DEV_LOGIN === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function devCredentials() {
  return {
    email: (process.env.DEV_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase(),
    password: process.env.DEV_ADMIN_PASSWORD ?? DEFAULT_PASSWORD,
    openId: process.env.OWNER_OPEN_ID ?? "admin-local",
    name: process.env.DEV_ADMIN_NAME ?? "Sofa Co. Admin",
  };
}

async function handleLogin(req: Request, res: Response) {
  if (!isDevLoginEnabled()) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const expected = devCredentials();

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  if (email !== expected.email || password !== expected.password) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  try {
    await db.upsertUser({
      openId: expected.openId,
      name: expected.name,
      email: expected.email,
      loginMethod: "local",
      role: "admin",
      lastSignedIn: new Date(),
    });

    const user = await db.getUserByOpenId(expected.openId);
    if (!user) {
      res.status(500).json({ error: "Could not create the admin user. Is the database running?" });
      return;
    }

    const token = await sdk.signSession(
      { openId: user.openId, appId: process.env.VITE_APP_ID ?? "", name: user.name ?? expected.name },
      { expiresInMs: ONE_YEAR_MS }
    );

    res.cookie(COOKIE_NAME, token, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });

    res.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      // Returned so a browser that blocks cookies can mirror it into
      // sessionStorage, the same fallback the OAuth flow uses.
      sessionToken: token,
    });
  } catch (error) {
    console.error("[dev-login]", error);
    res.status(500).json({ error: "Login failed. Check the API logs." });
  }
}

export function registerDevAuthRoutes(app: Express) {
  // Lets the login page tell the user whether this route is even available.
  app.get("/api/auth/dev-login", (_req, res) => {
    res.json({ enabled: isDevLoginEnabled(), email: isDevLoginEnabled() ? devCredentials().email : undefined });
  });

  app.post("/api/auth/dev-login", handleLogin);

  app.post("/api/auth/dev-logout", (req, res) => {
    const options = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...options, maxAge: -1 });
    res.json({ ok: true });
  });
}
