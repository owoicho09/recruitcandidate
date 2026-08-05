import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { sendVideoInvite, getVideoAttemptByToken } from "@/lib/services/video-interviews";
import { sendEmail, getTemplate, renderTemplate } from "@/lib/email/resend";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const session = await requireSession("recruiter");
  const body = await request.json().catch(() => ({}));
  const applicationId = body.applicationId;
  if (typeof applicationId !== "string") return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });

  // Video interview invitations ride the same application allowance consumed
  // at submission time — not metered separately (see assessments/invite for the same pattern).
  const result = await sendVideoInvite(session.companyId, applicationId);
  if (!result) return NextResponse.json({ error: "No video interview is configured for this role yet." }, { status: 404 });

  const detail = await getVideoAttemptByToken(result.token);
  if (detail) {
    const { candidate, job, company } = detail;
    const template = await getTemplate(session.companyId, "video_interview_invitation");
    const vars = { first_name: candidate.first_name, role: job.title, company: company.name, link: `${env.NEXT_PUBLIC_APP_URL}/video-interview/${result.token}` };
    await sendEmail({
      companyId: session.companyId,
      applicationId,
      type: "video_interview_invitation",
      to: candidate.email,
      subject: template ? renderTemplate(template.subject, vars) : `Record your video interview for ${job.title}`,
      body: template ? renderTemplate(template.body, vars) : `Complete your video interview: ${vars.link}`,
      createdBy: session.userId,
    });
  }

  return NextResponse.json({ ok: true });
}
