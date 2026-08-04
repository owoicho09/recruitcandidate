import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { sendAssessmentInvite, getAttemptByToken } from "@/lib/services/assessments";
import { checkUsage } from "@/lib/services/billing";
import { sendEmail, getTemplate, renderTemplate } from "@/lib/email/resend";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const session = await requireSession("recruiter");
  const body = await request.json().catch(() => ({}));
  const applicationId = body.applicationId;
  if (typeof applicationId !== "string") return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });

  const usage = await checkUsage(session.companyId, "assessment_invitations");
  if (!usage.allowed) return NextResponse.json({ error: "Your plan's assessment invitation limit has been reached." }, { status: 429 });

  const result = await sendAssessmentInvite(session.companyId, applicationId);
  if (!result) return NextResponse.json({ error: "No assessment is configured for this role yet." }, { status: 404 });

  const detail = await getAttemptByToken(result.token);
  if (detail) {
    const { candidate, job, company } = detail;
    const template = await getTemplate(session.companyId, "assessment_invitation");
    const vars = { first_name: candidate.first_name, role: job.title, company: company.name, link: `${env.NEXT_PUBLIC_APP_URL}/assessment/${result.token}` };
    await sendEmail({
      companyId: session.companyId,
      applicationId,
      type: "assessment_invitation",
      to: candidate.email,
      subject: template ? renderTemplate(template.subject, vars) : `Complete your assessment for ${job.title}`,
      body: template ? renderTemplate(template.body, vars) : `Complete your assessment: ${vars.link}`,
      createdBy: session.userId,
    });
  }

  return NextResponse.json({ ok: true });
}
