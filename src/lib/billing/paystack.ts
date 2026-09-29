import { createHmac, timingSafeEqual } from "crypto";
import { env, flags, DEMO_MODE } from "@/lib/env";

export type PaystackMetadata = { company_id: string; user_id?: string; plan_id?: string; purpose: string; [key: string]: unknown };

export interface InitializeTransactionInput {
  email: string;
  reference: string;
  callbackUrl: string;
  metadata: PaystackMetadata;
  /** Present for subscription checkout — Paystack charges the plan's own configured amount, but the initialize call still requires `amount` to match it or the API rejects the request. */
  planCode?: string;
  /** Naira, converted to kobo at the API boundary. Always required — Paystack's initialize endpoint rejects requests with no `amount`, even when `plan` is set. */
  amountNaira: number;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/**
 * The fabricated "already paid" demo flow is only safe while the whole app is
 * in demo mode. A live deployment that's merely missing its Paystack keys must
 * fail loudly instead — otherwise every checkout would be granted for free.
 */
function isDemoPayments(): boolean {
  if (flags.hasPaystack) return false;
  if (!DEMO_MODE) throw new Error("Payments are not configured on this server (PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY missing)");
  return true;
}

async function paystackRequest<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(`${env.PAYSTACK_BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.status === false) throw new Error(json.message ?? `Paystack request failed (${response.status})`);
  return json.data as T;
}

/**
 * Initializes a Paystack transaction. In demo mode (no PAYSTACK_SECRET_KEY)
 * this skips the real HTTP call and returns a fabricated authorization URL
 * that the demo checkout flow treats as "already paid" — see
 * /dashboard/billing/callback.
 */
export async function initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  if (isDemoPayments()) {
    return {
      authorizationUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing/callback?reference=${input.reference}&demo=1`,
      accessCode: `demo_access_${input.reference}`,
      reference: input.reference,
    };
  }

  const data = await paystackRequest<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: input.email,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      amount: Math.round(input.amountNaira * 100),
      ...(input.planCode ? { plan: input.planCode } : {}),
    },
  });

  return { authorizationUrl: data.authorization_url, accessCode: data.access_code, reference: data.reference };
}

export interface VerifyTransactionResult {
  status: "success" | "failed" | "abandoned";
  reference: string;
  customerCode: string | null;
  /** The Paystack Plan code the transaction was made against (PLN_…) — not a subscription code. */
  planCode: string | null;
  authorizationCode: string | null;
  /** Kobo. */
  amount: number;
  currency: string;
  metadata: Partial<PaystackMetadata>;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  if (isDemoPayments()) {
    return { status: "success", reference, customerCode: "CUS_demo123", planCode: null, authorizationCode: "AUTH_demo123", amount: 0, currency: env.PAYSTACK_CURRENCY, metadata: {} };
  }

  const data = await paystackRequest<{
    status: VerifyTransactionResult["status"];
    reference: string;
    amount: number;
    currency: string;
    metadata: Partial<PaystackMetadata> | string | null;
    customer?: { customer_code?: string };
    plan?: string | null;
    plan_object?: { plan_code?: string };
    authorization?: { authorization_code?: string; reusable?: boolean };
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);

  return {
    status: data.status,
    reference: data.reference,
    customerCode: data.customer?.customer_code ?? null,
    planCode: data.plan_object?.plan_code ?? (typeof data.plan === "string" ? data.plan : null),
    authorizationCode: data.authorization?.reusable === false ? null : data.authorization?.authorization_code ?? null,
    amount: data.amount,
    currency: data.currency,
    // Paystack echoes metadata back as a JSON string when it was sent as one.
    metadata: typeof data.metadata === "string" ? safeParse(data.metadata) : data.metadata ?? {},
  };
}

function safeParse(value: string): Partial<PaystackMetadata> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export interface PaystackSubscription {
  subscriptionCode: string;
  emailToken: string;
  status: string;
  planCode: string | null;
  nextPaymentDate: string | null;
}

interface RawSubscription {
  subscription_code: string;
  email_token: string;
  status: string;
  next_payment_date: string | null;
  createdAt?: string;
  plan?: { plan_code?: string } | number;
  customer?: { customer_code?: string } | number;
}

function toSubscription(raw: RawSubscription): PaystackSubscription {
  return {
    subscriptionCode: raw.subscription_code,
    emailToken: raw.email_token,
    status: raw.status,
    planCode: typeof raw.plan === "object" ? raw.plan?.plan_code ?? null : null,
    nextPaymentDate: raw.next_payment_date,
  };
}

/**
 * A plan checkout creates the Paystack subscription asynchronously, and the
 * transaction verify response doesn't carry its code — so look it up by
 * customer + plan. Its code and email token are what cancel/reactivate need.
 */
export async function findSubscription(customerCode: string, planCode: string): Promise<PaystackSubscription | null> {
  if (isDemoPayments()) return null;

  const [customer, plan] = await Promise.all([
    paystackRequest<{ id: number }>(`/customer/${encodeURIComponent(customerCode)}`),
    paystackRequest<{ id: number }>(`/plan/${encodeURIComponent(planCode)}`),
  ]);
  const list = await paystackRequest<RawSubscription[]>(`/subscription?customer=${customer.id}&plan=${plan.id}&perPage=20`);
  const newest = [...list].sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0))[0];
  return newest ? toSubscription(newest) : null;
}

export async function fetchSubscription(subscriptionCode: string): Promise<PaystackSubscription> {
  return toSubscription(await paystackRequest<RawSubscription>(`/subscription/${encodeURIComponent(subscriptionCode)}`));
}

/** Stops future renewal charges. Access already paid for is kept by our own period_end. */
export async function disableSubscription(subscriptionCode: string, emailToken: string): Promise<void> {
  if (isDemoPayments()) return;
  await paystackRequest("/subscription/disable", { method: "POST", body: { code: subscriptionCode, token: emailToken } });
}

/**
 * Starts a Paystack subscription on a saved card. With startDate, the first
 * charge happens then — used to resume a canceled plan at the end of the
 * period already paid for (Paystack can't re-enable a disabled subscription).
 */
export async function createSubscription(input: { customerCode: string; planCode: string; authorizationCode: string; startDate?: string }): Promise<PaystackSubscription> {
  const data = await paystackRequest<RawSubscription>("/subscription", {
    method: "POST",
    body: { customer: input.customerCode, plan: input.planCode, authorization: input.authorizationCode, ...(input.startDate ? { start_date: input.startDate } : {}) },
  });
  return toSubscription(data);
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
  if (isDemoPayments()) {
    return { status: "success", reference, amount: amountNaira * 100 };
  }

  const data = await paystackRequest<{ status: string; reference: string; amount: number }>("/transaction/charge_authorization", {
    method: "POST",
    body: { authorization_code: authorizationCode, email, amount: Math.round(amountNaira * 100), reference, metadata },
  });

  return { status: data.status === "success" ? "success" : "failed", reference: data.reference, amount: data.amount };
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
