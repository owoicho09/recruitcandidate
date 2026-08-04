import { NextResponse } from "next/server";
import { startAttempt } from "@/lib/services/assessments";

export async function POST(request: Request, { params }: RouteContext<"/api/assessments/[token]/start">) {
  const { token } = await params;
  const attempt = await startAttempt(token);
  if (!attempt) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  return NextResponse.json({ attempt });
}
