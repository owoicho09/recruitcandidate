import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getJob } from "@/lib/services/jobs";
import { getVideoInterviewForJob } from "@/lib/services/video-interviews";
import { VideoInterviewBuilder } from "@/components/dashboard/video-interview-builder";

export const metadata: Metadata = { title: "Video Interview" };

export default async function JobVideoInterviewPage({ params }: PageProps<"/dashboard/jobs/[id]/video-interview">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const job = await getJob(session.companyId, id);
  if (!job) notFound();

  const videoInterview = await getVideoInterviewForJob(session.companyId, id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Video Interview — {job.title}</h1>
        <p className="text-sm text-foreground-muted">Candidates record answers asynchronously through a secure link.</p>
      </div>
      <VideoInterviewBuilder jobId={id} videoInterview={videoInterview} />
    </div>
  );
}
