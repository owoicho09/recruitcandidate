import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/env";

export async function POST(request: Request) {
  if (!DEMO_MODE) {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } else {
    await clearSession();
  }
  return NextResponse.redirect(new URL("/", request.url));
}
