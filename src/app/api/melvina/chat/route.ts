import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { getCompany } from "@/lib/services/companies";
import { getPlanForCompany } from "@/lib/services/plan-access";
import { createMelvinaStream, extractComplaint } from "@/lib/ai/melvina";
import { sendPlatformEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) })).min(1).max(40),
});

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [company, plan] = await Promise.all([getCompany(session.companyId), getPlanForCompany(session.companyId)]);
  const context = {
    firstName: session.fullName.split(" ")[0] || session.fullName,
    companyName: company?.name ?? "your workspace",
    role: session.role,
    planName: plan?.name ?? null,
  };

  const melvinaStream = await createMelvinaStream(parsed.data.messages, context);
  if (!melvinaStream) {
    return NextResponse.json({ error: "Melvina isn't available right now." }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      melvinaStream.on("text", (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      melvinaStream.on("end", async () => {
        try {
          const final = await melvinaStream.finalMessage();
          const complaint = extractComplaint(final);
          if (complaint && env.EMAIL_ADMIN_NOTIFY) {
            await sendPlatformEmail({
              to: env.EMAIL_ADMIN_NOTIFY,
              subject: `[Melvina — ${complaint.severity} complaint] ${context.companyName}`,
              body: `Reported via Melvina by ${session.fullName} (${session.email}), ${context.role} at ${context.companyName} (${plan?.name ?? "no plan"}).\n\nSeverity: ${complaint.severity}\n\n${complaint.summary}`,
              replyTo: session.email,
            });
          }
        } catch (err) {
          console.error("Melvina complaint handling failed:", err instanceof Error ? err.message : err);
        } finally {
          controller.close();
        }
      });
      melvinaStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      melvinaStream.abort();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
