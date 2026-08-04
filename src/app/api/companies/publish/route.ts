import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { updateCompany } from "@/lib/services/companies";

export async function POST(request: Request) {
  const session = await requireSession("admin");
  const body = await request.json().catch(() => ({}));
  const publish = Boolean(body.publish);
  const company = await updateCompany(session.companyId, { career_page_status: publish ? "published" : "unpublished" });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json({ company });
}
