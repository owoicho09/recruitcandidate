import { NextResponse } from "next/server";
import { submitVideoResponse } from "@/lib/services/video-interviews";
import { env } from "@/lib/env";

const MAX_VIDEO_BYTES = env.MAX_VIDEO_FILE_MB * 1024 * 1024;

export async function POST(request: Request, { params }: RouteContext<"/api/video-interviews/[token]/respond">) {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  const questionId = form.get("questionId");
  const durationSeconds = form.get("durationSeconds");
  const video = form.get("video");
  if (typeof questionId !== "string") return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
  if (video instanceof File && video.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: `Recording must be under ${env.MAX_VIDEO_FILE_MB}MB` }, { status: 400 });
  }

  const videoBuffer = video instanceof File && video.size > 0 ? Buffer.from(await video.arrayBuffer()) : null;
  let response;
  try {
    response = await submitVideoResponse(token, questionId, Math.max(0, Math.round(Number(durationSeconds) || 0)), videoBuffer);
  } catch (err) {
    console.error("[video-interviews/respond] upload failed", err);
    return NextResponse.json({ error: "Your recording didn't upload — please try again." }, { status: 502 });
  }
  if (!response) return NextResponse.json({ error: "This interview link is invalid, has expired, or was already completed." }, { status: 404 });
  return NextResponse.json({ response: { id: response.id, question_id: response.question_id } });
}
