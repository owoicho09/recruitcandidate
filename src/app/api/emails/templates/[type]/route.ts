import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { emailTemplateSchema } from "@/lib/validation/email-template";
import { updateEmailTemplate } from "@/lib/services/emails";
import type { EmailTemplateType } from "@/types/database";

export async function PATCH(request: Request, { params }: RouteContext<"/api/emails/templates/[type]">) {
  const session = await requireSession("admin");
  const { type } = await params;
  const body = await request.json().catch(() => null);
  const parsed = emailTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const template = await updateEmailTemplate(session.companyId, type as EmailTemplateType, {
    subject: parsed.data.subject,
    body: parsed.data.body,
    signature: parsed.data.signature ?? "",
    reply_to: parsed.data.replyTo || null,
    sender_display_name: parsed.data.senderDisplayName || null,
    enabled: parsed.data.enabled,
  });

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template });
}
