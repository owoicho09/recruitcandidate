import { flags, env } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import type { LifecycleSegment, LifecycleEmail } from "@/types/database";

/**
 * Scheduling deliberately does NOT use Resend's own delayed-send + cancel —
 * the configured API key is send-only (verified live: it 401s on the cancel
 * endpoint), and even with a broader key, pre-scheduling with Resend means
 * trusting that a cancel call always lands before delivery. Instead, rows
 * are queued here and a periodic worker (processDueLifecycleEmails, called
 * from /api/internal/lifecycle-emails/process) re-checks the company's
 * CURRENT segment at send time and only actually sends if it still matches
 * — a stale reminder can never slip through even if a cancellation was missed.
 */

interface SequenceItem {
  emailType: string;
  delayHours: number;
  subject: string;
  body: (ctx: SequenceContext) => string;
}

interface SequenceContext {
  companyName: string;
  careerPageUrl: string;
  billingUrl: string;
  jobUrl: string | null;
}

const SEQUENCES: Partial<Record<LifecycleSegment, SequenceItem[]>> = {
  signup_incomplete_setup: [
    {
      emailType: "setup_reminder",
      delayHours: 24,
      subject: "Finish setting up your RecruitCandidates workspace",
      body: (ctx) =>
        `Complete your company profile and get your recruitment page ready.\n\nFinish company setup: ${ctx.billingUrl.replace("/billing", "/career-page")}`,
    },
  ],
  setup_complete_no_job: [
    {
      emailType: "create_job_reminder",
      delayHours: 24,
      subject: "Your company page is ready — create your first role",
      body: (ctx) =>
        `Your company page is ready. Create your first role to start collecting applications.\n\nCreate your first job: ${ctx.billingUrl.replace("/billing", "/jobs/new")}`,
    },
  ],
  draft_not_subscribed: [
    { emailType: "draft_reminder_1", delayHours: 2, subject: "Your role is still saved in RecruitCandidates", body: draftReminderBody },
    { emailType: "draft_reminder_2", delayHours: 24, subject: "Your role is still saved in RecruitCandidates", body: draftReminderBody },
    { emailType: "draft_reminder_3", delayHours: 72, subject: "Your role is still saved in RecruitCandidates", body: draftReminderBody },
  ],
  subscribed_not_published: [
    {
      emailType: "publish_reminder_1",
      delayHours: 6,
      subject: "Your workspace is active — publish your first role",
      body: (ctx) => `Your workspace is active. Publish your first role and start receiving candidates.\n\nPublish your first role: ${ctx.jobUrl ?? ctx.billingUrl.replace("/billing", "/jobs")}`,
    },
    {
      emailType: "publish_reminder_2",
      delayHours: 24,
      subject: "Your workspace is active — publish your first role",
      body: (ctx) => `Your workspace is active. Publish your first role and start receiving candidates.\n\nPublish your first role: ${ctx.jobUrl ?? ctx.billingUrl.replace("/billing", "/jobs")}`,
    },
  ],
  published_no_applications: [
    { emailType: "share_reminder_1", delayHours: 24, subject: "Your job is live — share it to start receiving candidates", body: shareReminderBody },
    { emailType: "share_reminder_2", delayHours: 72, subject: "Your job is live — share it to start receiving candidates", body: shareReminderBody },
  ],
  at_plan_limit: [
    {
      emailType: "limit_reached_1",
      delayHours: 0,
      subject: "You've reached your application allowance",
      body: (ctx) => `Your company has reached its current application allowance. Buy more applications or upgrade your plan to keep receiving candidates.\n\nManage your plan: ${ctx.billingUrl}`,
    },
    {
      emailType: "limit_reached_2",
      delayHours: 24,
      subject: "You've reached your application allowance",
      body: (ctx) => `Your company has reached its current application allowance. Buy more applications or upgrade your plan to keep receiving candidates.\n\nManage your plan: ${ctx.billingUrl}`,
    },
  ],
};

