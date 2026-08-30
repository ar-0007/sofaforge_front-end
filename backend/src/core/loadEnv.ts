import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";

/**
 * Local development reads one .env at the workspace root, shared by backend and
 * frontend, so secrets are not duplicated.
 *
 * On a hosted platform (Render, a VPS, Docker) there is no .env file — the
 * variables are injected into the process. dotenv never overwrites an existing
 * process.env value, so this is a no-op there; we just have to look in more
 * than one place, because the bundled `dist/server.js` sits one directory
 * deeper than `src/core/`.
 */
const candidates = [
  process.env.ENV_FILE,
  path.resolve(import.meta.dirname, "../../../.env"), // src/core  -> repo root
  path.resolve(import.meta.dirname, "../../.env"), // dist       -> repo root
  path.resolve(import.meta.dirname, "../.env"), // dist       -> backend/
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
].filter((p): p is string => Boolean(p));

for (const file of candidates) {
  if (fs.existsSync(file)) {
    config({ path: file });
    break;
  }
}
