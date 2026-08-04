import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import type { Application, Candidate, Job } from "@/types/database";

export interface QualifiedCandidateRow {
  application: Application;
  candidate: Candidate;
  cvScore: number | null;
  assessmentScore: number | null;
  videoScore: number | null;
  combinedScore: number | null;
}

export interface QualifiedGroup {
  job: Job;
  openings: number;
  lastUpdated: string;
  candidates: QualifiedCandidateRow[];
}

export async function getQualifiedByRole(companyId: string): Promise<QualifiedGroup[]> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();

    const { data: jobs } = await supabase.from("jobs").select("*").eq("company_id", companyId);
    if (!jobs || jobs.length === 0) return [];

    const { data: apps } = await supabase
      .from("applications")
      .select("*, candidates(*)")
      .eq("company_id", companyId)
      .eq("stage", "qualified")
      .in("job_id", jobs.map((j) => j.id));
    if (!apps || apps.length === 0) return [];

    const applicationIds = apps.map((a) => a.id);
    const [{ data: screenings }, { data: attempts }, { data: videoAttempts }] = await Promise.all([
      supabase.from("ai_screening_results").select("application_id, overall_score").in("application_id", applicationIds),
      supabase.from("assessment_attempts").select("application_id, score").in("application_id", applicationIds),
      supabase.from("video_interview_attempts").select("id, application_id").in("application_id", applicationIds),
    ]);

    const videoAttemptIds = (videoAttempts ?? []).map((a) => a.id);
    const { data: videoResponses } = videoAttemptIds.length
      ? await supabase.from("video_responses").select("attempt_id, ai_score").in("attempt_id", videoAttemptIds)
      : { data: [] };

    const groups: QualifiedGroup[] = [];
    for (const job of jobs as Job[]) {
      const jobApps = apps.filter((a) => a.job_id === job.id);
      if (jobApps.length === 0) continue;

      const rows: QualifiedCandidateRow[] = jobApps.map((row) => {
        const { candidates, ...application } = row as unknown as Application & { candidates: Candidate };
        const cvScore = screenings?.find((s) => s.application_id === application.id)?.overall_score ?? null;
        const assessmentScore = attempts?.find((a) => a.application_id === application.id)?.score ?? null;
        const videoAttempt = videoAttempts?.find((a) => a.application_id === application.id);
        const responses = videoAttempt ? (videoResponses ?? []).filter((r) => r.attempt_id === videoAttempt.id) : [];
        const videoScore = responses.length ? Math.round(responses.reduce((sum, r) => sum + (r.ai_score ?? 0), 0) / responses.length) : null;

        const parts = [cvScore, assessmentScore, videoScore].filter((v): v is number => v !== null);
        const combinedScore = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;

        return { application, candidate: candidates, cvScore, assessmentScore, videoScore, combinedScore };
      });

      groups.push({
        job,
        openings: job.openings_count,
        lastUpdated: rows.reduce((latest, r) => (r.application.stage_updated_at > latest ? r.application.stage_updated_at : latest), rows[0].application.stage_updated_at),
        candidates: rows.sort((a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0)),
      });
    }

    return groups;
  }

  const jobs = mockStore.jobs.filter((j) => j.company_id === companyId);
  const groups: QualifiedGroup[] = [];

  for (const job of jobs) {
    const apps = mockStore.applications.filter((a) => a.company_id === companyId && a.job_id === job.id && a.stage === "qualified");
    if (apps.length === 0) continue;

    const rows: QualifiedCandidateRow[] = apps.map((application) => {
      const candidate = mockStore.candidates.find((c) => c.id === application.candidate_id)!;
      const cvScore = mockStore.aiScreeningResults.find((s) => s.application_id === application.id)?.overall_score ?? null;
      const assessmentScore = mockStore.assessmentAttempts.find((a) => a.application_id === application.id)?.score ?? null;
      const attempt = mockStore.videoInterviewAttempts.find((a) => a.application_id === application.id);
      const responses = attempt ? mockStore.videoResponses.filter((r) => r.attempt_id === attempt.id) : [];
      const videoScore = responses.length ? Math.round(responses.reduce((sum, r) => sum + (r.ai_score ?? 0), 0) / responses.length) : null;

      const parts = [cvScore, assessmentScore, videoScore].filter((v): v is number => v !== null);
      const combinedScore = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;

      return { application, candidate, cvScore, assessmentScore, videoScore, combinedScore };
    });

    groups.push({
      job,
      openings: job.openings_count,
      lastUpdated: rows.reduce((latest, r) => (r.application.stage_updated_at > latest ? r.application.stage_updated_at : latest), rows[0].application.stage_updated_at),
      candidates: rows.sort((a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0)),
    });
  }

  return groups;
}
