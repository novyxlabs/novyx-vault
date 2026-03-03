import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser client (for components / client-side)
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Parse a raw cookie header string into {name, value}[] for @supabase/ssr */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return { name: pair.trim(), value: "" };
    return { name: pair.slice(0, idx).trim(), value: pair.slice(idx + 1).trim() };
  });
}

// Server client (for API routes / server components — reads auth from cookies)
export function createServerSupabase(cookieHeader?: string) {
  const cookies = parseCookieHeader(cookieHeader ?? "");

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies;
        },
        setAll() {
          // Read-only context — cookie writes are handled by the proxy
        },
      },
    }
  );
}

// Service role client (for admin operations — bypasses RLS)
export function createServiceSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
