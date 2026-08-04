import { NextResponse } from "next/server";
import { startVideoAttempt } from "@/lib/services/video-interviews";

export async function POST(request: Request, { params }: RouteContext<"/api/video-interviews/[token]/start">) {
  const { token } = await params;
  const attempt = await startVideoAttempt(token);
  if (!attempt) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  return NextResponse.json({ attempt });
}
