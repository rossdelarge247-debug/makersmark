"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCodeHandler() {
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    // Only run if there's a hash or code param indicating an auth callback
    const hasAuthParams =
      window.location.hash.includes("access_token") ||
      window.location.search.includes("code=");

    if (!hasAuthParams || didRun.current) return;
    didRun.current = true;

    const supabase = createClient();

    // Give the client a moment to parse the hash/token from the URL
    setTimeout(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        router.replace(`/login?error=${encodeURIComponent(error?.message ?? "auth_failed")}`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .single();

      router.replace(!profile || !profile.onboarding_completed ? "/onboarding" : "/app");
    }, 200);
  }, [router]);

  // Show a full-screen loader while processing the auth redirect
  // to prevent the landing page flashing beneath
  if (typeof window !== "undefined" &&
    (window.location.hash.includes("access_token") ||
     window.location.search.includes("code="))) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">Signing you in…</p>
        </div>
      </div>
    );
  }

  return null;
}
