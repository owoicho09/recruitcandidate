import { flags } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import type { Company } from "@/types/database";

export async function getCompany(companyId: string): Promise<Company | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
    return (data as Company | null) ?? null;
  }
  return mockStore.companies.find((c) => c.id === companyId) ?? null;
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("companies").select("*").eq("slug", slug).maybeSingle();
    return (data as Company | null) ?? null;
  }
  return mockStore.companies.find((c) => c.slug === slug) ?? null;
}

export async function updateCompany(companyId: string, patch: Partial<Company>): Promise<Company | null> {
  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("companies").update(patch).eq("id", companyId).select("*").maybeSingle();
    return (data as Company | null) ?? null;
  }
  const company = mockStore.companies.find((c) => c.id === companyId);
  if (!company) return null;
  Object.assign(company, patch, { updated_at: new Date().toISOString() });
  return company;
}

export async function isSlugAvailable(slug: string, excludingCompanyId?: string): Promise<boolean> {
  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    let query = admin.from("companies").select("id").eq("slug", slug);
    if (excludingCompanyId) query = query.neq("id", excludingCompanyId);
    const { data } = await query.maybeSingle();
    return !data;
  }
  return !mockStore.companies.some((c) => c.slug === slug && c.id !== excludingCompanyId);
}
