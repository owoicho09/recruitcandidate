import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { mockStore } from "@/lib/data/store";
import { hashToken } from "@/lib/utils/token";
import { flags } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }

  if (flags.hasSupabase) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: parsed.data.token, type: "recovery" });
    if (verifyError) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (updateError) return NextResponse.json({ error: "Couldn't update your password. Please try again." }, { status: 400 });

    return NextResponse.json({ ok: true });
  }

  const tokenHash = hashToken(parsed.data.token);
  const reset = mockStore.passwordResets.find((r) => r.tokenHash === tokenHash);
  if (!reset || new Date(reset.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const user = mockStore.users.find((u) => u.id === reset.userId);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  user.passwordHash = parsed.data.password;
  mockStore.passwordResets = mockStore.passwordResets.filter((r) => r.tokenHash !== tokenHash);

  return NextResponse.json({ ok: true });
}
