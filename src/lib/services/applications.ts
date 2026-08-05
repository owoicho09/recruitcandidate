import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id, daysFromNow } from "@/lib/data/ids";
import { generateToken, hashToken } from "@/lib/utils/token";
import { runCvScreening } from "@/lib/ai/claude";
import { recordApplicationSubmitted } from "@/lib/services/usage-tracking";
import { env } from "@/lib/env";
import type { AiScreeningResult, Application, ApplicationStage, Candidate, Recommendation } from "@/types/database";

export interface ApplicantRow {
  application: Application;
  candidate: Candidate;
  jobTitle: string;
  cvScore: number | null;
}

interface ApplicantJoinRow extends Application {
  candidates: Candidate;
  jobs: { title: string } | null;
  ai_screening_results: { overall_score: number }[];
}

function splitApplicantRow(row: ApplicantJoinRow): ApplicantRow {
  const { candidates, jobs, ai_screening_results, ...application } = row;
  return {
    application,
    candidate: candidates,
    jobTitle: jobs?.title ?? "Unknown role",
    cvScore: ai_screening_results.at(-1)?.overall_score ?? null,
  };
}

export async function listApplicantsForCompany(companyId: string): Promise<ApplicantRow[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("applications")
      .select("*, candidates(*), jobs(title), ai_screening_results(overall_score)")
      .eq("company_id", companyId)
      .order("applied_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as ApplicantJoinRow[]).map(splitApplicantRow);
  }

  return mockStore.applications
    .filter((a) => a.company_id === companyId)
    .map((application) => ({
      application,
      candidate: mockStore.candidates.find((c) => c.id === application.candidate_id)!,
      jobTitle: mockStore.jobs.find((j) => j.id === application.job_id)?.title ?? "Unknown role",
      cvScore: mockStore.aiScreeningResults.find((s) => s.application_id === application.id)?.overall_score ?? null,
    }))
    .sort((a, b) => +new Date(b.application.applied_at) - +new Date(a.application.applied_at));
}

export async function listApplicantsForJob(companyId: string, jobId: string): Promise<ApplicantRow[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("applications")
      .select("*, candidates(*), jobs(title), ai_screening_results(overall_score)")
      .eq("company_id", companyId)
      .eq("job_id", jobId)
      .order("applied_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as ApplicantJoinRow[]).map(splitApplicantRow);
  }

  const rows = await listApplicantsForCompany(companyId);
  return rows.filter((r) => r.application.job_id === jobId);
}