const EMAIL_TYPE_LABELS: Record<string, string> = {
  setup_reminder: "Setup reminder",
  create_job_reminder: "Create-job reminder",
  draft_reminder_1: "Draft reminder (1 of 3)",
  draft_reminder_2: "Draft reminder (2 of 3)",
  draft_reminder_3: "Draft reminder (3 of 3)",
  publish_reminder_1: "Publish reminder (1 of 2)",
  publish_reminder_2: "Publish reminder (2 of 2)",
  share_reminder_1: "Share reminder (1 of 2)",
  share_reminder_2: "Share reminder (2 of 2)",
  limit_reached_1: "Limit-reached notice (1 of 2)",
  limit_reached_2: "Limit-reached notice (2 of 2)",
};

/** Human-readable label for a lifecycle_emails.email_type value, for admin UI display. Falls back to the raw key for any type not in the map. */
export function getEmailTypeLabel(emailType: string): string {
  return EMAIL_TYPE_LABELS[emailType] ?? emailType;
}

function draftReminderBody(ctx: SequenceContext): string {
  return `Your role is still saved in RecruitCandidates. Choose a plan to publish it and start receiving applications through your company's recruitment page.\n\nPublish your role: ${ctx.jobUrl ?? ctx.billingUrl}`;
}

function shareReminderBody(ctx: SequenceContext): string {
  return `Your job is live. Share your application link or career page to start receiving candidates.\n\nView career page: ${ctx.careerPageUrl}`;
}

async function buildContext(companyId: string): Promise<SequenceContext | null> {
  const { getCompany } = await import("@/lib/services/companies");
  const { listJobs } = await import("@/lib/services/jobs");
  const [company, jobs] = await Promise.all([getCompany(companyId), listJobs(companyId)]);
  if (!company) return null;

  const draftJob = jobs.find((j) => j.status === "draft");
  const publishedJob = jobs.find((j) => j.status === "published");
  const relevantJob = draftJob ?? publishedJob ?? null;

  return {
    companyName: company.name,
    careerPageUrl: `${env.NEXT_PUBLIC_APP_URL}/${company.slug}/careers`,
    billingUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    jobUrl: relevantJob ? `${env.NEXT_PUBLIC_APP_URL}/dashboard/jobs/${relevantJob.id}` : null,
  };
}

async function insertLifecycleEmail(row: Omit<LifecycleEmail, "id" | "created_at">): Promise<void> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.from("lifecycle_emails").insert(row);
    return;
  }
  mockStore.lifecycleEmails.push({ ...row, id: id(), created_at: new Date().toISOString() });
}

/** Queues the follow-up sequence for a segment. No-op for segments with no defined sequence (e.g. "receiving_applications" — product education, not built yet). */
export async function scheduleLifecycleFollowUps(companyId: string, segment: LifecycleSegment): Promise<void> {
  const sequence = SEQUENCES[segment];
  if (!sequence || sequence.length === 0) return;

  try {
    const { getCompanyOwnerEmail } = await import("@/lib/services/plan-access");
    const [ownerEmail, ctx] = await Promise.all([getCompanyOwnerEmail(companyId), buildContext(companyId)]);
    if (!ownerEmail || !ctx) return;

    const now = Date.now();
    for (const item of sequence) {
      await insertLifecycleEmail({
        company_id: companyId,
        recipient: ownerEmail,
        segment,
        email_type: item.emailType,
        subject: item.subject,
        status: "scheduled",
        resend_id: null,
        scheduled_for: new Date(now + item.delayHours * 60 * 60 * 1000).toISOString(),
        sent_at: null,
        cancelled_at: null,
        failure_reason: null,
      });
    }
  } catch (err) {
    console.error("Scheduling lifecycle follow-ups failed:", err instanceof Error ? err.message : err);
  }
}

