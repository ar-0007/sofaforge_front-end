import path from "node:path";
import { defineConfig } from "vitest/config";

const FRONTEND_ROOT = import.meta.dirname;
const WORKSPACE_ROOT = path.resolve(FRONTEND_ROOT, "..");

export default defineConfig({
  root: FRONTEND_ROOT,
  resolve: {
    alias: {
      "@": path.resolve(FRONTEND_ROOT, "src"),
      "@shared": path.resolve(WORKSPACE_ROOT, "shared"),
      "@backend": path.resolve(WORKSPACE_ROOT, "backend", "src"),
      "@assets": path.resolve(WORKSPACE_ROOT, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
