import "server-only";
import { redirect } from "next/navigation";
import { getSession, hasAtLeastRole, type Session } from "@/lib/auth/session";
import type { CompanyRole } from "@/types/database";

export async function requireSession(minimumRole?: CompanyRole): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (minimumRole && !hasAtLeastRole(session.role, minimumRole)) redirect("/dashboard?error=permission_denied");
  return session;
}
