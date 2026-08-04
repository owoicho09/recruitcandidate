import "server-only";
import { redirect } from "next/navigation";
import { getPlatformAdminSession } from "@/lib/auth/platform-admin";

export async function requirePlatformAdmin() {
  const session = await getPlatformAdminSession();
  if (!session) redirect("/platform-admin/login");
  return session;
}
