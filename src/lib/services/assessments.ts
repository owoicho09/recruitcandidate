import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id, daysFromNow } from "@/lib/data/ids";
import { hashToken, generateToken } from "@/lib/utils/token";
import type { Assessment, AssessmentAttempt, AssessmentQuestion } from "@/types/database";

export async function listAssessmentsForCompany(companyId: string): Promise<Assessment[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data: assessments } = await supabase.from("assessments").select("*").eq("company_id", companyId);
    if (!assessments) return [];
    const results = await Promise.all(
      assessments.map(async (a) => {
        const { data: questions } = await supabase.from("assessment_questions").select("*").eq("assessment_id", a.id).order("order_index");
        return { ...a, questions: questions ?? [] } as Assessment;
      }),
    );
    return results;
  }
  return mockStore.assessments.filter((a) => a.company_id === companyId);
}

export async function getAssessmentForJob(companyId: string, jobId: string): Promise<Assessment | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data: assessment } = await supabase.from("assessments").select("*").eq("company_id", companyId).eq("job_id", jobId).maybeSingle();
    if (!assessment) return null;
    const { data: questions } = await supabase.from("assessment_questions").select("*").eq("assessment_id", assessment.id).order("order_index");
    return { ...assessment, questions: questions ?? [] } as Assessment;
  }
  return mockStore.assessments.find((a) => a.company_id === companyId && a.job_id === jobId) ?? null;
}

export async function saveAssessment(
  companyId: string,
  jobId: string,
  input: Omit<Assessment, "id" | "company_id" | "job_id" | "questions"> & { questions: Omit<AssessmentQuestion, "assessment_id">[] },
): Promise<Assessment> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { questions, ...assessmentFields } = input;

    const { data: existing } = await supabase.from("assessments").select("id").eq("company_id", companyId).eq("job_id", jobId).maybeSingle();

    let assessmentId = existing?.id;
    if (existing) {
      await supabase.from("assessments").update(assessmentFields).eq("id", existing.id);
    } else {
      const { data: created, error } = await supabase.from("assessments").insert({ ...assessmentFields, company_id: companyId, job_id: jobId }).select("id").single();
      if (error) throw error;
      assessmentId = created.id;
    }

    await supabase.from("assessment_questions").delete().eq("assessment_id", assessmentId);
    if (questions.length > 0) {
      await supabase.from("assessment_questions").insert(questions.map((q) => ({ ...q, assessment_id: assessmentId })));
    }

    const { data: savedQuestions } = await supabase.from("assessment_questions").select("*").eq("assessment_id", assessmentId).order("order_index");
    return { ...assessmentFields, id: assessmentId!, company_id: companyId, job_id: jobId, questions: savedQuestions ?? [] } as Assessment;
  }

  const existing = mockStore.assessments.find((a) => a.company_id === companyId && a.job_id === jobId);
  const assessmentId = existing?.id ?? id();
  const questions = input.questions.map((q) => ({ ...q, assessment_id: assessmentId }));

  if (existing) {
    Object.assign(existing, { ...input, questions });
    return existing;
  }
  const assessment: Assessment = { ...input, questions, id: assessmentId, company_id: companyId, job_id: jobId };
  mockStore.assessments.push(assessment);
  return assessment;
}

export async function sendAssessmentInvite(companyId: string, applicationId: string): Promise<{ attempt: AssessmentAttempt; token: string } | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data: application } = await supabase.from("applications").select("id, job_id").eq("company_id", companyId).eq("id", applicationId).maybeSingle();
    if (!application) return null;
    const { data: assessment } = await supabase.from("assessments").select("id, deadline_days").eq("company_id", companyId).eq("job_id", application.job_id).maybeSingle();
    if (!assessment) return null;

    const token = generateToken();
    const { data: attempt, error } = await supabase
      .from("assessment_attempts")
      .insert({ assessment_id: assessment.id, application_id: applicationId, token_hash: hashToken(token), expires_at: daysFromNow(assessment.deadline_days), status: "pending" })
      .select("*")
      .single();
    if (error) throw error;

    await supabase.from("applications").update({ stage: "assessment", stage_updated_at: new Date().toISOString() }).eq("id", applicationId);

    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    await createAdminSupabaseClient().rpc("increment_usage", { p_company_id: companyId, p_metric: "assessment_invitations" });

    return { attempt: attempt as AssessmentAttempt, token };
  }

  const application = mockStore.applications.find((a) => a.company_id === companyId && a.id === applicationId);
  if (!application) return null;
  const assessment = mockStore.assessments.find((a) => a.company_id === companyId && a.job_id === application.job_id);
  if (!assessment) return null;

  const token = generateToken();
  const attempt: AssessmentAttempt = {
    id: id(),
    assessment_id: assessment.id,
    application_id: applicationId,
    token_hash: hashToken(token),
    starts_at: null,
    expires_at: daysFromNow(assessment.deadline_days),
    started_at: null,
    completed_at: null,
    answers: {},
    score: null,
    section_scores: {},
    passed: null,
    status: "pending",
  };
  mockStore.assessmentAttempts.push(attempt);
  application.stage = "assessment";
  application.stage_updated_at = new Date().toISOString();

  const usage = mockStore.usagePeriods.find((u) => u.company_id === companyId);
  if (usage) usage.assessment_invitations += 1;

  return { attempt, token };
}

