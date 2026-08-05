import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { flags, env } from "@/lib/env";

export async function GET(request: Request, { params }: RouteContext<"/api/video-interviews/responses/[id]/video-url">) {
  await requireSession("reviewer");
  const { id } = await params;

  if (!flags.hasSupabase) {
    return NextResponse.json({ error: "Playback isn't available in demo mode." }, { status: 400 });
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();

  const { data: response } = await supabase.from("video_responses").select("storage_path").eq("id", id).maybeSingle();
  if (!response) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase.storage.from(env.SUPABASE_VIDEO_BUCKET).createSignedUrl(response.storage_path, env.SIGNED_URL_TTL_SECONDS);
  if (error || !data) return NextResponse.json({ error: "Couldn't generate a playback link" }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
