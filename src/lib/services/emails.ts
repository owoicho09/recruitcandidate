import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import type { EmailLog, EmailTemplate, EmailTemplateType } from "@/types/database";

export async function listEmailTemplates(companyId: string): Promise<EmailTemplate[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("email_templates").select("*").eq("company_id", companyId);
    return (data as EmailTemplate[]) ?? [];
  }
  return mockStore.emailTemplates.filter((t) => t.company_id === companyId);
}

export async function updateEmailTemplate(companyId: string, type: EmailTemplateType, patch: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data: existing } = await supabase.from("email_templates").select("version").eq("company_id", companyId).eq("type", type).maybeSingle();
    if (!existing) return null;
    const { data, error } = await supabase
      .from("email_templates")
      .update({ ...patch, version: existing.version + 1 })
      .eq("company_id", companyId)
      .eq("type", type)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as EmailTemplate | null) ?? null;
  }

  const template = mockStore.emailTemplates.find((t) => t.company_id === companyId && t.type === type);
  if (!template) return null;
  Object.assign(template, patch, { version: template.version + 1 });
  return template;
}

export async function listEmailLogsForApplication(applicationId: string): Promise<EmailLog[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("email_logs").select("*").eq("application_id", applicationId);
    return (data as EmailLog[]) ?? [];
  }
  return mockStore.emailLogs.filter((l) => l.application_id === applicationId);
}

export async function listEmailLogs(companyId: string): Promise<EmailLog[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("email_logs").select("*").eq("company_id", companyId).order("sent_at", { ascending: false, nullsFirst: false });
    return (data as EmailLog[]) ?? [];
  }
  return mockStore.emailLogs
    .filter((l) => l.company_id === companyId)
    .sort((a, b) => +new Date(b.sent_at ?? b.scheduled_for ?? 0) - +new Date(a.sent_at ?? a.scheduled_for ?? 0));
}
