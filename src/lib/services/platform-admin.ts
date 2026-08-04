import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import type { Application, AuditLog, Candidate, Company, CompanyMember, Job, Payment, Plan, Subscription, UsagePeriod } from "@/types/database";

/**
 * Platform admin is authenticated via its own signed cookie (see
 * lib/auth/platform-admin.ts), not Supabase Auth, so there is no RLS-friendly
 * session to scope these queries to — every read here is intentionally
 * cross-tenant and goes through the admin (service-role) client.
 */
export async function getPlatformStats() {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const [
      { count: totalCompanies },
      { data: activeSubscriptions },
      { count: failedPayments },
      { count: applicationsProcessed },
      { count: aiScreenings },
      { count: videoInterviews },
      { data: usagePeriods },
      { count: emailVolume },
      { count: newSubscriptionsThisMonth },
    ] = await Promise.all([
      admin.from("companies").select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("plan_id").eq("status", "active"),
      admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("applications").select("id", { count: "exact", head: true }),
      admin.from("ai_screening_results").select("id", { count: "exact", head: true }),
      admin.from("video_interview_attempts").select("id", { count: "exact", head: true }).eq("status", "completed"),
      admin.from("usage_periods").select("storage_bytes"),
      admin.from("email_logs").select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);

    const planIds = [...new Set((activeSubscriptions ?? []).map((s) => s.plan_id))];
    const { data: plans } = planIds.length ? await admin.from("plans").select("id, amount").in("id", planIds) : { data: [] };
    const mrr = (activeSubscriptions ?? []).reduce((sum, s) => sum + (plans?.find((p) => p.id === s.plan_id)?.amount ?? 0), 0);

    return {
      totalCompanies: totalCompanies ?? 0,
      activeSubscriptions: activeSubscriptions?.length ?? 0,
      mrr,
      newSubscriptionsThisMonth: newSubscriptionsThisMonth ?? 0,
      failedPayments: failedPayments ?? 0,
      applicationsProcessed: applicationsProcessed ?? 0,
      aiScreenings: aiScreenings ?? 0,
      videoInterviews: videoInterviews ?? 0,
      storageBytes: (usagePeriods ?? []).reduce((sum, u) => sum + u.storage_bytes, 0),
      emailVolume: emailVolume ?? 0,
    };
  }

  const companies = mockStore.companies;
  const activeSubscriptions = mockStore.subscriptions.filter((s) => s.status === "active");
  const mrr = activeSubscriptions.reduce((sum, s) => {
    const plan = mockStore.plans.find((p) => p.id === s.plan_id);
    return sum + (plan?.amount ?? 0);
  }, 0);
  const failedPayments = mockStore.payments.filter((p) => p.status === "failed").length;

  return {
    totalCompanies: companies.length,
    activeSubscriptions: activeSubscriptions.length,
    mrr,
    newSubscriptionsThisMonth: mockStore.subscriptions.filter((s) => {
      const days = (Date.now() - new Date(s.created_at).getTime()) / 86400000;
      return days <= 30;
    }).length,
    failedPayments,
    applicationsProcessed: mockStore.applications.length,
    aiScreenings: mockStore.aiScreeningResults.length,
    videoInterviews: mockStore.videoInterviewAttempts.filter((a) => a.status === "completed").length,
    storageBytes: mockStore.usagePeriods.reduce((sum, u) => sum + u.storage_bytes, 0),
    emailVolume: mockStore.emailLogs.length,
  };
}

export async function listCompaniesForAdmin() {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const { data: companiesData } = await admin.from("companies").select("*");
    if (!companiesData || companiesData.length === 0) return [];
    const companies = companiesData as Company[];
    const companyIds = companies.map((c) => c.id);

    const [{ data: subscriptions }, { data: owners }, { data: usagePeriods }] = (await Promise.all([
      admin.from("subscriptions").select("*").in("company_id", companyIds),
      admin.from("company_members").select("*").in("company_id", companyIds).eq("role", "owner"),
      admin.from("usage_periods").select("*").in("company_id", companyIds),
    ])) as [{ data: Subscription[] | null }, { data: CompanyMember[] | null }, { data: UsagePeriod[] | null }];

    const planIds = [...new Set((subscriptions ?? []).map((s) => s.plan_id))];
    const { data: plans } = (planIds.length ? await admin.from("plans").select("*").in("id", planIds) : { data: [] }) as { data: Plan[] | null };

    return companies.map((company) => {
      const subscription = subscriptions?.find((s) => s.company_id === company.id) ?? null;
      const plan = subscription ? plans?.find((p) => p.id === subscription.plan_id) ?? null : null;
      const owner = owners?.find((m) => m.company_id === company.id) ?? null;
      const usage = usagePeriods?.find((u) => u.company_id === company.id) ?? null;
      return { company, subscription, plan, owner, usage };
    });
  }

  return mockStore.companies.map((company) => {
    const subscription = mockStore.subscriptions.find((s) => s.company_id === company.id) ?? null;
    const plan = subscription ? mockStore.plans.find((p) => p.id === subscription.plan_id) ?? null : null;
    const owner = mockStore.companyMembers.find((m) => m.company_id === company.id && m.role === "owner") ?? null;
    const usage = mockStore.usagePeriods.find((u) => u.company_id === company.id) ?? null;
    return { company, subscription, plan, owner, usage };
  });
}

