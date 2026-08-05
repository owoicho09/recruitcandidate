import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { inviteMember } from "@/lib/services/team";
import { checkUsage } from "@/lib/services/usage-tracking";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "recruiter", "hiring_manager", "reviewer"]),
});

export async function POST(request: Request) {
  const session = await requireSession("admin");
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  const usage = await checkUsage(session.companyId, "team_members");
  if (!usage.allowed) return NextResponse.json({ error: "Your plan's team member limit has been reached." }, { status: 429 });

  const invitation = await inviteMember(session.companyId, session.userId, parsed.data.email, parsed.data.role);
  return NextResponse.json({ invitation });
}
