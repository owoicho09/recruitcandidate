import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyWebhookSignature } from "@/lib/billing/paystack";
import {
  activateSubscription,
  cancelSubscription,
  markPastDue,
  hasProcessedEvent,
  recordSubscriptionEvent,
  markEventFailed,
  setSubscriptionCancelAtPeriodEnd,
  setSubscriptionStatus,
  getCompanyOwnerEmail,
} from "@/lib/services/billing";
import { sendEmail } from "@/lib/email/resend";

/**
 * Spec Part K §23 "Webhook Security": read the raw body, validate the
 * x-paystack-signature header via HMAC SHA-512, reject invalid signatures,
 * process idempotently by event hash, and return quickly. This is the
 * authoritative subscription event source in production — the demo-mode
 * checkout callback (`/dashboard/billing/callback`) performs the same
 * activation inline since no real Paystack instance can reach this route
 * from a local/demo deployment.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventKey = createHash("sha256").update(rawBody).digest("hex");

  if (await hasProcessedEvent(eventKey)) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  const companyId: string | undefined = event.data?.metadata?.company_id;
  const record = await recordSubscriptionEvent({
    event_key: eventKey,
    event_type: event.event,
    company_id: companyId ?? null,
    subscription_id: null,
    payload: event,
    processed_at: new Date().toISOString(),
    processing_status: "processed",
    error: null,
    created_at: new Date().toISOString(),
  });

  try {
    await processEvent(event, companyId);
  } catch (err) {
    await markEventFailed(record.id, err instanceof Error ? err.message : "Unknown error");
  }

  return NextResponse.json({ ok: true });
}

interface PaystackWebhookEvent {
  event: string;
  data: {
    metadata?: { plan_id?: string };
    customer?: { customer_code?: string };
    subscription_code?: string;
  };
}

async function processEvent(event: PaystackWebhookEvent, companyId?: string) {
  switch (event.event) {
    case "charge.success":
    case "subscription.create": {
      if (!companyId) return;
      const planId = event.data.metadata?.plan_id ?? (await resolveFallbackPlanId());
      await activateSubscription(companyId, planId, event.data.customer?.customer_code ?? "CUS_unknown", event.data.subscription_code ?? "SUB_unknown");
      break;
    }
    case "invoice.payment_failed": {
      if (!companyId) return;
      await markPastDue(companyId);
      const ownerEmail = await getCompanyOwnerEmail(companyId);
      if (ownerEmail) {
        await sendEmail({ companyId, type: "payment_failed", to: ownerEmail, subject: "Your RecruitCandidates payment failed", body: "We couldn't process your latest payment. Please update your payment method to avoid service interruption." });
      }
      break;
    }
    case "subscription.not_renew": {
      if (!companyId) return;
      await setSubscriptionCancelAtPeriodEnd(companyId, true);
      break;
    }
    case "subscription.disable": {
      if (!companyId) return;
      await cancelSubscription(companyId, "Disabled via Paystack");
      await setSubscriptionStatus(companyId, "canceled");
      break;
    }
    case "subscription.expiring_cards": {
      if (!companyId) return;
      const ownerEmail = await getCompanyOwnerEmail(companyId);
      if (ownerEmail) {
        await sendEmail({ companyId, type: "card_expiring", to: ownerEmail, subject: "Your card on file is expiring soon", body: "Update your payment method before your card expires to avoid an interruption in service." });
      }
      break;
    }
    case "invoice.create":
    case "invoice.update":
      // Informational — surfaced via the billing dashboard's payment history, no state change needed.
      break;
    default:
      break;
  }
}

async function resolveFallbackPlanId(): Promise<string> {
  const { flags } = await import("@/lib/env");
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data } = await admin.from("plans").select("id").eq("slug", "growth").single();
    return data!.id;
  }
  const { mockStore } = await import("@/lib/data/store");
  return mockStore.plans.find((p) => p.slug === "growth")!.id;
}
