import type { Job } from "@/types/database";

export type OnboardingStage = "new" | "job_drafted" | "published";

/** Where a company is in the "sign up → draft a role → publish it" first-run journey — used to tailor the dashboard welcome state and Melvina's guidance. */
export function onboardingStageFor(jobs: Pick<Job, "status">[]): OnboardingStage {
  if (jobs.some((j) => j.status === "published")) return "published";
  if (jobs.length > 0) return "job_drafted";
  return "new";
}
