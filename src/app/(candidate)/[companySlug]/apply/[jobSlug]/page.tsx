import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJobBySlug } from "@/lib/services/jobs";
import { getCompanyBySlug } from "@/lib/services/companies";
import { ApplicationForm } from "@/components/candidate/application-form";

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

  return <ApplicationForm company={company} job={result.job} />;
}
