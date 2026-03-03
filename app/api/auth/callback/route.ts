import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { provisionNovyxKey, storeNovyxKey } from "@/lib/novyx";
import { createServiceSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    let response = NextResponse.redirect(`${origin}/`);

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

    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Provision Novyx key for OAuth users (fire-and-forget)
    if (data.user?.email) {
      const svc = createServiceSupabase();
      const { data: profile } = await svc
        .from("profiles")
        .select("novyx_api_key")
        .eq("id", data.user.id)
        .single();

      if (!profile?.novyx_api_key) {
        provisionNovyxKey(data.user.email)
          .then((result) => storeNovyxKey(data.user!.id, result.api_key))
          .catch((err) => console.error("OAuth Novyx provisioning failed:", err));
      }
    }

    return response;
  }

  return NextResponse.redirect(`${origin}/login`);
}
