import { env, flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import type { EmailLog, EmailTemplate, EmailTemplateType } from "@/types/database";

let client: import("resend").Resend | null = null;

async function getClient() {
  if (!flags.hasResend) return null;
  if (!client) {
    const { Resend } = await import("resend");
    client = new Resend(env.RESEND_API_KEY);
  }
  return client;
}

export interface SendEmailInput {
  companyId: string;
  applicationId?: string | null;
  type: EmailLog["type"];
  to: string;
  subject: string;
  body: string;
  scheduledFor?: string | null;
  createdBy?: string | null;
}

/**
 * Sends (or schedules) a candidate/employer email and always writes an
 * EmailLog row — spec Part I §20. In demo mode nothing leaves the process;
 * the log entry is what the Email Log UI reads from. The log write itself
 * goes to Postgres once Supabase is configured, independently of whether
 * Resend itself is configured — so the log stays authoritative either way.
 */
export async function sendEmail(input: SendEmailInput): Promise<EmailLog> {
  const resend = await getClient();
  let status: EmailLog["status"] = "sent";
  let resendId: string | null = null;
  let failureReason: string | null = null;

  if (resend) {
    try {
      const result = await resend.emails.send({
        from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
        to: input.to,
        replyTo: env.EMAIL_REPLY_TO,
        subject: input.subject,
        text: input.body,
        ...(input.scheduledFor ? { scheduledAt: input.scheduledFor } : {}),
      });
      resendId = result.data?.id ?? null;
      status = input.scheduledFor ? "scheduled" : "sent";
    } catch (err) {
      status = "failed";
      failureReason = err instanceof Error ? err.message : "Unknown error";
    }
  } else {
    resendId = `re_demo_${id().slice(0, 8)}`;
    status = input.scheduledFor ? "scheduled" : "delivered";
  }

  const logFields = {
    company_id: input.companyId,
    application_id: input.applicationId ?? null,
    type: input.type,
    recipient: input.to,
    subject: input.subject,
    status,
    resend_id: resendId,
    scheduled_for: input.scheduledFor ?? null,
    sent_at: status === "scheduled" ? null : new Date().toISOString(),
    delivered_at: status === "delivered" ? new Date().toISOString() : null,
    failure_reason: failureReason,
    created_by: input.createdBy ?? null,
    template_version: null,
  };

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.from("email_logs").insert(logFields).select("*").single();
    if (error) throw error;
    return data as EmailLog;
  }

  const log: EmailLog = { id: id(), ...logFields };
  mockStore.emailLogs.unshift(log);
  return log;
}

export async function updateEmailLogStatusByResendId(resendId: string, patch: Partial<Pick<EmailLog, "status" | "delivered_at" | "failure_reason">>) {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("email_logs").update(patch).eq("resend_id", resendId).select("*").maybeSingle();
    return (data as EmailLog | null) ?? null;
  }

  const log = mockStore.emailLogs.find((l) => l.resend_id === resendId);
  if (!log) return null;
  Object.assign(log, patch);
  return log;
}

export async function cancelScheduledEmail(logId: string) {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("email_logs").update({ status: "canceled" }).eq("id", logId).eq("status", "scheduled").select("*").maybeSingle();
    return (data as EmailLog | null) ?? null;
  }

  const log = mockStore.emailLogs.find((l) => l.id === logId);
  if (!log || log.status !== "scheduled") return null;
  log.status = "canceled";
  return log;
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value), body);
}

/**
 * Read via the admin client: called both from authenticated dashboard routes
 * and from unauthenticated candidate-facing flows (application submission,
 * assessment/video-interview invite & completion) where there is no Supabase
 * session for RLS (email_templates_select_member) to scope against.
 */
export async function getTemplate(companyId: string, type: EmailTemplateType): Promise<EmailTemplate | null> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("email_templates").select("*").eq("company_id", companyId).eq("type", type).maybeSingle();
    return (data as EmailTemplate | null) ?? null;
  }
  return mockStore.emailTemplates.find((t) => t.company_id === companyId && t.type === type) ?? null;
}
