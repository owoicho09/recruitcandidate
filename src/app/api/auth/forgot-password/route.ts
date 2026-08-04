import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { mockStore } from "@/lib/data/store";
import { generateToken, hashToken } from "@/lib/utils/token";
import { daysFromNow } from "@/lib/data/ids";
import { sendEmail } from "@/lib/email/resend";
import { env, flags } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  if (flags.hasSupabase) {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const {
      data: { users },
    } = await admin.auth.admin.listUsers();
    const user = users.find((u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase());

    // Always return success — never reveal whether an account exists for this email.
    if (user) {
      const { data: member } = await admin.from("company_members").select("company_id").eq("user_id", user.id).maybeSingle();
      // We route the recovery token through our own /reset-password page (verifyOtp server-side)
      // rather than Supabase's action_link, so the flow matches demo mode and doesn't depend on
      // Supabase's hosted redirect/hash-fragment handling.
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "recovery", email: parsed.data.email });
      if (linkData?.properties && member) {
        await sendEmail({
          companyId: member.company_id,
          type: "password_reset",
          to: parsed.data.email,
          subject: "Reset your RecruitCandidates password",
          body: `Reset your password: ${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${linkData.properties.hashed_token}`,
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  const user = mockStore.users.find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());

  if (user) {
    const token = generateToken();
    mockStore.passwordResets.push({ tokenHash: hashToken(token), userId: user.id, expiresAt: daysFromNow(1) });
    await sendEmail({
      companyId: user.companyId,
      type: "password_reset",
      to: user.email,
      subject: "Reset your RecruitCandidates password",
      body: `Reset your password: /reset-password?token=${token}`,
    });
  }

  return NextResponse.json({ ok: true });
}
