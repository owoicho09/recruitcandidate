import type { Metadata } from "next";
import { getAttemptByToken } from "@/lib/services/assessments";
import { ErrorState } from "@/components/ui/states";
import { AssessmentRunner } from "@/components/candidate/assessment-runner";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessmentTokenPage({ params }: PageProps<"/assessment/[token]">) {
  const { token } = await params;
  const detail = await getAttemptByToken(token);

  if (!detail) {
    return <div className="mx-auto max-w-lg px-4 py-16"><ErrorState title="Link not found" description="This assessment link is invalid." /></div>;
  }
  if (new Date(detail.attempt.expires_at) < new Date() && detail.attempt.status !== "completed") {
    return <div className="mx-auto max-w-lg px-4 py-16"><ErrorState title="Link expired" description="This assessment invitation has expired. Contact the employer for a new link." /></div>;
  }

  // AssessmentRunner is a client component — everything passed to it ships to
  // the candidate's browser, so the answer key must be stripped here.
  const assessment = { ...detail.assessment, questions: detail.assessment.questions.map((q) => ({ ...q, correct_answer: null })) };
  const attempt = { ...detail.attempt, token_hash: "" };

  return <AssessmentRunner token={token} assessment={assessment} attempt={attempt} job={detail.job} company={detail.company} />;
}