export async function getCompanyForAdmin(companyId: string) {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const { data: companyData } = await admin.from("companies").select("*").eq("id", companyId).maybeSingle();
    if (!companyData) return null;
    const company = companyData as Company;

    const [{ data: subscription }, { data: members }, { data: usage }, { data: payments }, { data: auditLogs }, { data: jobs }, { data: applications }] = (await Promise.all([
      admin.from("subscriptions").select("*").eq("company_id", companyId).maybeSingle(),
      admin.from("company_members").select("*").eq("company_id", companyId),
      admin.from("usage_periods").select("*").eq("company_id", companyId).maybeSingle(),
      admin.from("payments").select("*").eq("company_id", companyId),
      admin.from("audit_logs").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      admin.from("jobs").select("*").eq("company_id", companyId),
      admin.from("applications").select("*").eq("company_id", companyId),
    ])) as [
      { data: Subscription | null },
      { data: CompanyMember[] | null },
      { data: UsagePeriod | null },
      { data: Payment[] | null },
      { data: AuditLog[] | null },
      { data: Job[] | null },
      { data: Application[] | null },
    ];

    const plan = subscription ? ((await admin.from("plans").select("*").eq("id", subscription.plan_id).maybeSingle()).data as Plan | null) : null;

    return { company, subscription: subscription ?? null, plan: plan ?? null, members: members ?? [], usage: usage ?? null, payments: payments ?? [], auditLogs: auditLogs ?? [], jobs: jobs ?? [], applications: applications ?? [] };
  }

  const company = mockStore.companies.find((c) => c.id === companyId);
  if (!company) return null;
  const subscription = mockStore.subscriptions.find((s) => s.company_id === companyId) ?? null;
  const plan = subscription ? mockStore.plans.find((p) => p.id === subscription.plan_id) ?? null : null;
  const members = mockStore.companyMembers.filter((m) => m.company_id === companyId);
  const usage = mockStore.usagePeriods.find((u) => u.company_id === companyId) ?? null;
  const payments = mockStore.payments.filter((p) => p.company_id === companyId);
  const auditLogs = mockStore.auditLogs.filter((a) => a.company_id === companyId).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const jobs = mockStore.jobs.filter((j) => j.company_id === companyId);
  const applications = mockStore.applications.filter((a) => a.company_id === companyId);
  return { company, subscription, plan, members, usage, payments, auditLogs, jobs, applications };
}

export async function listSubscriptionsForAdmin() {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const { data: subscriptionsData } = await admin.from("subscriptions").select("*");
    if (!subscriptionsData || subscriptionsData.length === 0) return [];
    const subscriptions = subscriptionsData as Subscription[];

    const companyIds = [...new Set(subscriptions.map((s) => s.company_id))];
    const planIds = [...new Set(subscriptions.map((s) => s.plan_id))];
    const [{ data: companies }, { data: plans }] = (await Promise.all([
      admin.from("companies").select("*").in("id", companyIds),
      planIds.length ? admin.from("plans").select("*").in("id", planIds) : Promise.resolve({ data: [] }),
    ])) as [{ data: Company[] | null }, { data: Plan[] | null }];

    return subscriptions.map((subscription) => ({
      subscription,
      company: companies!.find((c) => c.id === subscription.company_id)!,
      plan: plans?.find((p) => p.id === subscription.plan_id) ?? null,
    }));
  }

  return mockStore.subscriptions.map((subscription) => {
    const company = mockStore.companies.find((c) => c.id === subscription.company_id)!;
    const plan = mockStore.plans.find((p) => p.id === subscription.plan_id) ?? null;
    return { subscription, company, plan };
  });
}

