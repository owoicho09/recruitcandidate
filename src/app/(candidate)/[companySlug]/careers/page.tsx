import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPublishedJobsForCompany } from "@/lib/services/jobs";
import { CareerPageContent } from "@/components/candidate/career-page-content";

export async function generateMetadata({ params }: PageProps<"/[companySlug]/careers">): Promise<Metadata> {
  const { companySlug } = await params;
  const { company } = await listPublishedJobsForCompany(companySlug);
  if (!company) return {};
  return { title: `Careers at ${company.name}`, description: company.description ?? undefined };
}

export default async function CareerPage({ params }: PageProps<"/[companySlug]/careers">) {
  const { companySlug } = await params;
  const { company, jobs } = await listPublishedJobsForCompany(companySlug);
  if (!company || company.career_page_status !== "published") notFound();

  return <CareerPageContent company={company} jobs={jobs} />;
}
