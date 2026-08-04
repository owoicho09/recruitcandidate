import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { env, DEMO_MODE } from "@/lib/env";
import { mockStore } from "@/lib/data/store";
import type { CompanyRole } from "@/types/database";

export interface Session {
  userId: string;
  email: string;
  fullName: string;
  companyId: string;
  companySlug: string;
  role: CompanyRole;
}

const COOKIE_NAME = env.AUTH_COOKIE_NAME;

function sign(payload: string): string {
  return createHmac("sha256", env.TOKEN_HASH_SECRET).update(payload).digest("hex");
}

function encodeSessionCookie(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decodeSessionCookie(value: string): Session | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

/** Demo-mode session, backed by a signed cookie over the in-memory mock store. */
async function getDemoSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const session = decodeSessionCookie(raw);
  if (!session) return null;

  // Re-validate against the live store so a stale cookie from a previous seed doesn't dangle.
  const member = mockStore.companyMembers.find((m) => m.user_id === session.userId && m.company_id === session.companyId);
  const company = mockStore.companies.find((c) => c.id === session.companyId);
  if (!member || !company) return null;

  return { ...session, role: member.role, companySlug: company.slug };
}

/**
 * Live-mode session, backed by Supabase Auth + company_members lookup.
 * Wired for when real Supabase credentials are supplied; not exercised in demo mode.
 */
interface MemberWithCompanySlug {
  company_id: string;
  role: CompanyRole;
  full_name: string;
  companies: { slug: string } | { slug: string }[] | null;
}

async function getLiveSession(): Promise<Session | null> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("company_members")
    .select("company_id, role, full_name, companies(slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle<MemberWithCompanySlug>();

  if (!member) return null;

  const companySlug = Array.isArray(member.companies) ? member.companies[0]?.slug : member.companies?.slug;

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: member.full_name,
    companyId: member.company_id,
    companySlug: companySlug ?? "",
    role: member.role,
  };
}

export async function getSession(): Promise<Session | null> {
  return DEMO_MODE ? getDemoSession() : getLiveSession();
}

export async function setDemoSession(session: Session) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSessionCookie(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 3600,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

const ROLE_RANK: Record<CompanyRole, number> = {
  reviewer: 0,
  hiring_manager: 1,
  recruiter: 2,
  admin: 3,
  owner: 4,
};

export function hasAtLeastRole(role: CompanyRole, minimum: CompanyRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
