import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { assignApplication } from "@/lib/services/applications";

export async function POST(request: Request, { params }: RouteContext<"/api/applications/[id]/assign">) {
  const session = await requireSession("reviewer");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const application = await assignApplication(session.companyId, id, body.memberId ?? null);
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  return NextResponse.json({ application });
}
