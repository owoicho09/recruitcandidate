import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, DEMO_MODE, flags } from "@/lib/env";

const DASHBOARD_PREFIX = "/dashboard";
const PLATFORM_ADMIN_PREFIX = "/platform-admin";
const PLATFORM_ADMIN_COOKIE = "recruitcandidates_platform_admin";

// Next.js 16 renamed `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()` — see
// node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(PLATFORM_ADMIN_PREFIX) && pathname !== "/platform-admin/login") {
    const hasAdminSession = request.cookies.has(PLATFORM_ADMIN_COOKIE);
    if (!hasAdminSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/platform-admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith(DASHBOARD_PREFIX)) {
    return NextResponse.next();
  }

  if (DEMO_MODE || !flags.hasSupabase) {
    const hasSession = request.cookies.has(env.AUTH_COOKIE_NAME);
    if (!hasSession) return redirectToLogin(request);
    return NextResponse.next();
  }

  // Live mode: Supabase's own session cookies (sb-*), refreshed here so
  // Server Components downstream (which can't write cookies mid-render)
  // always see a fresh access token. This is the standard @supabase/ssr
  // middleware pattern.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirectToLogin(request);
  return response;
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/platform-admin/:path*"],
};
