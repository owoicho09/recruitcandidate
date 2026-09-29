import { NextResponse } from "next/server";
import { acceptInviteSchema } from "@/lib/validation/auth";
import { mockStore } from "@/lib/data/store";
import { id } from "@/lib/data/ids";
import { hashToken } from "@/lib/utils/token";
import { setDemoSession } from "@/lib/auth/session";
import { flags } from "@/lib/env";
import { findAuthUserIdByEmail } from "@/lib/auth/find-user";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { data: invitation } = await admin.from("team_invitations").select("*").eq("token_hash", hashToken(token)).eq("status", "pending").maybeSingle();
    if (!invitation || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 400 });
    }
    const { data: company } = await admin.from("companies").select("name").eq("id", invitation.company_id).single();
    return NextResponse.json({ email: invitation.email, role: invitation.role, companyName: company!.name });
  }

  const invitation = mockStore.teamInvitations.find((i) => i.token_hash === hashToken(token) && i.status === "pending");
  if (!invitation || new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 400 });
  }
  const company = mockStore.companies.find((c) => c.id === invitation.company_id)!;
  return NextResponse.json({ email: invitation.email, role: invitation.role, companyName: company.name });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const admin = createAdminSupabaseClient();

    const { data: invitation } = await admin.from("team_invitations").select("*").eq("token_hash", hashToken(parsed.data.token)).eq("status", "pending").maybeSingle();
    if (!invitation || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 400 });
    }
    const { data: company } = await admin.from("companies").select("id, slug").eq("id", invitation.company_id).single();

    let userId = await findAuthUserIdByEmail(admin, invitation.email);

    if (!userId) {
      const { data: created, error: createUserError } = await admin.auth.admin.createUser({ email: invitation.email, password: parsed.data.password, email_confirm: true });
      if (createUserError || !created.user) return NextResponse.json({ error: "Couldn't create your account. Please try again." }, { status: 400 });
      userId = created.user.id;
      await admin.from("profiles").insert({ id: userId, first_name: parsed.data.fullName, last_name: "", email: invitation.email });
    }

    await admin.from("company_members").upsert(
      {
        company_id: company!.id,
        user_id: userId,
        full_name: parsed.data.fullName,
        email: invitation.email,
        role: invitation.role,
        status: "active",
        invited_by: invitation.invited_by,
        invited_at: invitation.expires_at,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "company_id,user_id" },
    );

    await admin.from("team_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invitation.id);

    const supabase = await createServerSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: invitation.email, password: parsed.data.password });
    if (signInError) return NextResponse.json({ error: "Account created, but automatic sign-in failed. Please log in." }, { status: 400 });

    return NextResponse.json({ ok: true });
  }

  const invitation = mockStore.teamInvitations.find((i) => i.token_hash === hashToken(parsed.data.token) && i.status === "pending");
  if (!invitation || new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 400 });
  }

  const company = mockStore.companies.find((c) => c.id === invitation.company_id)!;
  let user = mockStore.users.find((u) => u.email.toLowerCase() === invitation.email.toLowerCase());
  const userId = user?.id ?? id();

  if (!user) {
    user = { id: userId, fullName: parsed.data.fullName, email: invitation.email, passwordHash: parsed.data.password, companyId: company.id, role: invitation.role, emailVerified: true };
    mockStore.users.push(user);
  }

  mockStore.companyMembers.push({
    id: id(),
    company_id: company.id,
    user_id: userId,
    full_name: parsed.data.fullName,
    email: invitation.email,
    role: invitation.role,
    status: "active",
    invited_by: invitation.invited_by,
    invited_at: invitation.expires_at,
    joined_at: new Date().toISOString(),
  });

  invitation.status = "accepted";
  invitation.accepted_at = new Date().toISOString();

  await setDemoSession({ userId, email: invitation.email, fullName: parsed.data.fullName, companyId: company.id, companySlug: company.slug, role: invitation.role });

  return NextResponse.json({ ok: true });
}
