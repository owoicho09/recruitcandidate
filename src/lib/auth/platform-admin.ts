import "server-only";
import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { env, DEMO_MODE } from "@/lib/env";

const COOKIE_NAME = "recruitcandidates_platform_admin";

interface PlatformAdminSession {
  email: string;
  issuedAt: number;
}

const DEFAULT_SECRET = "dev-platform-admin-secret-change-me";

/**
 * Outside demo mode the admin gate only works with real configuration: a
 * published default (or empty) signing secret would let anyone mint a valid
 * admin cookie, so sessions are refused entirely until it's set.
 */
function isConfigured(): boolean {
  if (DEMO_MODE) return true;
  const secret = env.PLATFORM_ADMIN_SESSION_SECRET;
  return secret.length >= 32 && secret !== DEFAULT_SECRET && !!env.PLATFORM_ADMIN_EMAIL && !!env.PLATFORM_ADMIN_PASSWORD;
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

  if (!isConfigured()) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let session: PlatformAdminSession;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PlatformAdminSession;
  } catch {
    return null;
  }
  // The cookie's maxAge is only a browser hint — enforce expiry server-side too.
  if (!Number.isFinite(session.issuedAt) || Date.now() - session.issuedAt > env.SESSION_TTL_HOURS * 3600 * 1000) return null;
  if (!DEMO_MODE && session.email?.toLowerCase() !== env.PLATFORM_ADMIN_EMAIL.toLowerCase()) return null;
  return session;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Live mode requires PLATFORM_ADMIN_EMAIL + PLATFORM_ADMIN_PASSWORD and checks
 * both (constant-time). Demo mode keeps the scaffold behavior — any non-empty
 * password — since there's no real data behind it.
 */
export function verifyPlatformAdminCredentials(email: string, password: string): boolean {
  if (!password) return false;
  if (DEMO_MODE) return !env.PLATFORM_ADMIN_EMAIL || email.toLowerCase() === env.PLATFORM_ADMIN_EMAIL.toLowerCase();
  if (!isConfigured()) return false;
  const emailOk = timingSafeEqual(digest(email.toLowerCase()), digest(env.PLATFORM_ADMIN_EMAIL.toLowerCase()));
  const passwordOk = timingSafeEqual(digest(password), digest(env.PLATFORM_ADMIN_PASSWORD));
  return emailOk && passwordOk;
}

export function isPlatformAdminConfigured(): boolean {
  return isConfigured();
}
