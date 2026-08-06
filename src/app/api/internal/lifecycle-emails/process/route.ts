import { NextResponse } from "next/server";
import { processDueLifecycleEmails } from "@/lib/services/lifecycle-email";
import { env } from "@/lib/env";

/**
 * Triggered by an external scheduler (cron-job.org, GitHub Actions cron,
 * Vercel Cron if available on your plan, etc.) rather than a Vercel Cron
 * config — this keeps the lifecycle email cadence (as fine as every couple
 * of hours) independent of any hosting-tier cron frequency limit. Point
 * whatever scheduler you use at this URL every 15–30 minutes with:
 *   Authorization: Bearer <INTERNAL_JOB_SECRET>
 */
export async function POST(request: Request) {
  if (!env.INTERNAL_JOB_SECRET) {
    return NextResponse.json({ error: "INTERNAL_JOB_SECRET is not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.INTERNAL_JOB_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueLifecycleEmails();
  return NextResponse.json(result);
}
