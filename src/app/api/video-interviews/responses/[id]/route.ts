import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { updateVideoResponseEmployerScore } from "@/lib/services/video-interviews";

export async function PATCH(request: Request, { params }: RouteContext<"/api/video-interviews/responses/[id]">) {
  await requireSession("reviewer");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (typeof body.employerScore !== "number") return NextResponse.json({ error: "Missing employerScore" }, { status: 400 });

  const response = await updateVideoResponseEmployerScore(id, body.employerScore);
  if (!response) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ response });
}
