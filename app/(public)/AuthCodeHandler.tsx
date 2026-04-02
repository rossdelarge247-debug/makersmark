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

  return null;
}
