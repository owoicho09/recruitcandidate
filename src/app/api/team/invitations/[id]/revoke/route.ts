import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { revokeInvitation } from "@/lib/services/team";

export async function POST(request: Request, { params }: RouteContext<"/api/team/invitations/[id]/revoke">) {
  const session = await requireSession("admin");
  const { id } = await params;
  const invitation = await revokeInvitation(session.companyId, id);
  if (!invitation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invitation });
}
