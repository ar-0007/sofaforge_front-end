import fs from "node:fs";
import type { PoolOptions } from "mysql2";

/**
 * Deliberately narrower than either driver's own SslOptions: mysql2 and
 * drizzle-kit each vendor their own version and the two disagree on fields
 * this code never sets (`cert`, `key`). Naming the two we do use keeps both
 * consumers happy without a cast.
 */
export type DbTlsOptions = { ca?: string; rejectUnauthorized: boolean };

export type DbPoolOptions = Omit<PoolOptions, "ssl"> & { ssl?: DbTlsOptions };

/**
 * Builds mysql2 connection options from DATABASE_URL.
 *
 * This exists because of a trap in how managed MySQL providers hand out
 * connection strings. Aiven prints its URI with `?ssl-mode=REQUIRED`, which is
 * *MySQL CLI* syntax — the Node driver does not recognise it, warns once, and
 * then connects in **plaintext**. Verified against the live service: with that
 * URI `SHOW SESSION STATUS LIKE 'Ssl_cipher'` comes back empty. So the URI is
 * parsed here and TLS is configured explicitly rather than trusted to a query
 * parameter.
 *
 * Aiven signs its servers with a per-project CA, not a publicly trusted root,
 * so Node's default trust store rejects it ("self-signed certificate in
 * certificate chain"). Supply that CA — download `ca.pem` from the Aiven
 * console — through one of:
 *
 *   DATABASE_CA_CERT       the PEM itself (Render env vars hold newlines fine;
 *                          literal "\n" sequences are also accepted)
 *   DATABASE_CA_CERT_PATH  a path to the .pem on disk
 *
 * Without a CA the connection is still encrypted, but the server's identity is
 * unverified — that stops passive eavesdropping, not an active
 * machine-in-the-middle. It is a stopgap, and it says so in the log.
 */

function readCaCert(): string | undefined {
  const inline = process.env.DATABASE_CA_CERT?.trim();
  if (inline) {
    // Some dashboards flatten pasted PEMs into a single line.
    return inline.includes("\n") ? inline.replace(/\n/g, "\n") : inline;
  }

  const file = process.env.DATABASE_CA_CERT_PATH?.trim();
  if (file) {
    try {
      return fs.readFileSync(file, "utf8");
    } catch (error) {
      console.error(`[db] DATABASE_CA_CERT_PATH is set but unreadable: ${file}`, error);
    }
  }

  return undefined;
}

export function poolOptionsFromUrl(databaseUrl: string): DbPoolOptions {
  const url = new URL(databaseUrl);

  const options: DbPoolOptions = {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };

  // Loopback needs no TLS and local MySQL usually cannot offer it.
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (isLocal && !url.searchParams.has("ssl")) return options;

  const ca = readCaCert();
  if (ca) {
    options.ssl = { ca, rejectUnauthorized: true };
  } else {
    options.ssl = { rejectUnauthorized: false };
    console.warn(
      "[db] Connecting over TLS without a CA certificate — the server's " +
        "identity is NOT verified. Set DATABASE_CA_CERT to Aiven's ca.pem.",
    );
  }

  return options;
}
