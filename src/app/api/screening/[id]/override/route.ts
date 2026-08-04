import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { overrideScreeningRecommendation } from "@/lib/services/applications";
import type { Recommendation } from "@/types/database";

export async function POST(request: Request, { params }: RouteContext<"/api/screening/[id]/override">) {
  const session = await requireSession("recruiter");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const result = await overrideScreeningRecommendation(session.companyId, id, (body.recommendation as Recommendation | null) ?? null);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ result });
}