export async function getApplicationDetail(companyId: string, applicationId: string) {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();

    const { data: application } = await supabase.from("applications").select("*").eq("company_id", companyId).eq("id", applicationId).maybeSingle();
    if (!application) return null;

    const [{ data: candidate }, { data: job }, { data: screenings }, { data: assessmentAttempt }, { data: videoAttempt }, { data: events }, { data: applicationNotes }] = await Promise.all([
      supabase.from("candidates").select("*").eq("id", application.candidate_id).single(),
      supabase.from("jobs").select("*").eq("id", application.job_id).single(),
      supabase.from("ai_screening_results").select("*").eq("application_id", applicationId).order("created_at", { ascending: false }).limit(1),
      supabase.from("assessment_attempts").select("*").eq("application_id", applicationId).maybeSingle(),
      supabase.from("video_interview_attempts").select("*").eq("application_id", applicationId).maybeSingle(),
      supabase.from("pipeline_events").select("*").eq("application_id", applicationId).order("created_at", { ascending: true }),
      supabase.from("notes").select("*").eq("application_id", applicationId).order("created_at", { ascending: false }),
    ]);

    const videoResponses = videoAttempt
      ? (await supabase.from("video_responses").select("*").eq("attempt_id", videoAttempt.id).order("question_id")).data ?? []
      : [];

    const assignedMember = application.assigned_member_id
      ? (await supabase.from("company_members").select("*").eq("user_id", application.assigned_member_id).eq("company_id", companyId).maybeSingle()).data
      : null;

    return {
      application: application as Application,
      candidate: candidate as Candidate,
      job,
      screening: (screenings?.[0] as AiScreeningResult) ?? null,
      assessmentAttempt: assessmentAttempt ?? null,
      videoAttempt: videoAttempt ?? null,
      videoResponses,
      events: events ?? [],
      notes: applicationNotes ?? [],
      assignedMember: assignedMember ?? null,
    };
  }

  const application = mockStore.applications.find((a) => a.company_id === companyId && a.id === applicationId);
  if (!application) return null;
  const candidate = mockStore.candidates.find((c) => c.id === application.candidate_id)!;
  const job = mockStore.jobs.find((j) => j.id === application.job_id)!;
  const screening = mockStore.aiScreeningResults.filter((s) => s.application_id === applicationId).at(-1) ?? null;
  const assessmentAttempt = mockStore.assessmentAttempts.find((a) => a.application_id === applicationId) ?? null;
  const videoAttempt = mockStore.videoInterviewAttempts.find((a) => a.application_id === applicationId) ?? null;
  const videoResponses = videoAttempt
    ? mockStore.videoResponses.filter((r) => r.attempt_id === videoAttempt.id).sort((a, b) => a.question_id.localeCompare(b.question_id))
    : [];
  const events = mockStore.pipelineEvents
    .filter((e) => e.application_id === applicationId)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const applicationNotes = mockStore.notes
    .filter((n) => n.application_id === applicationId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const assignedMember = application.assigned_member_id
    ? mockStore.companyMembers.find((m) => m.user_id === application.assigned_member_id) ?? null
    : null;

  return { application, candidate, job, screening, assessmentAttempt, videoAttempt, videoResponses, events, notes: applicationNotes, assignedMember };
}

async function recordPipelineEvent(companyId: string, applicationId: string, from: ApplicationStage | null, to: ApplicationStage, changedBy: string | null, source: "system" | "recruiter" | "ai" = "recruiter") {
  if (flags.hasSupabase) {
    // pipeline_events has a select-only RLS policy (no insert policy for any
    // role) — it's an append-only audit trail, so writes always go through
    // the admin client regardless of caller (recruiter session, system, or ai).
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("pipeline_events").insert({ company_id: companyId, application_id: applicationId, from_stage: from, to_stage: to, changed_by: changedBy, source });
    if (error) throw error;
    return;
  }
  mockStore.pipelineEvents.push({
    id: id(),
    company_id: companyId,
    application_id: applicationId,
    from_stage: from,
    to_stage: to,
    changed_by: changedBy,
    source,
    created_at: new Date().toISOString(),
  });
}

export async function moveApplicationStage(companyId: string, applicationId: string, toStage: ApplicationStage, changedBy: string): Promise<Application | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data: existing } = await supabase.from("applications").select("stage").eq("company_id", companyId).eq("id", applicationId).maybeSingle();
    if (!existing) return null;

    const now = new Date().toISOString();
    const patch: Partial<Application> = { stage: toStage, stage_updated_at: now };
    if (toStage === "qualified") patch.qualified_at = now;
    if (toStage === "rejected") patch.rejected_at = now;

    const { data } = await supabase.from("applications").update(patch).eq("company_id", companyId).eq("id", applicationId).select("*").maybeSingle();
    await recordPipelineEvent(companyId, applicationId, existing.stage, toStage, changedBy);
    return (data as Application | null) ?? null;
  }

  const application = mockStore.applications.find((a) => a.company_id === companyId && a.id === applicationId);
  if (!application) return null;
  const fromStage = application.stage;
  application.stage = toStage;
  application.stage_updated_at = new Date().toISOString();
  if (toStage === "qualified") application.qualified_at = application.stage_updated_at;
  if (toStage === "rejected") application.rejected_at = application.stage_updated_at;
  await recordPipelineEvent(companyId, applicationId, fromStage, toStage, changedBy);
  return application;
}

export async function assignApplication(companyId: string, applicationId: string, memberId: string | null): Promise<Application | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("applications").update({ assigned_member_id: memberId }).eq("company_id", companyId).eq("id", applicationId).select("*").maybeSingle();
    return (data as Application | null) ?? null;
  }

  const application = mockStore.applications.find((a) => a.company_id === companyId && a.id === applicationId);
  if (!application) return null;
  application.assigned_member_id = memberId;
  return application;
}

