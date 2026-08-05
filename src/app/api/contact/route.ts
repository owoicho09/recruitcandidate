import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendPlatformEmail } from "@/lib/email/resend";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1),
  workEmail: z.string().email(),
  company: z.string().min(1),
  teamSize: z.string().min(1),
  hiringVolume: z.string().min(1),
  message: z.string().min(10),
});

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`contact:${getClientIp(request)}`, 5, 60 * 60);
  if (!allowed) return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const { name, workEmail, company, teamSize, hiringVolume, message } = parsed.data;

  if (env.EMAIL_ADMIN_NOTIFY) {
    await sendPlatformEmail({
      to: env.EMAIL_ADMIN_NOTIFY,
      subject: `New contact form submission from ${company}`,
      body: `${name} (${workEmail}) at ${company}\nTeam size: ${teamSize}\nHiring volume: ${hiringVolume}\n\n${message}`,
      replyTo: workEmail,
    });
  }

  return NextResponse.json({ ok: true });
}
