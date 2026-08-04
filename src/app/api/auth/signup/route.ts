import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation/auth";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import { setDemoSession } from "@/lib/auth/session";
import { initializeTransaction } from "@/lib/billing/paystack";
import { env, DEMO_MODE } from "@/lib/env";
import { templateDefaults } from "@/lib/data/fixtures";
import type { Company, CompanyMember } from "@/types/database";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const input = parsed.data;

  // Validate the plan before creating any account — creating the account first
  // and validating after would leave an orphaned company/user on an invalid planId.
  const plan = DEMO_MODE
    ? mockStore.plans.find((p) => p.id === input.planId)
    : await getLivePlan(input.planId);
  if (!plan) return NextResponse.json({ error: "Select a valid plan." }, { status: 400 });

  const { companyId, userId, error } = DEMO_MODE ? await createDemoAccount(input) : await createLiveAccount(input);
  if (error) return NextResponse.json({ error }, { status: 409 });

  const reference = `signup_${id()}`;
  const { authorizationUrl } = await initializeTransaction({
    email: input.workEmail,
    planCode: plan.paystack_plan_code,
    reference,
    callbackUrl: env.PAYSTACK_CALLBACK_URL,
    metadata: { company_id: companyId!, user_id: userId!, plan_id: plan.id },
  });

  return NextResponse.json({ redirectUrl: authorizationUrl });
}

async function createDemoAccount(input: ReturnType<typeof signupSchema.parse>) {
  if (mockStore.users.some((u) => u.email.toLowerCase() === input.workEmail.toLowerCase())) {
    return { error: "An account with this email already exists." };
  }
  if (mockStore.companies.some((c) => c.slug === input.slug)) {
    return { error: "That workspace URL is already taken." };
  }

  const now = new Date().toISOString();
  const companyId = id();
  const userId = id();

  const company: Company = {
    id: companyId,
    name: input.companyName,
    slug: input.slug,
    logo_url: null,
    description: input.description ?? null,
    industry: input.industry,
    size: input.size,
    country: input.country,
    city: input.city,
    website: input.website || null,
    contact_email: input.contactEmail,
    brand_color: input.brandColor,
    timezone: input.timezone,
    career_page_status: "unpublished",
    header_style: "gradient",
    social_links: {},
    recruitment_message: null,
    show_company_details: true,
    created_at: now,
    updated_at: now,
  };
  mockStore.companies.push(company);

  mockStore.users.push({
    id: userId,
    fullName: `${input.firstName} ${input.lastName}`,
    email: input.workEmail,
    passwordHash: input.password,
    companyId,
    role: "owner",
    emailVerified: true,
  });

  const member: CompanyMember = {
    id: id(),
    company_id: companyId,
    user_id: userId,
    full_name: `${input.firstName} ${input.lastName}`,
    email: input.workEmail,
    role: "owner",
    status: "active",
    invited_by: null,
    invited_at: null,
    joined_at: now,
  };
  mockStore.companyMembers.push(member);

  for (const template of templateDefaults) {
    mockStore.emailTemplates.push({
      id: id(),
      company_id: companyId,
      type: template.type,
      subject: template.subject,
      body: template.body,
      signature: "",
      reply_to: null,
      sender_display_name: null,
      enabled: true,
      version: 1,
    });
  }

  await setDemoSession({ userId, email: input.workEmail, fullName: member.full_name, companyId, companySlug: company.slug, role: "owner" });

  // Pending subscription so the billing callback (or webhook, in production) knows which
  // plan to activate once payment is confirmed — see spec Part K §23 "First Subscription Flow".
  mockStore.subscriptions.push({
    id: id(),
    company_id: companyId,
    plan_id: input.planId,
    paystack_customer_code: null,
    paystack_subscription_code: null,
    paystack_email_token: null,
    status: "pending",
    period_start: now,
    period_end: now,
    next_payment_date: null,
    cancel_at_period_end: false,
    grace_period_end: null,
    canceled_at: null,
    cancellation_reason: null,
    created_at: now,
    updated_at: now,
  });

  return { companyId, userId, error: null };
}

async function createLiveAccount(input: ReturnType<typeof signupSchema.parse>) {
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const admin = createAdminSupabaseClient();

  const { data: existingCompany } = await admin.from("companies").select("id").eq("slug", input.slug).maybeSingle();
  if (existingCompany) return { error: "That workspace URL is already taken." };

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email: input.workEmail,
    password: input.password,
    email_confirm: true,
  });
  if (createUserError || !created.user) {
    const message = createUserError?.message ?? "";
    if (message.toLowerCase().includes("already")) return { error: "An account with this email already exists." };
    return { error: "Couldn't create your account. Please try again." };
  }
  const userId = created.user.id;
  const now = new Date().toISOString();

  await admin.from("profiles").insert({ id: userId, first_name: input.firstName, last_name: input.lastName, email: input.workEmail });

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: input.companyName,
      slug: input.slug,
      description: input.description || null,
      industry: input.industry,
      size: input.size,
      country: input.country,
      city: input.city,
      website: input.website || null,
      contact_email: input.contactEmail,
      brand_color: input.brandColor,
      timezone: input.timezone,
      career_page_status: "unpublished",
      header_style: "gradient",
      social_links: {},
      show_company_details: true,
    })
    .select("id, slug")
    .single();

  if (companyError || !company) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "Couldn't create your workspace. Please try again." };
  }

  await admin.from("company_members").insert({
    company_id: company.id,
    user_id: userId,
    full_name: `${input.firstName} ${input.lastName}`,
    email: input.workEmail,
    role: "owner",
    status: "active",
    joined_at: now,
  });

  await admin.from("email_templates").insert(
    templateDefaults.map((t) => ({ company_id: company.id, type: t.type, subject: t.subject, body: t.body, signature: "", enabled: true, version: 1 })),
  );

  const { error: subscriptionError } = await admin.from("subscriptions").insert({
    company_id: company.id,
    plan_id: input.planId,
    status: "pending",
    period_start: now,
    period_end: now,
  });
  if (subscriptionError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("companies").delete().eq("id", company.id);
    return { error: "Couldn't create your subscription. Please try again." };
  }

  // Sign in for real through the cookie-bound client so sb-* session cookies land on the response.
  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: input.workEmail, password: input.password });
  if (signInError) return { error: "Account created, but automatic sign-in failed. Please log in." };

  return { companyId: company.id, userId, error: null };
}

async function getLivePlan(planId: string) {
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("plans").select("*").eq("id", planId).maybeSingle();
  return data;
}
