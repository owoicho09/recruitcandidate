import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, flags } from "@/lib/env";

/**
 * Service-role Supabase client. Only for trusted server-side routes and
 * background processing (webhooks, cron, AI pipelines) — per spec Part J,
 * this must never be reachable from client code or from routes that act on
 * behalf of a specific request's tenant without an explicit company_id check.
 */
export function createAdminSupabaseClient() {
  if (!flags.hasSupabaseAdmin) {
    throw new Error("Supabase service role is not configured — this app is running in demo mode.");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
