import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  // Redirect old domain to new domain
  if (request.headers.get("host") === "noctivault.vercel.app") {
    const url = new URL(request.url);
    url.host = "vault.novyxlabs.com";
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  // Desktop mode — no auth needed
  if (process.env.STORAGE_MODE !== "supabase") {
    return NextResponse.next();
  }

  // Skip auth for API routes (they handle their own auth via getStorageContext),
  // public pages, static assets, and OG image generation
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/auth/confirm") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/_next") ||
    pathname === "/opengraph-image" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Root page handles unauthenticated users (shows landing page).
    // All other unknown paths fall through to Next.js routing (renders 404).
    // No redirect — the only authenticated page is "/" which has its own guard.
    return response;
  }

  // Email verification: redirect unconfirmed email users to /verify-email
  // OAuth users skip this check (provider already verified their email)
  if (
    !user.email_confirmed_at &&
    !pathname.startsWith("/verify-email")
  ) {
    const providers = user.app_metadata?.providers as string[] | undefined;
    const isOAuthUser = providers?.some((p: string) => p !== "email") ?? false;
    if (!isOAuthUser) {
      const verifyUrl = new URL("/verify-email", request.url);
      return NextResponse.redirect(verifyUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image
     * - favicon.ico, public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
