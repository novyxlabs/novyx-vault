import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isCloudMode } from "@/lib/auth";

export async function POST() {
  if (!isCloudMode()) {
    return NextResponse.json({ success: true });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.signOut();

  // Also manually clear any sb- cookies by setting them expired
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }

  return NextResponse.json({ success: true });
}
