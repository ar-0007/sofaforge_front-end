import "server-only";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@backend/modules/app.router";

/**
 * tRPC client for use inside SERVER components only.
 *
 * It talks to the backend directly (server-to-server), bypassing the Next
 * rewrite, so pages can fetch data while rendering — that is what puts real
 * content and metadata in the HTML Google receives.
 */
// `??` is not enough here: these vars are commonly set to an empty string,
// which would produce a relative URL that server-side fetch cannot resolve.
const SERVER_API_URL =
  [process.env.API_PROXY_TARGET, process.env.NEXT_PUBLIC_API_URL].find(
    (value): value is string => Boolean(value && value.trim())
  ) ?? "http://localhost:4000";

export const serverApi = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${SERVER_API_URL.replace(/\/$/, "")}/api/trpc`,
      transformer: superjson,
    }),
  ],
});

/** Never let a backend hiccup take down a page render. */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("[serverApi]", error);
    return fallback;
  }
}
