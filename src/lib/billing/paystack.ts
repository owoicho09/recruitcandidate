import { createHmac, timingSafeEqual } from "crypto";
import { env, flags } from "@/lib/env";

export interface InitializeTransactionInput {
  email: string;
  planCode: string;
  reference: string;
  callbackUrl: string;
  metadata: { company_id: string; user_id: string; plan_id: string };
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/**
 * Initializes a Paystack transaction. In demo mode (no PAYSTACK_SECRET_KEY)
 * this skips the real HTTP call and returns a fabricated authorization URL
 * that the demo checkout flow treats as "already paid" — see
 * /dashboard/billing/callback.
 */
export async function initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  if (!flags.hasPaystack) {
    return {
      authorizationUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing/callback?reference=${input.reference}&demo=1`,
      accessCode: `demo_access_${input.reference}`,
      reference: input.reference,
    };
  }

  const response = await fetch(`${env.PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      plan: input.planCode,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
  const json = await response.json();
  if (!response.ok || !json.status) throw new Error(json.message ?? "Paystack initialization failed");

  return { authorizationUrl: json.data.authorization_url, accessCode: json.data.access_code, reference: json.data.reference };
}

export interface VerifyTransactionResult {
  status: "success" | "failed" | "abandoned";
  reference: string;
  customerCode: string | null;
  subscriptionCode: string | null;
  amount: number;
  currency: string;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  if (!flags.hasPaystack) {
    return { status: "success", reference, customerCode: "CUS_demo123", subscriptionCode: "SUB_demo123", amount: 0, currency: env.PAYSTACK_CURRENCY };
  }

  const response = await fetch(`${env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? "Paystack verification failed");

  return {
    status: json.data.status,
    reference: json.data.reference,
    customerCode: json.data.customer?.customer_code ?? null,
    subscriptionCode: json.data.plan_object?.plan_code ?? null,
    amount: json.data.amount,
    currency: json.data.currency,
  };
}

/**
 * Validates the x-paystack-signature header per spec Part K §23 — this runs
 * for real regardless of demo mode, since it's pure HMAC verification with
 * no network call. When PAYSTACK_SECRET_KEY is unset (demo mode) the webhook
 * route treats every request as untrusted and rejects it.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!flags.hasPaystack || !signatureHeader) return false;
  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function planCodeForSlug(slug: "starter" | "growth" | "pro", interval: "monthly" | "annual"): string {
  const key = `PAYSTACK_${slug.toUpperCase()}_${interval.toUpperCase()}_PLAN_CODE` as keyof typeof env;
  return (env[key] as string) ?? "";
}
