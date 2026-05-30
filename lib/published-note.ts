import { createClient } from "@supabase/supabase-js";
import { createServiceSupabase } from "@/lib/supabase";

export async function getPublishedNote(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const { data } = await supabase
    .from("published_notes")
    .select("name, content, published_at, slug")
    .eq("slug", slug)
    .single();
  if (data) return data;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;

  const service = createServiceSupabase();
  const { data: fallback } = await service
    .from("notes")
    .select("name, content, published_at, slug")
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("is_trashed", false)
    .single();
  return fallback;
}

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
