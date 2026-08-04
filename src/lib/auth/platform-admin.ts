import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

const COOKIE_NAME = "recruitcandidates_platform_admin";

interface PlatformAdminSession {
  email: string;
  issuedAt: number;
}

function sign(payload: string): string {
  return createHmac("sha256", env.PLATFORM_ADMIN_SESSION_SECRET).update(payload).digest("hex");
}

export async function setPlatformAdminSession(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, issuedAt: Date.now() })).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 3600,
  });
}

export async function clearPlatformAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getPlatformAdminSession(): Promise<PlatformAdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PlatformAdminSession;
  } catch {
    return null;
  }
}

/** In demo mode any email/password pair signs in as the platform admin — this is a scaffold, not a real gate. */
export function verifyPlatformAdminCredentials(email: string, password: string): boolean {
  if (!password) return false;
  if (env.PLATFORM_ADMIN_EMAIL) return email.toLowerCase() === env.PLATFORM_ADMIN_EMAIL.toLowerCase();
  return true;
}
