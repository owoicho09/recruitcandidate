import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendPlatformEmail } from "@/lib/email/resend";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  category: z.enum(["bug", "billing", "feature_request", "complaint", "other"]),
  message: z.string().min(10, "Tell us a bit more (at least 10 characters)"),
});

const CATEGORY_LABEL: Record<z.infer<typeof schema>["category"], string> = {
  bug: "Bug report",
  billing: "Billing question",
  feature_request: "Feature request",
  complaint: "Complaint",
  other: "Other",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }
  const { name, email, category, message } = parsed.data;

  // Best-effort: if the submitter happens to be logged in, attach their
  // workspace so support requests can be triaged without asking who they are.
  const session = await getSession().catch(() => null);
  const context = session ? `\n\nWorkspace: ${session.companySlug} (${session.role})\nAccount: ${session.email}` : "";

  if (env.EMAIL_ADMIN_NOTIFY) {
    await sendPlatformEmail({
      to: env.EMAIL_ADMIN_NOTIFY,
      subject: `[${CATEGORY_LABEL[category]}] ${name}`,
      body: `${name} (${email})\nCategory: ${CATEGORY_LABEL[category]}${context}\n\n${message}`,
      replyTo: email,
    });
  }

  await sendPlatformEmail({
    to: email,
    subject: "We've received your message",
    body: `Hi ${name},\n\nThanks for reaching out — we've received your message and will get back to you as soon as we can, usually within one business day.\n\nYour message:\n${message}\n\nBest,\nThe ${env.NEXT_PUBLIC_APP_NAME} Team`,
  });

  return NextResponse.json({ ok: true });
}
