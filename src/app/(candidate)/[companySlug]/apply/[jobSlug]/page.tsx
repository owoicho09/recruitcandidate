import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJobBySlug } from "@/lib/services/jobs";
import { getCompanyBySlug } from "@/lib/services/companies";
import { checkUsage } from "@/lib/services/usage-tracking";
import { ApplicationForm } from "@/components/candidate/application-form";
import { ErrorState } from "@/components/ui/states";

export async function generateMetadata({ params }: PageProps<"/[companySlug]/apply/[jobSlug]">): Promise<Metadata> {
  const { companySlug, jobSlug } = await params;
  const result = await getJobBySlug(companySlug, jobSlug);
  if (!result) return {};
  return { title: `Apply — ${result.job.title}` };
}

export default async function ApplyPage({ params }: PageProps<"/[companySlug]/apply/[jobSlug]">) {
  const { companySlug, jobSlug } = await params;
  const [result, company] = await Promise.all([getJobBySlug(companySlug, jobSlug), getCompanyBySlug(companySlug)]);
  if (!result || !company) notFound();

  // Pre-check so candidates never fill out a whole form only to be blocked at
  // submission — /api/applications still enforces this as the source of truth.
  const usage = await checkUsage(company.id, "applications");
  if (!usage.allowed) {
    return (
      <ErrorState
        title="Applications temporarily unavailable"
        description="Applications for this role are temporarily unavailable. Please check back later or contact the company directly."
      />
    );
  }

  return <ApplicationForm company={company} job={result.job} />;
}
