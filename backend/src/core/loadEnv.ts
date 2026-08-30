import { config } from "dotenv";
import path from "node:path";

// One .env at the workspace root, shared by backend and frontend, so secrets
// are not duplicated. Loaded by absolute path so it works no matter which
// directory the process was started from.
config({ path: path.resolve(import.meta.dirname, "../../../.env") });
