import { flags } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiter backed by Postgres, not Redis — no new external
 * service to provision, and this app already treats Postgres as its source
 * of truth. Good enough for abuse-slowdown on public endpoints; not meant to
 * be exact under heavy concurrent load.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!flags.hasSupabase) return true; // demo mode has no persistent store to key off

  const admin = createAdminSupabaseClient();
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count } = await admin
    .from("rate_limit_hits")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= limit) return false;

  await admin.from("rate_limit_hits").insert({ key });

  // Opportunistic cleanup instead of a cron job — cheap, keeps the table from growing unbounded.
  if (Math.random() < 0.02) {
    await admin.from("rate_limit_hits").delete().lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  }

  return true;
}

/** Best-effort client IP for rate-limit keys — Vercel (and most proxies) set x-forwarded-for. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
