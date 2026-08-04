import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";

const schema = z.object({
  name: z.string().min(1),
  workEmail: z.string().email(),
  company: z.string().min(1),
  teamSize: z.string().min(1),
  hiringVolume: z.string().min(1),
  message: z.string().min(10),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const { name, workEmail, company, teamSize, hiringVolume, message } = parsed.data;

  if (env.EMAIL_ADMIN_NOTIFY) {
    await sendEmail({
      companyId: "platform",
      type: "new_application",
      to: env.EMAIL_ADMIN_NOTIFY,
      subject: `New contact form submission from ${company}`,
      body: `${name} (${workEmail}) at ${company}\nTeam size: ${teamSize}\nHiring volume: ${hiringVolume}\n\n${message}`,
    });
  }

  return NextResponse.json({ ok: true });
}
