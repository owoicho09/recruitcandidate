import { NextResponse } from "next/server";
import { completeVideoAttempt, getVideoAttemptByToken } from "@/lib/services/video-interviews";
import { sendEmail, getTemplate, renderTemplate } from "@/lib/email/resend";

export async function POST(request: Request, { params }: RouteContext<"/api/video-interviews/[token]/complete">) {
  const { token } = await params;
  const attempt = await completeVideoAttempt(token);
  if (!attempt) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

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

  return NextResponse.json({ attempt });
}
