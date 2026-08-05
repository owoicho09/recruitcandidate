import { NextResponse } from "next/server";
import { applicationSchema } from "@/lib/validation/application";
import { submitApplication } from "@/lib/services/applications";
import { checkUsage } from "@/lib/services/usage-tracking";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getJob } from "@/lib/services/jobs";
import { sendEmail, getTemplate, renderTemplate } from "@/lib/email/resend";
import { env } from "@/lib/env";

const MAX_CV_BYTES = env.MAX_CV_FILE_MB * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  const companySlug = form.get("companySlug");
  const jobId = form.get("jobId");
  const answersRaw = form.get("answers");
  const cv = form.get("cv");

  if (typeof companySlug !== "string" || typeof jobId !== "string") {
    return NextResponse.json({ error: "Missing job reference" }, { status: 400 });
  }
  if (!(cv instanceof File) || cv.size === 0) {
    return NextResponse.json({ error: "A CV file is required" }, { status: 400 });
  }
  if (cv.size > MAX_CV_BYTES) {
    return NextResponse.json({ error: `CV must be under ${env.MAX_CV_FILE_MB}MB` }, { status: 400 });
  }

  const parsed = applicationSchema.safeParse({
    firstName: form.get("firstName"),
    lastName: form.get("lastName"),
    email: form.get("email"),
    phone: form.get("phone"),
    location: form.get("location"),
    linkedinUrl: form.get("linkedinUrl") || "",
    portfolioUrl: form.get("portfolioUrl") || "",
    coverNote: form.get("coverNote") || "",
    consent: form.get("consent") === "true",
    privacyAcknowledged: form.get("privacyAcknowledged") === "true",
    answers: answersRaw ? JSON.parse(String(answersRaw)) : {},
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const company = await getCompanyBySlug(companySlug);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const usage = await checkUsage(company.id, "applications");
  if (!usage.allowed) {
    return NextResponse.json({ error: "Applications for this role are temporarily unavailable. Please check back later or contact the company directly." }, { status: 429 });
  }

  const input = parsed.data;
  const result = await submitApplication(companySlug, jobId, {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    location: input.location,
    linkedin_url: input.linkedinUrl || undefined,
    portfolio_url: input.portfolioUrl || undefined,
    cover_note: input.coverNote || undefined,
    cv_filename: cv.name,
    application_answers: input.answers,
  });

  if (!result) return NextResponse.json({ error: "This role is no longer accepting applications." }, { status: 404 });

  const job = await getJob(company.id, jobId);
  const template = await getTemplate(company.id, "application_received");
  const vars = { first_name: input.firstName, role: job?.title ?? "the role", company: company.name, link: `${env.NEXT_PUBLIC_APP_URL}/application/track/${result.trackingToken}` };
  await sendEmail({
    companyId: company.id,
    applicationId: result.application.id,
    type: "application_received",
    to: input.email,
    subject: template ? renderTemplate(template.subject, vars) : `We've received your application for ${vars.role}`,
    body: template ? renderTemplate(template.body, vars) : `Thanks for applying, ${input.firstName}.`,
  });

  return NextResponse.json({ ok: true, trackingToken: result.trackingToken });
}
