import { NextResponse } from "next/server";
import { submitVideoResponse } from "@/lib/services/video-interviews";

export async function POST(request: Request, { params }: RouteContext<"/api/video-interviews/[token]/respond">) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.questionId !== "string") return NextResponse.json({ error: "Missing questionId" }, { status: 400 });

  const response = await submitVideoResponse(token, body.questionId, Number(body.durationSeconds) || 0);
  if (!response) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  return NextResponse.json({ response });
}
