import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPublishedJobsForCompany } from "@/lib/services/jobs";
import { CareerPageContent } from "@/components/candidate/career-page-content";
import { UnpublishedState } from "@/components/ui/states";

export async function generateMetadata({ params }: PageProps<"/[companySlug]/careers">): Promise<Metadata> {
  const { companySlug } = await params;
  const { company } = await listPublishedJobsForCompany(companySlug);
  if (!company) return {};
  return { title: `Careers at ${company.name}`, description: company.description ?? undefined };
}

export default async function CareerPage({ params }: PageProps<"/[companySlug]/careers">) {
  const { companySlug } = await params;
  const { company, jobs } = await listPublishedJobsForCompany(companySlug);
  if (!company) notFound();

  if (company.career_page_status !== "published") {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-lg items-center px-6">
        <UnpublishedState
          description={`${company.name} hasn't published this career page yet. If you're part of the team, publish it from your dashboard to make it visible to candidates.`}
        />
      </div>
    );
  }

  return <CareerPageContent company={company} jobs={jobs} />;
}
