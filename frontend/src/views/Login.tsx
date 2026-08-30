"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api/config";
import { startLogin } from "@/const";

type Status = { enabled: boolean; email?: string } | null;

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") ?? "/admin";

  const [status, setStatus] = useState<Status>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Ask the API whether the local login route is available at all.
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/auth/dev-login"), { credentials: "include" })
      .then(res => (res.ok ? res.json() : { enabled: false }))
      .then(data => {
        if (cancelled) return;
        setStatus(data);
        if (data.email) setEmail(data.email);
      })
      .catch(() => !cancelled && setStatus({ enabled: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch(apiUrl("/api/auth/dev-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      // Mirror the token so browsers that drop the cookie still authenticate
      // via the Bearer fallback the tRPC client already sends.
      try {
        sessionStorage.setItem("manus-cookie", `app_session_id=${data.sessionToken}`);
      } catch {
        // sessionStorage unavailable — the cookie alone will have to do.
      }

      // Full reload so every provider picks the new session up.
      window.location.href = next;
    } catch {
      setError("Could not reach the API. Is the backend running on :4000?");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f4ec] px-6">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-[#9b6e4b]">Sofa Co.</p>
        <h1 className="font-display mt-4 text-5xl leading-[0.9] tracking-[-0.04em]">
          Dashboard
          <br />
          sign in.
        </h1>

        {status && !status.enabled ? (
          <div className="mt-8 space-y-5">
            <p className="border border-[#decfbd] bg-white/60 p-5 text-sm leading-6 text-[#766b5d]">
              Local sign-in is disabled on this environment. Continue with the
              Manus login instead.
            </p>
            <Button type="button" onClick={() => startLogin()} className="w-full">
              Continue with Manus
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

        <p className="mt-8 text-[10px] uppercase tracking-[0.15em] text-[#a2937f]">
          Development sign-in — disabled in production
        </p>
      </div>
    </main>
  );
}
