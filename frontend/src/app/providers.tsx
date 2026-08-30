"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { apiUrl } from "@/lib/api/config";
import { readSession } from "@/lib/browserStorage";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

function redirectToLoginIfUnauthorized(error: unknown) {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  startLogin();
}

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  });

  queryClient.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.query.state.error;
      redirectToLoginIfUnauthorized(error);
      console.error("[API Query Error]", error);
    }
  });

  queryClient.getMutationCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.mutation.state.error;
      redirectToLoginIfUnauthorized(error);
      console.error("[API Mutation Error]", error);
    }
  });

  return queryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session; created lazily so SSR and the client agree.
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: apiUrl("/api/trpc"),
          transformer: superjson,
          headers() {
            // Preview auto-login fallback: when the browser blocks iframe
            // cookies, the runtime mirrors the session into sessionStorage so
            // we can forward it as a Bearer token. The regular OAuth cookie
            // flow keeps working and takes priority server-side.
            try {
              const raw = readSession("manus-cookie");
              if (raw) {
                const prefix = `${COOKIE_NAME}=`;
                const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
                const token = pair?.trim().slice(prefix.length);
                if (token) return { Authorization: `Bearer ${token}` };
              }
            } catch {
              // sessionStorage unavailable
            }
            return {};
          },
          fetch(input, init) {
            return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
          },
        }),
      ],
    })
  );

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <CartProvider>
              <TooltipProvider>
                <Toaster />
                {children}
              </TooltipProvider>
            </CartProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