export async function listPaymentsForAdmin() {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const { data: paymentsData } = await admin.from("payments").select("*").order("paid_at", { ascending: false, nullsFirst: false });
    if (!paymentsData || paymentsData.length === 0) return [];
    const payments = paymentsData as Payment[];

    const companyIds = [...new Set(payments.map((p) => p.company_id))];
    const { data: companies } = (await admin.from("companies").select("*").in("id", companyIds)) as { data: Company[] | null };

    return payments.map((payment) => ({ payment, company: companies!.find((c) => c.id === payment.company_id)! }));
  }

  return mockStore.payments
    .map((payment) => ({ payment, company: mockStore.companies.find((c) => c.id === payment.company_id)! }))
    .sort((a, b) => +new Date(b.payment.paid_at ?? 0) - +new Date(a.payment.paid_at ?? 0));
}

export async function getSystemHealth() {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const [{ count: failedCvParsing }, { count: unreadableCvs }, { count: failedScreening }, { count: failedTranscription }, { count: failedEmail }, { count: failedWebhooks }] = await Promise.all([
      admin.from("applications").select("id", { count: "exact", head: true }).eq("cv_parse_status", "failed"),
      admin.from("applications").select("id", { count: "exact", head: true }).eq("cv_parse_status", "unreadable"),
      admin.from("ai_screening_results").select("id", { count: "exact", head: true }).eq("review_state", "screening_failed"),
      admin.from("video_responses").select("id", { count: "exact", head: true }).eq("transcript_status", "failed"),
      admin.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("subscription_events").select("id", { count: "exact", head: true }).eq("processing_status", "failed"),
    ]);

    return {
      failedCvParsing: failedCvParsing ?? 0,
      unreadableCvs: unreadableCvs ?? 0,
      failedScreening: failedScreening ?? 0,
      failedTranscription: failedTranscription ?? 0,
      failedEmail: failedEmail ?? 0,
      failedWebhooks: failedWebhooks ?? 0,
    };
  }

  return {
    failedCvParsing: mockStore.applications.filter((a) => a.cv_parse_status === "failed").length,
    unreadableCvs: mockStore.applications.filter((a) => a.cv_parse_status === "unreadable").length,
    failedScreening: mockStore.aiScreeningResults.filter((r) => r.review_state === "screening_failed").length,
    failedTranscription: mockStore.videoResponses.filter((r) => r.transcript_status === "failed").length,
    failedEmail: mockStore.emailLogs.filter((l) => l.status === "failed").length,
    failedWebhooks: mockStore.subscriptionEvents.filter((e) => e.processing_status === "failed").length,
  };
}

export async function listJobsForAdmin() {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const { data: jobsData } = await admin.from("jobs").select("*");
    if (!jobsData || jobsData.length === 0) return [];
    const jobs = jobsData as Job[];
    const companyIds = [...new Set(jobs.map((j) => j.company_id))];
    const { data: companies } = (await admin.from("companies").select("*").in("id", companyIds)) as { data: Company[] | null };

    return jobs.map((job) => ({ job, company: companies!.find((c) => c.id === job.company_id)! }));
  }

  return mockStore.jobs.map((job) => ({ job, company: mockStore.companies.find((c) => c.id === job.company_id)! }));
}

export async function listApplicationsForAdmin() {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();

    const { data: applicationsData } = await admin.from("applications").select("*").order("applied_at", { ascending: false });
    if (!applicationsData || applicationsData.length === 0) return [];
    const applications = applicationsData as Application[];
    const companyIds = [...new Set(applications.map((a) => a.company_id))];
    const candidateIds = [...new Set(applications.map((a) => a.candidate_id))];
    const [{ data: companies }, { data: candidates }] = (await Promise.all([
      admin.from("companies").select("*").in("id", companyIds),
      admin.from("candidates").select("*").in("id", candidateIds),
    ])) as [{ data: Company[] | null }, { data: Candidate[] | null }];

    return applications.map((application) => ({
      application,
      company: companies!.find((c) => c.id === application.company_id)!,
      candidate: candidates!.find((c) => c.id === application.candidate_id)!,
    }));
  }

  return mockStore.applications
    .map((application) => ({
      application,
      company: mockStore.companies.find((c) => c.id === application.company_id)!,
      candidate: mockStore.candidates.find((c) => c.id === application.candidate_id)!,
    }))
    .sort((a, b) => +new Date(b.application.applied_at) - +new Date(a.application.applied_at));
}
