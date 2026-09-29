import { NextResponse } from "next/server";
import { completeVideoAttempt, getVideoAttemptByToken } from "@/lib/services/video-interviews";
import { sendEmail, getTemplate, renderTemplate } from "@/lib/email/resend";

export async function POST(request: Request, { params }: RouteContext<"/api/video-interviews/[token]/complete">) {
  const { token } = await params;
  // Idempotent for a retried request whose first response was lost — no second confirmation email.
  const before = await getVideoAttemptByToken(token);
  if (before?.attempt.status === "completed") {
    return NextResponse.json({ attempt: { id: before.attempt.id, status: before.attempt.status, completed_at: before.attempt.completed_at } });
  }
  const attempt = await completeVideoAttempt(token);
  if (!attempt) return NextResponse.json({ error: "This interview link is invalid, has expired, or was already completed." }, { status: 404 });

  const detail = await getVideoAttemptByToken(token);
  if (detail) {
    const { candidate, job, company, application } = detail;
    const template = await getTemplate(company.id, "video_interview_completed");
    const vars = { first_name: candidate.first_name, role: job.title, company: company.name };
    await sendEmail({
      companyId: company.id,
      applicationId: application.id,
      type: "video_interview_completed",
      to: candidate.email,
      subject: template ? renderTemplate(template.subject, vars) : `Video interview received — ${job.title}`,
      body: template ? renderTemplate(template.body, vars) : "Thanks for completing your video interview.",
    });
  }

  return NextResponse.json({ attempt: { id: attempt.id, status: attempt.status, completed_at: attempt.completed_at } });
}
