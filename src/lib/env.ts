import { z } from "zod";

/**
 * Server-side environment module. Never import this from a "use client"
 * component — it holds secret keys. Client components should import from
 * `@/lib/env-public` instead.
 *
 * Every var is optional at the schema level so the app can boot in demo
 * mode with zero configuration. Individual service modules (lib/ai,
 * lib/email, lib/billing, lib/supabase) decide at call time whether they
 * have enough real configuration to use their live path, and fall back to
 * the mock path otherwise — see `flags` below.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("RecruitCandidates"),
  APP_DOMAIN: z.string().default("recruitcandidates.com"),
  APP_ENCRYPTION_KEY: z.string().default(""),
  TOKEN_HASH_SECRET: z.string().default("dev-token-hash-secret-change-me"),
  INTERNAL_JOB_SECRET: z.string().default(""),

  NEXT_PUBLIC_DEMO_MODE: z.string().default("true"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  SUPABASE_DATABASE_URL: z.string().default(""),

  SUPABASE_CV_BUCKET: z.string().default("cvs"),
  SUPABASE_VIDEO_BUCKET: z.string().default("videos"),
  SUPABASE_LOGO_BUCKET: z.string().default("company-logos"),
  MAX_CV_FILE_MB: z.coerce.number().default(10),
  MAX_VIDEO_FILE_MB: z.coerce.number().default(250),
  DEFAULT_VIDEO_RETENTION_DAYS: z.coerce.number().default(90),

  RESEND_API_KEY: z.string().default(""),
  RESEND_WEBHOOK_SECRET: z.string().default(""),
  EMAIL_FROM_NAME: z.string().default("RecruitCandidates"),
  EMAIL_FROM_ADDRESS: z.string().default("notifications@recruitcandidates.com"),
  EMAIL_REPLY_TO: z.string().default("support@recruitcandidates.com"),
  EMAIL_SUPPORT_ADDRESS: z.string().default("support@recruitcandidates.com"),
  EMAIL_ADMIN_NOTIFY: z.string().default(""),
  ASSESSMENT_REMINDER_1_HOURS: z.coerce.number().default(48),
  ASSESSMENT_REMINDER_2_HOURS: z.coerce.number().default(120),
  VIDEO_REMINDER_1_HOURS: z.coerce.number().default(48),
  VIDEO_REMINDER_2_HOURS: z.coerce.number().default(120),

  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_SCREENING_MODEL: z.string().default("claude-sonnet-5"),
  ANTHROPIC_INTERVIEW_MODEL: z.string().default("claude-sonnet-5"),
  ANTHROPIC_EMAIL_MODEL: z.string().default("claude-sonnet-5"),
  // Cheapest tier — used for the high-volume Melvina support widget, not screening/analysis.
  ANTHROPIC_CHAT_MODEL: z.string().default("claude-haiku-4-5-20251001"),
  ANTHROPIC_REQUEST_TIMEOUT_MS: z.coerce.number().default(60000),
  ANTHROPIC_MAX_RETRIES: z.coerce.number().default(2),
  AI_SCREENING_PROMPT_VERSION: z.string().default("v1"),
  AI_INTERVIEW_PROMPT_VERSION: z.string().default("v1"),
  AI_REJECTION_PROMPT_VERSION: z.string().default("v1"),

  PAYSTACK_PUBLIC_KEY: z.string().default(""),
  PAYSTACK_SECRET_KEY: z.string().default(""),
  PAYSTACK_BASE_URL: z.string().default("https://api.paystack.co"),
  PAYSTACK_CALLBACK_URL: z.string().default("http://localhost:3000/dashboard/billing/callback"),
  PAYSTACK_WEBHOOK_URL: z.string().default("http://localhost:3000/api/webhooks/paystack"),
  PAYSTACK_CURRENCY: z.string().default("NGN"),
  // Real Paystack Plan codes, created in the Paystack dashboard and synced into
  // the `plans` table via `scripts/sync-plan-codes.mjs` — the DB row is what
  // checkout actually reads, these env vars are just the operational input.
  PAYSTACK_STARTER_MONTHLY_PLAN_CODE: z.string().default(""),
  PAYSTACK_GROWTH_MONTHLY_PLAN_CODE: z.string().default(""),
  PAYSTACK_SCALE_MONTHLY_PLAN_CODE: z.string().default(""),
  PAYSTACK_STARTER_ANNUAL_PLAN_CODE: z.string().default(""),
  PAYSTACK_GROWTH_ANNUAL_PLAN_CODE: z.string().default(""),
  PAYSTACK_SCALE_ANNUAL_PLAN_CODE: z.string().default(""),
  PAYMENT_GRACE_PERIOD_DAYS: z.coerce.number().default(3),

  PLATFORM_ADMIN_EMAIL: z.string().default(""),
  // Required outside demo mode — platform-admin login is refused until both this and PLATFORM_ADMIN_EMAIL are set.
  PLATFORM_ADMIN_PASSWORD: z.string().default(""),
  PLATFORM_ADMIN_SESSION_SECRET: z.string().default("dev-platform-admin-secret-change-me"),
  RATE_LIMIT_SECRET: z.string().default(""),
  AUTH_COOKIE_NAME: z.string().default("recruitcandidates_session"),
  SESSION_TTL_HOURS: z.coerce.number().default(8),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().default(3600),
  CANDIDATE_TOKEN_TTL_DAYS: z.coerce.number().default(14),

  SENTRY_DSN: z.string().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().default(""),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check .env.example for the required shape.");
}

export const env = parsed.data;

/** Feature-level readiness flags — each service module falls back to its mock path when false. */
export const flags = {
  hasSupabase: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasSupabaseAdmin: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  hasClaude: Boolean(env.ANTHROPIC_API_KEY),
  hasResend: Boolean(env.RESEND_API_KEY),
  hasPaystack: Boolean(env.PAYSTACK_SECRET_KEY && env.PAYSTACK_PUBLIC_KEY),
};

/**
 * Global demo mode. True unless the operator both set NEXT_PUBLIC_DEMO_MODE=false
 * and configured Supabase. Individual integrations (AI/email/billing) can still
 * run live independently of this flag once their own keys are present.
 */
export const DEMO_MODE = env.NEXT_PUBLIC_DEMO_MODE !== "false" || !flags.hasSupabase;

if (env.NODE_ENV === "development" && !DEMO_MODE) {
  const missing: string[] = [];
  if (!flags.hasSupabaseAdmin) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.TOKEN_HASH_SECRET || env.TOKEN_HASH_SECRET === "dev-token-hash-secret-change-me") {
    missing.push("TOKEN_HASH_SECRET");
  }
  if (missing.length > 0) {
    console.warn(
      `[env] DEMO_MODE is off but the following are still using dev defaults: ${missing.join(", ")}. ` +
        `Some server routes will refuse to run live actions until these are set.`,
    );
  }
}
