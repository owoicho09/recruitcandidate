import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { getCompany } from "@/lib/services/companies";
import { getPlanForCompany } from "@/lib/services/plan-access";
import { listJobs } from "@/lib/services/jobs";
import { onboardingStageFor } from "@/lib/onboarding-stage";
import { createMelvinaStream, extractComplaint } from "@/lib/ai/melvina";
import { sendPlatformEmail } from "@/lib/email/resend";
import { logMelvinaExchange } from "@/lib/services/melvina-log";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  // Bounded: every message is resent to the model on each turn, so unbounded input is unbounded AI spend.
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(40),
});

export async function POST(request: Request) {
  const session = await requireSession();
  const allowed = await checkRateLimit(`melvina:${session.userId}`, 30, 10 * 60);
  if (!allowed) return NextResponse.json({ error: "You're sending messages very quickly — please wait a few minutes and try again." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [company, plan, jobs] = await Promise.all([getCompany(session.companyId), getPlanForCompany(session.companyId), listJobs(session.companyId)]);
  const context = {
    firstName: session.fullName.split(" ")[0] || session.fullName,
    companyName: company?.name ?? "your workspace",
    role: session.role,
    planName: plan?.name ?? null,
    onboardingStage: onboardingStageFor(jobs),
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

          const lastUserMessage = parsed.data.messages.at(-1);
          const assistantText = final.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("");
          if (lastUserMessage?.role === "user" && assistantText) {
            await logMelvinaExchange(session.companyId, session.userId, lastUserMessage.content, assistantText);
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
