import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import { id, daysFromNow } from "@/lib/data/ids";
import { hashToken, generateToken } from "@/lib/utils/token";
import { analyzeVideoResponse } from "@/lib/ai/claude";
import type { VideoInterview, VideoInterviewAttempt, VideoQuestion } from "@/types/database";

export async function getVideoInterviewForJob(companyId: string, jobId: string): Promise<VideoInterview | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data: interview } = await supabase.from("video_interviews").select("*").eq("company_id", companyId).eq("job_id", jobId).maybeSingle();
    if (!interview) return null;
    const { data: questions } = await supabase.from("video_questions").select("*").eq("video_interview_id", interview.id).order("order_index");
    return { ...interview, questions: questions ?? [] } as VideoInterview;
  }
  return mockStore.videoInterviews.find((v) => v.company_id === companyId && v.job_id === jobId) ?? null;
}

export async function saveVideoInterview(
  companyId: string,
  jobId: string,
  input: Omit<VideoInterview, "id" | "company_id" | "job_id" | "questions"> & { questions: Omit<VideoQuestion, "video_interview_id">[] },
): Promise<VideoInterview> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { questions, ...interviewFields } = input;

    const { data: existing } = await supabase.from("video_interviews").select("id").eq("company_id", companyId).eq("job_id", jobId).maybeSingle();

    let interviewId = existing?.id;
    if (existing) {
      await supabase.from("video_interviews").update(interviewFields).eq("id", existing.id);
    } else {
      const { data: created, error } = await supabase.from("video_interviews").insert({ ...interviewFields, company_id: companyId, job_id: jobId }).select("id").single();
      if (error) throw error;
      interviewId = created.id;
    }

    await supabase.from("video_questions").delete().eq("video_interview_id", interviewId);
    if (questions.length > 0) {
      await supabase.from("video_questions").insert(questions.map((q) => ({ ...q, video_interview_id: interviewId })));
    }

    const { data: savedQuestions } = await supabase.from("video_questions").select("*").eq("video_interview_id", interviewId).order("order_index");
    return { ...interviewFields, id: interviewId!, company_id: companyId, job_id: jobId, questions: savedQuestions ?? [] } as VideoInterview;
  }

  const existing = mockStore.videoInterviews.find((v) => v.company_id === companyId && v.job_id === jobId);
  const interviewId = existing?.id ?? id();
  const questions = input.questions.map((q) => ({ ...q, video_interview_id: interviewId }));

  if (existing) {
    Object.assign(existing, { ...input, questions });
    return existing;
  }
  const interview: VideoInterview = { ...input, questions, id: interviewId, company_id: companyId, job_id: jobId };
  mockStore.videoInterviews.push(interview);
  return interview;
}

export async function sendVideoInvite(companyId: string, applicationId: string): Promise<{ attempt: VideoInterviewAttempt; token: string } | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data: application } = await supabase.from("applications").select("id, job_id").eq("company_id", companyId).eq("id", applicationId).maybeSingle();
    if (!application) return null;
    const { data: interview } = await supabase.from("video_interviews").select("id, deadline_days").eq("company_id", companyId).eq("job_id", application.job_id).maybeSingle();
    if (!interview) return null;

    const token = generateToken();
    const { data: attempt, error } = await supabase
      .from("video_interview_attempts")
      .insert({ video_interview_id: interview.id, application_id: applicationId, token_hash: hashToken(token), expires_at: daysFromNow(interview.deadline_days), status: "pending" })
      .select("*")
      .single();
    if (error) throw error;

    await supabase.from("applications").update({ stage: "video_interview", stage_updated_at: new Date().toISOString() }).eq("id", applicationId);

    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    await createAdminSupabaseClient().rpc("increment_usage", { p_company_id: companyId, p_metric: "video_interview_candidates" });

    return { attempt: attempt as VideoInterviewAttempt, token };
  }

  const application = mockStore.applications.find((a) => a.company_id === companyId && a.id === applicationId);
  if (!application) return null;
  const interview = mockStore.videoInterviews.find((v) => v.company_id === companyId && v.job_id === application.job_id);
  if (!interview) return null;

  const token = generateToken();
  const attempt: VideoInterviewAttempt = {
    id: id(),
    video_interview_id: interview.id,
    application_id: applicationId,
    token_hash: hashToken(token),
    expires_at: daysFromNow(interview.deadline_days),
    started_at: null,
    completed_at: null,
    status: "pending",
  };
  mockStore.videoInterviewAttempts.push(attempt);
  application.stage = "video_interview";
  application.stage_updated_at = new Date().toISOString();

  const usage = mockStore.usagePeriods.find((u) => u.company_id === companyId);
  if (usage) usage.video_interview_candidates += 1;

  return { attempt, token };
}

/**
 * Candidate token flow — unauthenticated, so this always goes through the
 * service-role client in live mode (no Supabase session exists to satisfy RLS).
 */
