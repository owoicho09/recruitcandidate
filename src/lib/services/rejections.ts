import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import { draftRejectionEmail } from "@/lib/ai/claude";
import { sendEmail } from "@/lib/email/resend";
import { getApplicationDetail, moveApplicationStage } from "@/lib/services/applications";
import type { ApplicationStage, FeedbackMode, RejectionRecord } from "@/types/database";

export async function draftRejection(companyId: string, applicationId: string, feedbackMode: FeedbackMode) {
  if (flags.hasSupabase) {
    const detail = await getApplicationDetail(companyId, applicationId);
    if (!detail) return null;
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data: company } = await supabase.from("companies").select("name").eq("id", companyId).single();

    const draft = await draftRejectionEmail({
      candidateFirstName: detail.candidate.first_name,
      roleTitle: detail.job.title,
      companyName: company!.name,
      missingRequirement: detail.screening?.missing_minimum_requirements[0],
      feedbackMode,
    });

    return { draft, candidate: detail.candidate, job: detail.job };
  }

  const application = mockStore.applications.find((a) => a.company_id === companyId && a.id === applicationId);
  if (!application) return null;
  const candidate = mockStore.candidates.find((c) => c.id === application.candidate_id)!;
  const job = mockStore.jobs.find((j) => j.id === application.job_id)!;
  const company = mockStore.companies.find((c) => c.id === companyId)!;
  const screening = mockStore.aiScreeningResults.find((s) => s.application_id === applicationId);

  const draft = await draftRejectionEmail({
    candidateFirstName: candidate.first_name,
    roleTitle: job.title,
    companyName: company.name,
    missingRequirement: screening?.missing_minimum_requirements[0],
    feedbackMode,
  });

  return { draft, candidate, job };
}

export interface ConfirmRejectionInput {
  applicationId: string;
  stage: ApplicationStage;
  internalReason: string;
  aiDraft: string;
  finalMessage: string;
  feedbackMode: FeedbackMode;
  sendEmailToggle: boolean;
  rejectedBy: string;
}

export async function confirmRejection(companyId: string, input: ConfirmRejectionInput): Promise<RejectionRecord | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();

    const detail = await getApplicationDetail(companyId, input.applicationId);
    if (!detail) return null;

    let emailLogId: string | null = null;
    if (input.sendEmailToggle) {
      const log = await sendEmail({
        companyId,
        applicationId: input.applicationId,
        type: "rejection",
        to: detail.candidate.email,
        subject: `Update on your application for ${detail.job.title}`,
        body: input.finalMessage,
        createdBy: input.rejectedBy,
      });
      emailLogId = log.id;
    }

    const { data: record, error } = await supabase
      .from("rejection_records")
      .insert({
        company_id: companyId,
        application_id: input.applicationId,
        rejected_by: input.rejectedBy,
        stage: input.stage,
        internal_reason: input.internalReason,
        ai_draft: input.aiDraft,
        final_message: input.finalMessage,
        feedback_mode: input.feedbackMode,
        email_log_id: emailLogId,
      })
      .select("*")
      .single();
    if (error) throw error;

    await moveApplicationStage(companyId, input.applicationId, "rejected", input.rejectedBy);

    return record as RejectionRecord;
  }

  const application = mockStore.applications.find((a) => a.company_id === companyId && a.id === input.applicationId);
  if (!application) return null;
  const candidate = mockStore.candidates.find((c) => c.id === application.candidate_id)!;
  const job = mockStore.jobs.find((j) => j.id === application.job_id)!;

  application.stage = "rejected";
  application.stage_updated_at = new Date().toISOString();
  application.rejected_at = application.stage_updated_at;

  let emailLogId: string | null = null;
  if (input.sendEmailToggle) {
    const log = await sendEmail({
      companyId,
      applicationId: application.id,
      type: "rejection",
      to: candidate.email,
      subject: `Update on your application for ${job.title} at Northwind Labs`,
      body: input.finalMessage,
      createdBy: input.rejectedBy,
    });
    emailLogId = log.id;
  }

  const record: RejectionRecord = {
    id: id(),
    company_id: companyId,
    application_id: input.applicationId,
    rejected_by: input.rejectedBy,
    stage: input.stage,
    internal_reason: input.internalReason,
    ai_draft: input.aiDraft,
    final_message: input.finalMessage,
    feedback_mode: input.feedbackMode,
    email_log_id: emailLogId,
    created_at: new Date().toISOString(),
  };
  mockStore.rejectionRecords.push(record);

  mockStore.pipelineEvents.push({
    id: id(),
    company_id: companyId,
    application_id: input.applicationId,
    from_stage: input.stage,
    to_stage: "rejected",
    changed_by: input.rejectedBy,
    source: "recruiter",
    created_at: new Date().toISOString(),
  });

  return record;
}
