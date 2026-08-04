import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { careerPageSchema } from "@/lib/validation/career-page";
import { updateCompany } from "@/lib/services/companies";

export async function PATCH(request: Request) {
  const session = await requireSession("admin");
  const body = await request.json().catch(() => null);
  const parsed = careerPageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const input = parsed.data;

  const company = await updateCompany(session.companyId, {
    description: input.description || null,
    brand_color: input.brandColor,
    header_style: input.headerStyle,
    city: input.city || null,
    country: input.country || null,
    website: input.website || null,
    contact_email: input.contactEmail || null,
    recruitment_message: input.recruitmentMessage || null,
    show_company_details: input.showCompanyDetails,
    logo_url: input.logoUrl ?? undefined,
    social_links: { linkedin: input.linkedin || undefined, twitter: input.twitter || undefined, facebook: input.facebook || undefined },
  });

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json({ company });
}
