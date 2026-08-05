import { createHmac, timingSafeEqual } from "crypto";
import { env, flags } from "@/lib/env";

export type PaystackMetadata = { company_id: string; user_id?: string; plan_id?: string; purpose: string; [key: string]: unknown };

export interface InitializeTransactionInput {
  email: string;
  reference: string;
  callbackUrl: string;
  metadata: PaystackMetadata;
  /** Present for subscription checkout — Paystack charges the plan's own configured amount. */
  planCode?: string;
  /** Required when planCode is omitted (one-time add-on/credit purchases) — Naira, converted to kobo at the API boundary. */
  amountNaira?: number;
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
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      ...(input.planCode ? { plan: input.planCode } : { amount: Math.round((input.amountNaira ?? 0) * 100) }),
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
  authorizationCode: string | null;
  amount: number;
  currency: string;
  metadata: Partial<PaystackMetadata>;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  if (!flags.hasPaystack) {
    return { status: "success", reference, customerCode: "CUS_demo123", subscriptionCode: "SUB_demo123", authorizationCode: "AUTH_demo123", amount: 0, currency: env.PAYSTACK_CURRENCY, metadata: {} };
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
    authorizationCode: json.data.authorization?.authorization_code ?? null,
    amount: json.data.amount,
    currency: json.data.currency,
    metadata: json.data.metadata ?? {},
  };
}

export interface ChargeAuthorizationResult {
  status: "success" | "failed";
  reference: string;
  amount: number;
}

/**
 * Recharges a saved card (used to renew recurring add-ons alongside the base
 * subscription's own renewal — Paystack subscriptions don't support add-ons
 * natively, so this rides the authorization code captured from the last
 * successful charge instead of a second Paystack Plan).
 */
export async function chargeAuthorization(authorizationCode: string, email: string, amountNaira: number, reference: string, metadata: PaystackMetadata): Promise<ChargeAuthorizationResult> {
  if (!flags.hasPaystack) {
    return { status: "success", reference, amount: amountNaira * 100 };
  }

  const response = await fetch(`${env.PAYSTACK_BASE_URL}/transaction/charge_authorization`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ authorization_code: authorizationCode, email, amount: Math.round(amountNaira * 100), reference, metadata }),
  });
  const json = await response.json();
  if (!response.ok || !json.status) throw new Error(json.message ?? "Paystack recharge failed");

  return { status: json.data.status === "success" ? "success" : "failed", reference: json.data.reference, amount: json.data.amount };
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
