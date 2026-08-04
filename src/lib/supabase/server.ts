import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, flags } from "@/lib/env";

/**
 * Server Component / Route Handler Supabase client, bound to the request's
 * cookie jar. Throws if Supabase isn't configured — callers should check
 * `flags.hasSupabase` (or `DEMO_MODE`) before reaching for this.
 */
export async function createServerSupabaseClient() {
  if (!flags.hasSupabase) {
    throw new Error("Supabase is not configured — this app is running in demo mode.");
  }
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — session refresh is handled by proxy.ts instead.
        }
      },
    },
  });
}
