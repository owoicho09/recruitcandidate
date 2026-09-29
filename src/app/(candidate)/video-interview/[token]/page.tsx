import type { Metadata } from "next";
import { getVideoAttemptByToken } from "@/lib/services/video-interviews";
import { ErrorState } from "@/components/ui/states";
import { VideoInterviewRunner } from "@/components/candidate/video-interview-runner";

export const metadata: Metadata = { title: "Video Interview" };

export default async function VideoInterviewTokenPage({ params }: PageProps<"/video-interview/[token]">) {
  const { token } = await params;
  const detail = await getVideoAttemptByToken(token);

  if (!detail) {
    return <div className="mx-auto max-w-lg px-4 py-16"><ErrorState title="Link not found" description="This video interview link is invalid." /></div>;
  }
  if (new Date(detail.attempt.expires_at) < new Date() && detail.attempt.status !== "completed") {
    return <div className="mx-auto max-w-lg px-4 py-16"><ErrorState title="Link expired" description="This video interview invitation has expired. Contact the employer for a new link." /></div>;
  }

  // Client component — strip what the candidate shouldn't see (employer scoring criteria, token hash).
  const interview = { ...detail.interview, questions: detail.interview.questions.map((q) => ({ ...q, scoring_criteria: [] })) };
  const attempt = { ...detail.attempt, token_hash: "" };

  return <VideoInterviewRunner token={token} interview={interview} attempt={attempt} job={detail.job} company={detail.company} />;
}
