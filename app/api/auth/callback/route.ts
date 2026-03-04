import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { provisionNovyxKeyWithRetry, storeNovyxKey } from "@/lib/novyx";
import { createServiceSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors (user denied access, provider error, etc.)
  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", error);
    if (errorDescription) {
      loginUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(loginUrl.toString());
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}/`);

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
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "auth_failed");
      loginUrl.searchParams.set("error_description", exchangeError.message);
      return NextResponse.redirect(loginUrl.toString());
    }

    // Provision Novyx key for OAuth users (fire-and-forget)
    if (data.user?.email) {
      const svc = createServiceSupabase();
      const { data: profile } = await svc
        .from("profiles")
        .select("novyx_api_key")
        .eq("id", data.user.id)
        .single();

      if (!profile?.novyx_api_key) {
        provisionNovyxKeyWithRetry(data.user.email)
          .then((result) => storeNovyxKey(data.user!.id, result.api_key))
          .catch((err) =>
            console.error("OAuth Novyx provisioning failed:", err)
          );
      }
    }

    return response;
  }

  return NextResponse.redirect(`${origin}/login`);
}