export async function getVideoAttemptByToken(token: string) {
  const tokenHash = hashToken(token);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: attempt } = await admin.from("video_interview_attempts").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (!attempt) return null;

    const [{ data: interview }, { data: questions }, { data: application }] = await Promise.all([
      admin.from("video_interviews").select("*").eq("id", attempt.video_interview_id).single(),
      admin.from("video_questions").select("*").eq("video_interview_id", attempt.video_interview_id).order("order_index"),
      admin.from("applications").select("*").eq("id", attempt.application_id).single(),
    ]);
    const [{ data: job }, { data: candidate }] = await Promise.all([
      admin.from("jobs").select("*").eq("id", interview!.job_id).single(),
      admin.from("candidates").select("*").eq("id", application!.candidate_id).single(),
    ]);
    const { data: company } = await admin.from("companies").select("*").eq("id", job!.company_id).single();

    return { attempt, interview: { ...interview, questions: questions ?? [] } as VideoInterview, application, job, company, candidate };
  }

  const attempt = mockStore.videoInterviewAttempts.find((a) => a.token_hash === tokenHash);
  if (!attempt) return null;
  const interview = mockStore.videoInterviews.find((v) => v.id === attempt.video_interview_id)!;
  const application = mockStore.applications.find((a) => a.id === attempt.application_id)!;
  const job = mockStore.jobs.find((j) => j.id === interview.job_id)!;
  const company = mockStore.companies.find((c) => c.id === job.company_id)!;
  const candidate = mockStore.candidates.find((c) => c.id === application.candidate_id)!;
  return { attempt, interview, application, job, company, candidate };
}

export async function startVideoAttempt(token: string) {
  const tokenHash = hashToken(token);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: attempt } = await admin.from("video_interview_attempts").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (!attempt) return null;
    if (attempt.status === "pending") {
      const { data } = await admin.from("video_interview_attempts").update({ started_at: new Date().toISOString(), status: "in_progress" }).eq("id", attempt.id).select("*").single();
      return data as VideoInterviewAttempt;
    }
    return attempt as VideoInterviewAttempt;
  }

  const attempt = mockStore.videoInterviewAttempts.find((a) => a.token_hash === tokenHash);
  if (!attempt) return null;
  if (attempt.status === "pending") {
    attempt.started_at = new Date().toISOString();
    attempt.status = "in_progress";
  }
  return attempt;
}

/** Called once per recorded answer — simulates the direct-to-storage upload + async transcription/analysis pipeline. */
export async function submitVideoResponse(token: string, questionId: string, durationSeconds: number) {
  const tokenHash = hashToken(token);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: attempt } = await admin.from("video_interview_attempts").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (!attempt) return null;
    const { data: question } = await admin.from("video_questions").select("*").eq("id", questionId).single();

    const analysis = await analyzeVideoResponse(question as VideoQuestion, `Transcribed response to: "${question.prompt}" (demo transcript).`);
    const { data: response, error } = await admin
      .from("video_responses")
      .insert({
        attempt_id: attempt.id,
        question_id: questionId,
        storage_path: `${attempt.id}/${questionId}.webm`,
        duration_seconds: durationSeconds,
        transcript: analysis.transcript,
        transcript_status: "complete",
        ai_score: analysis.ai_score,
        ai_analysis: analysis.ai_analysis,
      })
      .select("*")
      .single();
    if (error) throw error;
    return response;
  }

  const attempt = mockStore.videoInterviewAttempts.find((a) => a.token_hash === tokenHash);
  if (!attempt) return null;
  const interview = mockStore.videoInterviews.find((v) => v.id === attempt.video_interview_id)!;
  const question = interview.questions.find((q) => q.id === questionId)!;

  const analysis = await analyzeVideoResponse(question, `Transcribed response to: "${question.prompt}" (demo transcript).`);
  const response = {
    id: id(),
    attempt_id: attempt.id,
    question_id: questionId,
    storage_path: `demo/videos/${attempt.id}/${questionId}.webm`,
    duration_seconds: durationSeconds,
    transcript: analysis.transcript,
    transcript_status: "complete" as const,
    ai_score: analysis.ai_score,
    ai_analysis: analysis.ai_analysis,
    employer_score: null,
    created_at: new Date().toISOString(),
  };
  mockStore.videoResponses.push(response);
  return response;
}

export async function completeVideoAttempt(token: string) {
  const tokenHash = hashToken(token);

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from("video_interview_attempts")
      .update({ completed_at: new Date().toISOString(), status: "completed" })
      .eq("token_hash", tokenHash)
      .select("*")
      .maybeSingle();
    return (data as VideoInterviewAttempt | null) ?? null;
  }

  const attempt = mockStore.videoInterviewAttempts.find((a) => a.token_hash === tokenHash);
  if (!attempt) return null;
  attempt.completed_at = new Date().toISOString();
  attempt.status = "completed";
  return attempt;
}

export async function updateVideoResponseEmployerScore(responseId: string, employerScore: number) {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("video_responses").update({ employer_score: employerScore }).eq("id", responseId).select("*").maybeSingle();
    return data ?? null;
  }
  const response = mockStore.videoResponses.find((r) => r.id === responseId);
  if (!response) return null;
  response.employer_score = employerScore;
  return response;
}
