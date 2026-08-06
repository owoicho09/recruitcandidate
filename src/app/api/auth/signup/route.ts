import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation/auth";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import { setDemoSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/resend";
import { env, DEMO_MODE } from "@/lib/env";
import { templateDefaults } from "@/lib/data/fixtures";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { slugify } from "@/lib/utils/slug";
import { trackLifecycleEvent } from "@/lib/services/lifecycle";
import type { Company, CompanyMember } from "@/types/database";

/** No slug is collected at signup — derive one from the company name and de-duplicate against whatever already exists. */
async function generateUniqueSlug(companyName: string): Promise<string> {
  const base = slugify(companyName) || "workspace";

  if (DEMO_MODE) {
    let slug = base;
    let suffix = 2;
    while (mockStore.companies.some((c) => c.slug === slug)) slug = `${base}-${suffix++}`;
    return slug;
  }

  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  let slug = base;
  let suffix = 2;
  for (;;) {
    const { data } = await admin.from("companies").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${suffix++}`;
  }
}

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`signup:${getClientIp(request)}`, 5, 60 * 60);
  if (!allowed) return NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const input = parsed.data;
  const slug = await generateUniqueSlug(input.companyName);

  const { companyId, userId, error } = DEMO_MODE ? await createDemoAccount(input, slug) : await createLiveAccount(input, slug);
  if (error) return NextResponse.json({ error }, { status: 409 });

  await trackLifecycleEvent(companyId!, "account_created", userId ?? null);

  await notifySignup(companyId!, input.workEmail, input.firstName, input.companyName);

  return NextResponse.json({ ok: true });
}

/**
 * No subscription is created at signup — accounts can explore the dashboard
 * and draft jobs freely; only publishing a job requires choosing a plan
 * (see the jobs/[id]/status route's checkUsage("active_jobs") gate).
 */
async function createDemoAccount(input: ReturnType<typeof signupSchema.parse>, slug: string) {
  if (mockStore.users.some((u) => u.email.toLowerCase() === input.workEmail.toLowerCase())) {
    return { error: "An account with this email already exists." };
  }

  const now = new Date().toISOString();
  const companyId = id();
  const userId = id();

  const company: Company = {
    id: companyId,
    name: input.companyName,
    slug,
    logo_url: null,
    description: null,
    industry: null,
    size: null,
    country: null,
    city: null,
    website: null,
    contact_email: input.workEmail,
    brand_color: "#3730a3",
    timezone: "Africa/Lagos",
    career_page_status: "published",
    header_style: "gradient",
    social_links: {},
    recruitment_message: null,
    show_company_details: true,
    lifecycle_segment: "signup_incomplete_setup",
    lifecycle_segment_updated_at: now,
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

  return { companyId, userId, error: null };
}

async function createLiveAccount(input: ReturnType<typeof signupSchema.parse>, slug: string) {
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const admin = createAdminSupabaseClient();

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
      slug,
      description: null,
      industry: null,
      size: null,
      country: null,
      city: null,
      website: null,
      contact_email: input.workEmail,
      brand_color: "#3730a3",
      timezone: "Africa/Lagos",
      career_page_status: "published",
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

  // Sign in for real through the cookie-bound client so sb-* session cookies land on the response.
  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: input.workEmail, password: input.password });
  if (signInError) return { error: "Account created, but automatic sign-in failed. Please log in." };

  return { companyId: company.id, userId, error: null };
}

async function notifySignup(companyId: string, workEmail: string, firstName: string, companyName: string) {
  const supportEmail = env.EMAIL_SUPPORT_ADDRESS;

  await sendEmail({
    companyId,
    type: "welcome",
    to: workEmail,
    subject: `Welcome to ${env.NEXT_PUBLIC_APP_NAME}, ${firstName}`,
    body: `Hi ${firstName},\n\nYour workspace "${companyName}" is ready. You can explore your dashboard right away — post a job, set up your career page, and invite your team. To start publishing jobs and receiving applications, pick a plan from the Billing page whenever you're ready.\n\nNeed help getting started? Just reply to this email or reach us at ${supportEmail} — we're happy to help.\n\nWelcome aboard,\nThe ${env.NEXT_PUBLIC_APP_NAME} Team`,
  });

  if (env.EMAIL_ADMIN_NOTIFY) {
    await sendEmail({
      companyId,
      type: "admin_new_signup_notification",
      to: env.EMAIL_ADMIN_NOTIFY,
      subject: `New signup: ${companyName}`,
      body: `New workspace created.\n\nCompany: ${companyName}\nOwner: ${firstName} (${workEmail})\n\nNo plan selected yet — they'll choose one from the billing page.`,
    });
  }
}
