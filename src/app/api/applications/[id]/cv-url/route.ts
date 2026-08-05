import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { flags, env } from "@/lib/env";

export async function GET(request: Request, { params }: RouteContext<"/api/applications/[id]/cv-url">) {
  const session = await requireSession("reviewer");
  const { id } = await params;

  if (!flags.hasSupabase) {
    return NextResponse.json({ error: "File downloads aren't available in demo mode." }, { status: 400 });
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();

  const { data: application } = await supabase.from("applications").select("cv_path").eq("company_id", session.companyId).eq("id", id).maybeSingle();
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase.storage.from(env.SUPABASE_CV_BUCKET).createSignedUrl(application.cv_path, env.SIGNED_URL_TTL_SECONDS);
  if (error || !data) return NextResponse.json({ error: "Couldn't generate a download link" }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
