import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { updateMemberRole, removeMember } from "@/lib/services/team";

const schema = z.object({ role: z.enum(["owner", "admin", "recruiter", "hiring_manager", "reviewer"]) });

export async function PATCH(request: Request, { params }: RouteContext<"/api/team/members/[id]">) {
  const session = await requireSession("admin");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const member = await updateMemberRole(session.companyId, id, parsed.data.role);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ member });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/team/members/[id]">) {
  const session = await requireSession("admin");
  const { id } = await params;
  const removed = await removeMember(session.companyId, id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