export async function addNote(companyId: string, applicationId: string, authorId: string, authorName: string, body: string) {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("notes")
      .insert({ company_id: companyId, application_id: applicationId, author_id: authorId, body })
      .select("*")
      .single();
    if (error) throw error;
    return { ...data, author_name: authorName };
  }

  const note = {
    id: id(),
    company_id: companyId,
    application_id: applicationId,
    author_id: authorId,
    author_name: authorName,
    body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockStore.notes.unshift(note);
  return note;
}

export interface PublicApplicationInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url?: string;
  portfolio_url?: string;
  cover_note?: string;
  cv_filename: string;
  application_answers: Record<string, string>;
}

/** Public candidate-facing application submission — no auth, rate-limited at the route layer. */
export async function submitApplication(companySlug: string, jobId: string, input: PublicApplicationInput) {
  if (flags.hasSupabase) return submitApplicationLive(companySlug, jobId, input);

  const company = mockStore.companies.find((c) => c.slug === companySlug);
  const job = mockStore.jobs.find((j) => j.id === jobId && j.status === "published");
  if (!company || !job) return null;

  let candidate = mockStore.candidates.find((c) => c.company_id === company.id && c.email.toLowerCase() === input.email.toLowerCase());
  if (!candidate) {
    candidate = {
      id: id(),
      company_id: company.id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone,
      location: input.location,
      linkedin_url: input.linkedin_url ?? null,
      portfolio_url: input.portfolio_url ?? null,
      created_at: new Date().toISOString(),
    };
    mockStore.candidates.push(candidate);
  }

  const trackingToken = generateToken();
  const application: Application = {
    id: id(),
    company_id: company.id,
    job_id: job.id,
    candidate_id: candidate.id,
    cv_path: `demo/cvs/${id()}.pdf`,
    cv_filename: input.cv_filename,
    cv_text: null,
    cv_parse_status: "pending",
    cover_note: input.cover_note ?? null,
    application_answers: input.application_answers,
    stage: "applied",
    recommendation: null,
    assigned_member_id: null,
    tracking_token_hash: hashToken(trackingToken),
    applied_at: new Date().toISOString(),
    stage_updated_at: new Date().toISOString(),
    rejected_at: null,
    qualified_at: null,
  };
  mockStore.applications.push(application);
  await recordPipelineEvent(company.id, application.id, null, "applied", null, "system");

  const usage = mockStore.usagePeriods.find((u) => u.company_id === company.id);
  if (usage) usage.applications += 1;

  // Background-style processing — see Part R: candidate submission never blocks on this.
  void processApplicationScreening(company.id, application.id);

  return { application, trackingToken };
}

