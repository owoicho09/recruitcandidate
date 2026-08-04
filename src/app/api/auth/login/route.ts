import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { mockStore } from "@/lib/data/store";
import { setDemoSession } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  if (!DEMO_MODE) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    return NextResponse.json({ ok: true });
  }

  const user = mockStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== password) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const member = mockStore.companyMembers.find((m) => m.user_id === user.id && m.company_id === user.companyId);
  const company = mockStore.companies.find((c) => c.id === user.companyId);
  if (!member || !company) {
    return NextResponse.json({ error: "This account is not linked to an active workspace." }, { status: 403 });
  }

  await setDemoSession({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    companyId: user.companyId,
    companySlug: company.slug,
    role: member.role,
  });

  return NextResponse.json({ ok: true });
}
