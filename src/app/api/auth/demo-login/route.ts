import { NextResponse } from "next/server";
import { mockStore } from "@/lib/data/store";
import { setDemoSession } from "@/lib/auth/session";
import { DEMO_COMPANY_SLUG } from "@/lib/data/fixtures";
import { DEMO_MODE } from "@/lib/env";

/** One-click demo entry point, linked from the marketing site's Demo page and /login. Demo-mode only — would be an unauthenticated login bypass otherwise. */
export async function GET(request: Request) {
  if (!DEMO_MODE) {
    return NextResponse.json({ error: "Not available — this workspace is running live." }, { status: 404 });
  }

  const url = new URL(request.url);
  const roleParam = url.searchParams.get("role");

  const company = mockStore.companies.find((c) => c.slug === DEMO_COMPANY_SLUG)!;
  const member =
    mockStore.companyMembers.find((m) => m.company_id === company.id && m.role === roleParam) ??
    mockStore.companyMembers.find((m) => m.company_id === company.id && m.role === "owner")!;
  const user = mockStore.users.find((u) => u.id === member.user_id)!;

  await setDemoSession({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    companyId: company.id,
    companySlug: company.slug,
    role: member.role,
  });

  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
