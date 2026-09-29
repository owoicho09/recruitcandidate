import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPlatformAdminCredentials, setPlatformAdminSession, isPlatformAdminConfigured } from "@/lib/auth/platform-admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`platform-admin-login:${getClientIp(request)}`, 10, 15 * 60);
  if (!allowed) return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  if (!isPlatformAdminConfigured()) {
    return NextResponse.json({ error: "Platform admin login isn't configured on this server (PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD / PLATFORM_ADMIN_SESSION_SECRET)." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });

  if (!verifyPlatformAdminCredentials(parsed.data.email, parsed.data.password)) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  await setPlatformAdminSession(parsed.data.email);
  return NextResponse.json({ ok: true });
}
