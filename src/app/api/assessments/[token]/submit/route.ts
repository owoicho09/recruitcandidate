import { NextResponse } from "next/server";
import { submitAttempt, getAttemptByToken } from "@/lib/services/assessments";
import { sendEmail, getTemplate, renderTemplate } from "@/lib/email/resend";

export async function POST(request: Request, { params }: RouteContext<"/api/assessments/[token]/submit">) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers : {};
  const attempt = await submitAttempt(token, answers);
  if (!attempt) return NextResponse.json({ error: "This assessment link is invalid, has expired, or was already submitted." }, { status: 404 });

  const detail = await getAttemptByToken(token);
  if (detail) {
    const { candidate, job, company, application } = detail;
    const template = await getTemplate(company.id, "assessment_completed");
    const vars = { first_name: candidate.first_name, role: job.title, company: company.name };
    await sendEmail({
      companyId: company.id,
      applicationId: application.id,
      type: "assessment_completed",
      to: candidate.email,
      subject: template ? renderTemplate(template.subject, vars) : `Assessment received — ${job.title}`,
      body: template ? renderTemplate(template.body, vars) : "Thanks for completing your assessment.",
    });
  }

  return NextResponse.json({ attempt: { id: attempt.id, status: attempt.status, completed_at: attempt.completed_at } });
}
