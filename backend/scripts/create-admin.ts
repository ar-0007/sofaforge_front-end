/**
 * Creates (or promotes) a local admin user and mints a session JWT for it.
 * Usage: tsx create-admin.ts [openId] [email] [name]
 */
import "../src/core/loadEnv";
import mysql from "mysql2/promise";
import { SignJWT } from "jose";

async function main() {
  const openId = process.argv[2] ?? process.env.OWNER_OPEN_ID ?? "admin-local";
  const email = process.argv[3] ?? "admin@sofaco.local";
  const name = process.argv[4] ?? "Sofa Co. Admin";

  const appId = process.env.VITE_APP_ID ?? "";
  const secret = process.env.JWT_SECRET ?? "";
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!secret) throw new Error("JWT_SECRET is not set");
  if (!appId) throw new Error("VITE_APP_ID is not set");
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const conn = await mysql.createConnection(databaseUrl);
  await conn.execute(
    `INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
     VALUES (?, ?, ?, 'local', 'admin', NOW())
     ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email),
       loginMethod = VALUES(loginMethod), role = 'admin', lastSignedIn = NOW()`,
    [openId, name, email]
  );
  const [rows] = await conn.execute(
    "SELECT id, openId, name, email, role FROM users WHERE openId = ?",
    [openId]
  );
  await conn.end();

  // Same claim set + algorithm as SDKServer.signSession().
  const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
  const token = await new SignJWT({ openId, appId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(new TextEncoder().encode(secret));

  console.log(JSON.stringify({ user: (rows as any[])[0], sessionToken: token }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