/**
 * Candidate token flow — unauthenticated, so this always goes through the
 * service-role client in live mode (no Supabase session exists to satisfy RLS).
 */
export async function getAttemptByToken(token: string) {
  const tokenHash = hashToken(token);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: attempt } = await admin.from("assessment_attempts").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (!attempt) return null;

    const [{ data: assessment }, { data: questions }, { data: application }] = await Promise.all([
      admin.from("assessments").select("*").eq("id", attempt.assessment_id).single(),
      admin.from("assessment_questions").select("*").eq("assessment_id", attempt.assessment_id).order("order_index"),
      admin.from("applications").select("*").eq("id", attempt.application_id).single(),
    ]);
    const [{ data: job }, { data: candidate }] = await Promise.all([
      admin.from("jobs").select("*").eq("id", assessment!.job_id).single(),
      admin.from("candidates").select("*").eq("id", application!.candidate_id).single(),
    ]);
    const { data: company } = await admin.from("companies").select("*").eq("id", job!.company_id).single();

    return { attempt, assessment: { ...assessment, questions: questions ?? [] } as Assessment, application, job, company, candidate };
  }

  const attempt = mockStore.assessmentAttempts.find((a) => a.token_hash === tokenHash);
  if (!attempt) return null;
  const assessment = mockStore.assessments.find((a) => a.id === attempt.assessment_id)!;
  const application = mockStore.applications.find((a) => a.id === attempt.application_id)!;
  const job = mockStore.jobs.find((j) => j.id === assessment.job_id)!;
  const company = mockStore.companies.find((c) => c.id === job.company_id)!;
  const candidate = mockStore.candidates.find((c) => c.id === application.candidate_id)!;
  return { attempt, assessment, application, job, company, candidate };
}

export async function startAttempt(token: string) {
  const tokenHash = hashToken(token);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: attempt } = await admin.from("assessment_attempts").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (!attempt || attempt.status !== "pending") return (attempt as AssessmentAttempt | null) ?? null;
    const { data } = await admin.from("assessment_attempts").update({ started_at: new Date().toISOString(), status: "in_progress" }).eq("id", attempt.id).select("*").single();
    return data as AssessmentAttempt;
  }

  const attempt = mockStore.assessmentAttempts.find((a) => a.token_hash === tokenHash);
  if (!attempt || attempt.status !== "pending") return attempt ?? null;
  attempt.started_at = new Date().toISOString();
  attempt.status = "in_progress";
  return attempt;
}

function scoreAssessment(questions: AssessmentQuestion[], answers: Record<string, string | string[]>) {
  const sectionScores: Record<string, number> = {};
  let total = 0;
  let maxPoints = 0;
  for (const q of questions) {
    maxPoints += q.points;
    if (q.type !== "multiple_choice" || !q.correct_answer) continue;
    const given = answers[q.id];
    const isCorrect = Array.isArray(given) && given.length === q.correct_answer.length && given.every((v) => q.correct_answer!.includes(v));
    const earned = isCorrect ? q.points : 0;
    total += earned;
    sectionScores[q.section] = (sectionScores[q.section] ?? 0) + earned;
  }
  // Written questions contribute their full points toward the section total for demo scoring purposes.
  for (const q of questions.filter((q) => q.type === "written")) {
    sectionScores[q.section] = (sectionScores[q.section] ?? 0) + Math.round(q.points * 0.75);
    total += Math.round(q.points * 0.75);
  }
  return { score: maxPoints ? Math.round((total / maxPoints) * 100) : 0, sectionScores };
}

export async function submitAttempt(token: string, answers: Record<string, string | string[]>) {
  const tokenHash = hashToken(token);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: attempt } = await admin.from("assessment_attempts").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (!attempt) return null;
    const { data: questions } = await admin.from("assessment_questions").select("*").eq("assessment_id", attempt.assessment_id);
    const { data: assessment } = await admin.from("assessments").select("pass_mark").eq("id", attempt.assessment_id).single();

    const { score, sectionScores } = scoreAssessment((questions as AssessmentQuestion[]) ?? [], answers);
    const { data: updated } = await admin
      .from("assessment_attempts")
      .update({ answers, score, section_scores: sectionScores, passed: score >= assessment!.pass_mark, completed_at: new Date().toISOString(), status: "completed" })
      .eq("id", attempt.id)
      .select("*")
      .single();
    return updated as AssessmentAttempt;
  }

  const attempt = mockStore.assessmentAttempts.find((a) => a.token_hash === tokenHash);
  if (!attempt) return null;
  const assessment = mockStore.assessments.find((a) => a.id === attempt.assessment_id)!;

  const { score, sectionScores } = scoreAssessment(assessment.questions, answers);
  attempt.answers = answers;
  attempt.score = score;
  attempt.section_scores = sectionScores;
  attempt.passed = score >= assessment.pass_mark;
  attempt.completed_at = new Date().toISOString();
  attempt.status = "completed";

  return attempt;
}
