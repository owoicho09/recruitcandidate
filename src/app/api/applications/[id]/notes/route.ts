import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { addNote } from "@/lib/services/applications";

export async function POST(request: Request, { params }: RouteContext<"/api/applications/[id]/notes">) {
  const session = await requireSession("reviewer");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });

  const note = await addNote(session.companyId, id, session.userId, session.fullName, text);
  return NextResponse.json({ note });
}