async function submitApplicationLive(companySlug: string, jobId: string, input: PublicApplicationInput) {
  // Candidate submissions are unauthenticated, so this uses the service-role
  // client (bypasses RLS) rather than the anon-key client — appropriate here
  // per spec Part J since it's a trusted server route, not a client-exposed key.
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();

  const { data: company } = await admin.from("companies").select("id, slug").eq("slug", companySlug).maybeSingle();
  const { data: job } = await admin.from("jobs").select("*").eq("id", jobId).eq("status", "published").maybeSingle();
  if (!company || !job) return null;

  let { data: candidate } = await admin.from("candidates").select("*").eq("company_id", company.id).ilike("email", input.email).maybeSingle();
  if (!candidate) {
    const { data: created, error } = await admin
      .from("candidates")
      .insert({
        company_id: company.id,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        location: input.location,
        linkedin_url: input.linkedin_url ?? null,
        portfolio_url: input.portfolio_url ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    candidate = created;
  }

  const trackingToken = generateToken();
  const { data: application, error: applicationError } = await admin
    .from("applications")
    .insert({
      company_id: company.id,
      job_id: job.id,
      candidate_id: candidate!.id,
      cv_path: `${company.id}/${input.cv_filename}`,
      cv_filename: input.cv_filename,
      cv_parse_status: "pending",
      cover_note: input.cover_note ?? null,
      application_answers: input.application_answers,
      stage: "applied",
      tracking_token_hash: hashToken(trackingToken),
    })
    .select("*")
    .single();
  if (applicationError) throw applicationError;

  await recordPipelineEvent(company.id, application.id, null, "applied", null, "system");
  await recordApplicationSubmitted(company.id);

  void processApplicationScreening(company.id, application.id);

  return { application: application as Application, trackingToken };
}

async function processApplicationScreening(companyId: string, applicationId: string) {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: application } = await admin.from("applications").select("*").eq("id", applicationId).maybeSingle();
    if (!application) return;

    await admin.from("applications").update({ cv_parse_status: "parsed", cv_text: "Extracted CV text (live mode placeholder — wire a real CV parser here)." }).eq("id", applicationId);
    const { data: job } = await admin.from("jobs").select("*").eq("id", application.job_id).single();

    const result = await runCvScreening({ job, application: { ...application, cv_text: "Extracted CV text (live mode placeholder — wire a real CV parser here)." } });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- runCvScreening returns a mock-store-shaped id we discard in favor of the DB-generated one.
    const { id: _mockId, ...resultForInsert } = result;
    await admin.from("ai_screening_results").insert({ ...resultForInsert, application_id: applicationId });
    await admin.from("applications").update({ stage: "cv_screened", stage_updated_at: new Date().toISOString(), recommendation: result.recommendation }).eq("id", applicationId);
    await recordPipelineEvent(companyId, applicationId, "applied", "cv_screened", null, "ai");
    return;
  }

  const application = mockStore.applications.find((a) => a.id === applicationId);
  if (!application) return;
  application.cv_parse_status = "parsed";
  application.cv_text = "Extracted CV text (demo mode placeholder).";

  const job = mockStore.jobs.find((j) => j.id === application.job_id)!;
  const result = await runCvScreening({ job, application });
  mockStore.aiScreeningResults.push(result);
  application.stage = "cv_screened";
  application.stage_updated_at = new Date().toISOString();
  application.recommendation = result.recommendation;
  await recordPipelineEvent(companyId, applicationId, "applied", "cv_screened", null, "ai");
}

export async function getApplicationByTrackingToken(token: string) {
  const tokenHash = hashToken(token);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: application } = await admin.from("applications").select("*").eq("tracking_token_hash", tokenHash).maybeSingle();
    if (!application) return null;
    const [{ data: candidate }, { data: job }, { data: company }] = await Promise.all([
      admin.from("candidates").select("*").eq("id", application.candidate_id).single(),
      admin.from("jobs").select("*").eq("id", application.job_id).single(),
      admin.from("companies").select("*").eq("id", application.company_id).single(),
    ]);
    return { application: application as Application, candidate, job, company };
  }

  const application = mockStore.applications.find((a) => a.tracking_token_hash === tokenHash);
  if (!application) return null;
  const candidate = mockStore.candidates.find((c) => c.id === application.candidate_id)!;
  const job = mockStore.jobs.find((j) => j.id === application.job_id)!;
  const company = mockStore.companies.find((c) => c.id === application.company_id)!;
  return { application, candidate, job, company };
}

export function defaultTokenExpiry() {
  return daysFromNow(env.CANDIDATE_TOKEN_TTL_DAYS);
}

export async function overrideScreeningRecommendation(companyId: string, screeningResultId: string, override: Recommendation | null) {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    // RLS (ai_screening_results_update_recruiter) already scopes this to the caller's company via the application join.
    const { data, error } = await supabase.from("ai_screening_results").update({ manual_override: override }).eq("id", screeningResultId).select("*").maybeSingle();
    if (error) throw error;
    return (data as AiScreeningResult | null) ?? null;
  }

  const result = mockStore.aiScreeningResults.find((r) => r.id === screeningResultId);
  if (!result) return null;
  const application = mockStore.applications.find((a) => a.id === result.application_id && a.company_id === companyId);
  if (!application) return null;
  result.manual_override = override;
  return result;
}
