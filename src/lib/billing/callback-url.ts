import { env } from "@/lib/env";

/**
 * Where Paystack sends the customer after paying. PAYSTACK_CALLBACK_URL wins
 * when it's set for real, but its default is localhost — a deployment that
 * forgot to set it would strand every paying customer on a dead page, so in
 * that case use the origin the checkout request actually came from.
 */
export function billingCallbackUrl(request: Request): string {
  const configured = env.PAYSTACK_CALLBACK_URL;
  const requestOrigin = new URL(request.url).origin;
  const configuredIsLocal = /\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(configured);
  const requestIsLocal = /\/\/(localhost|127\.0\.0\.1)(:|$)/.test(requestOrigin);
  if (configured && !(configuredIsLocal && !requestIsLocal)) return configured;
  return `${requestOrigin}/dashboard/billing/callback`;
}
