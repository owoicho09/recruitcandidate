import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { getCompany, updateCompany } from "@/lib/services/companies";
import { trackCompanyProfileUpdate } from "@/lib/services/lifecycle";

const schema = z.object({ name: z.string().min(1), industry: z.string().min(1), size: z.string().min(1), timezone: z.string().min(1) });

export async function PATCH(request: Request) {
  const session = await requireSession("owner");
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  const before = await getCompany(session.companyId);
  const company = await updateCompany(session.companyId, parsed.data);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  await trackCompanyProfileUpdate(session.companyId, session.userId, before, company);
  return NextResponse.json({ company });
}
