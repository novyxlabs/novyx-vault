import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function makeSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(
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
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "recovery"
    | "email"
    | null;
  const code = searchParams.get("code");

  // PKCE flow: Supabase sends a `code` param instead of `token_hash`
  if (code) {
    const response = NextResponse.redirect(`${origin}/`);
    const supabase = makeSupabase(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this was a recovery flow, redirect to reset-password
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if the user just came from a recovery link
        const nextParam = searchParams.get("next");
        if (nextParam === "/reset-password" || type === "recovery") {
          return NextResponse.redirect(`${origin}/reset-password`);
        }
      }
      return response;
    }
  }

  // Legacy implicit flow: token_hash + type
  if (token_hash && type) {
    let response = NextResponse.redirect(`${origin}/`);
    const supabase = makeSupabase(request, response);
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (!error) {
      if (type === "recovery") {
        response = NextResponse.redirect(`${origin}/reset-password`);
        const freshSupabase = makeSupabase(request, response);
        await freshSupabase.auth.getUser();
      }
      return response;
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=verification_failed`
  );
}
