import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getJob } from "@/lib/services/jobs";
import { JobForm } from "@/components/dashboard/job-form";

export const metadata: Metadata = { title: "Edit Job" };

export default async function EditJobPage({ params }: PageProps<"/dashboard/jobs/[id]/edit">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const job = await getJob(session.companyId, id);
  if (!job) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit {job.title}</h1>
      </div>
      <JobForm job={job} />
    </div>
  );
}
