import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { updateMemberRole, removeMember, listMembers } from "@/lib/services/team";

// Ownership isn't transferable through this endpoint — granting "owner" would
// let any admin take over billing, and there's exactly one owner per workspace.
const schema = z.object({ role: z.enum(["admin", "recruiter", "hiring_manager", "reviewer"]) });

/** The owner can't be changed or removed here, and nobody can change or remove themselves. */
async function findEditableMember(companyId: string, memberId: string, actorUserId: string) {
  const member = (await listMembers(companyId)).find((m) => m.id === memberId);
  if (!member) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (member.role === "owner") return { error: NextResponse.json({ error: "The workspace owner can't be changed or removed." }, { status: 403 }) };
  if (member.user_id === actorUserId) return { error: NextResponse.json({ error: "You can't change or remove your own membership." }, { status: 403 }) };
  return { member };
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/team/members/[id]">) {
  const session = await requireSession("admin");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const check = await findEditableMember(session.companyId, id, session.userId);
  if (check.error) return check.error;

  const member = await updateMemberRole(session.companyId, id, parsed.data.role);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ member });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/team/members/[id]">) {
  const session = await requireSession("admin");
  const { id } = await params;

  const check = await findEditableMember(session.companyId, id, session.userId);
  if (check.error) return check.error;

  const removed = await removeMember(session.companyId, id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
