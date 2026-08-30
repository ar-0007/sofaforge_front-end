import { config as loadEnv } from "dotenv";
import path from "node:path";
import type { NextConfig } from "next";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");

// One .env at the workspace root, shared with the backend. next.config is
// evaluated before the build, so NEXT_PUBLIC_* vars still get inlined.
loadEnv({ path: path.resolve(WORKSPACE_ROOT, ".env") });

// The backend is its own process. Rewriting /api/* keeps browser requests
// same-origin, so session cookies and the OAuth callback behave exactly as
// they did before the split.
const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // shared/ and the backend router types live outside this package; allow Next
  // to compile TypeScript from there.
  experimental: { externalDir: true },
  // shared/ lives outside this package; let Next trace files from the root.
  outputFileTracingRoot: WORKSPACE_ROOT,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_TARGET}/api/:path*` }];
  },
};

export default nextConfig;
