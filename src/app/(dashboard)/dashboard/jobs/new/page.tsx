import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { JobForm } from "@/components/dashboard/job-form";

export const metadata: Metadata = { title: "New Job" };

export default async function NewJobPage() {
  await requireSession("recruiter");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Create a job</h1>
        <p className="text-sm text-foreground-muted">It&apos;s created as a draft — publish when you&apos;re ready.</p>
      </div>
      <JobForm />
    </div>
  );
}
