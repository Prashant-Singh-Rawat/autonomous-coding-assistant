"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Handles the redirect back from the backend GitHub OAuth callback.
 * URL: /api/auth/callback/success?access_token=<jwt>
 *
 * Stores the JWT in localStorage under "token" (the key used by all
 * existing pages) and redirects to the onboarding/repositories page.
 */
function AuthCallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("access_token");
    if (token) {
      localStorage.setItem("token", token);
      // Also store under the alternate key used by settings/page.tsx
      localStorage.setItem("access_token", token);
      router.replace("/onboarding/repositories");
    } else {
      router.replace("/auth/login?error=auth_failed");
    }
  }, [params, router]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-white/50">Completing sign-in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080810]">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/50">Completing sign-in…</p>
        </div>
      }>
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}
