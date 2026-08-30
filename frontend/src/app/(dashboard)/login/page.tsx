import type { Metadata } from "next";
import { Suspense } from "react";
import Login from "@/views/Login";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  // Login reads ?next= via useSearchParams, which Next requires be wrapped.
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
