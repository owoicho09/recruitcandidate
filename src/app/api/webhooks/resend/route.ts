import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { env, flags } from "@/lib/env";
import { updateEmailLogStatusByResendId } from "@/lib/email/resend";

const TOLERANCE_SECONDS = 5 * 60;

/**
 * Resend delivers webhooks through Svix, whose signing scheme is not a plain
 * HMAC-hex comparison: the secret is "whsec_<base64>", the signed payload is
 * `{svix-id}.{svix-timestamp}.{body}`, the signature is base64 (not hex), and
 * the header can carry multiple space-separated "v1,<sig>" values (for secret
 * rotation) — any one matching is sufficient. See https://docs.svix.com/receiving/verifying-payloads/how-manual.
 */
function verifySignature(rawBody: string, svixId: string | null, svixTimestamp: string | null, svixSignature: string | null): boolean {
  if (!flags.hasResend || !env.RESEND_WEBHOOK_SECRET || !svixId || !svixTimestamp || !svixSignature) return false;

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(env.RESEND_WEBHOOK_SECRET.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuf = Buffer.from(expected);

  return svixSignature.split(" ").some((part) => {
    const sig = part.startsWith("v1,") ? part.slice(3) : part;
    const sigBuf = Buffer.from(sig, "base64");
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}

/** Updates EmailLog delivery status from Resend's delivery/bounce/complaint events. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!verifySignature(rawBody, svixId, svixTimestamp, svixSignature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const resendId: string | undefined = event.data?.email_id;

  if (resendId) {
    if (event.type === "email.delivered") {
      await updateEmailLogStatusByResendId(resendId, { status: "delivered", delivered_at: new Date().toISOString() });
    } else if (event.type === "email.bounced" || event.type === "email.complained") {
      await updateEmailLogStatusByResendId(resendId, { status: "failed", failure_reason: event.type });
    }
  }

  return NextResponse.json({ ok: true });
}
