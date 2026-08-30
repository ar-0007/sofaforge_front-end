import { config } from "dotenv";
import path from "node:path";

// drizzle-kit bundles this config to CJS, where `import.meta.dirname` is empty
// and path.resolve() then throws. The db:* scripts always run with this package
// as the working directory, so resolve from there instead — it behaves the same
// under both module formats. On a host there is no .env file at all and the
// variables are injected, which dotenv leaves alone.
config({ path: path.resolve(process.cwd(), "../.env") });
import { defineConfig } from "drizzle-kit";
import { poolOptionsFromUrl } from "./src/db/connection";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Credentials are given as explicit fields, not as the URL: a managed
// provider's `?ssl-mode=REQUIRED` is silently ignored by the driver and the
// migration would then run over an unencrypted link. See src/db/connection.ts.
const { host, port, user, password, database, ssl } = poolOptionsFromUrl(connectionString);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: host!,
    port,
    user,
    password,
    database: database!,
    ssl,
  },
});