/** Cancels every still-pending follow-up for a company — called right before scheduling a new sequence, so a company never has two segments' reminders queued at once. */
export async function cancelPendingLifecycleEmails(companyId: string): Promise<void> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    await admin.from("lifecycle_emails").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("company_id", companyId).eq("status", "scheduled");
    return;
  }
  const now = new Date().toISOString();
  for (const e of mockStore.lifecycleEmails) {
    if (e.company_id === companyId && e.status === "scheduled") {
      e.status = "cancelled";
      e.cancelled_at = now;
    }
  }
}

async function sendRaw(to: string, subject: string, text: string): Promise<{ resendId: string | null; error: string | null }> {
  if (!flags.hasResend) return { resendId: `demo_${id().slice(0, 8)}`, error: null };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    const result = await resend.emails.send({ from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`, to, replyTo: env.EMAIL_REPLY_TO, subject, text });
    if (result.error) return { resendId: null, error: result.error.message };
    return { resendId: result.data?.id ?? null, error: null };
  } catch (err) {
    return { resendId: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export interface LifecycleEmailSummary {
  lastSent: LifecycleEmail | null;
  nextScheduled: LifecycleEmail | null;
}

/** Batched for the platform-admin lifecycle list — one query each rather than N+1 per company. */
export async function summarizeLifecycleEmails(companyIds: string[]): Promise<Record<string, LifecycleEmailSummary>> {
  const summaries: Record<string, LifecycleEmailSummary> = {};
  if (companyIds.length === 0) return summaries;

  const all: LifecycleEmail[] = flags.hasSupabase
    ? await (async () => {
        const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
        const admin = createAdminSupabaseClient();
        const { data } = await admin.from("lifecycle_emails").select("*").in("company_id", companyIds);
        return (data as LifecycleEmail[] | null) ?? [];
      })()
    : mockStore.lifecycleEmails.filter((e) => companyIds.includes(e.company_id));

  for (const companyId of companyIds) {
    const rows = all.filter((e) => e.company_id === companyId);
    const sent = rows.filter((e) => e.status === "sent").sort((a, b) => +new Date(b.sent_at ?? 0) - +new Date(a.sent_at ?? 0));
    const scheduled = rows.filter((e) => e.status === "scheduled").sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for));
    summaries[companyId] = { lastSent: sent[0] ?? null, nextScheduled: scheduled[0] ?? null };
  }
  return summaries;
}

/**
 * Called on a timer (see /api/internal/lifecycle-emails/process) — finds
 * everything due, re-verifies the company is still in the segment the email
 * was queued for, and only then sends. Anything the company has since moved
 * past gets marked cancelled here as a safety net even if the proactive
 * cancel (on segment change) somehow missed it.
 */
export async function processDueLifecycleEmails(limit = 50): Promise<{ sent: number; cancelled: number; failed: number }> {
  const result = { sent: 0, cancelled: 0, failed: 0 };
  if (!flags.hasSupabase) return result;

  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { getCompany } = await import("@/lib/services/companies");
  const admin = createAdminSupabaseClient();

  const { data: due } = await admin
    .from("lifecycle_emails")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(limit);

  for (const row of (due as LifecycleEmail[] | null) ?? []) {
    const company = await getCompany(row.company_id);
    if (!company || company.lifecycle_segment !== row.segment) {
      await admin.from("lifecycle_emails").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", row.id);
      result.cancelled++;
      continue;
    }

    const ctx = await buildContext(row.company_id);
    const sequence = SEQUENCES[row.segment]?.find((s) => s.emailType === row.email_type);
    const text = sequence && ctx ? sequence.body(ctx) : row.subject;

    const { resendId, error } = await sendRaw(row.recipient, row.subject, text);
    if (error) {
      await admin.from("lifecycle_emails").update({ status: "failed", failure_reason: error }).eq("id", row.id);
      result.failed++;
    } else {
      await admin.from("lifecycle_emails").update({ status: "sent", resend_id: resendId, sent_at: new Date().toISOString() }).eq("id", row.id);
      result.sent++;
    }
  }

  return result;
}
