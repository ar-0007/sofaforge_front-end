import path from "node:path";
import { defineConfig } from "vitest/config";

const BACKEND_ROOT = import.meta.dirname;
const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, "..");

export default defineConfig({
  root: BACKEND_ROOT,
  resolve: {
    alias: {
      "@": path.resolve(BACKEND_ROOT, "src"),
      "@shared": path.resolve(WORKSPACE_ROOT, "shared"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
  },
});
