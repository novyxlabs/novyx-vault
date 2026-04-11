import { NextRequest, NextResponse } from "next/server";
import { getStorageContext, isCloudMode } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// GET — check publish status
export async function GET(req: NextRequest) {
  try {
    if (!isCloudMode()) {
      return NextResponse.json({ isPublished: false, slug: null, publishedAt: null });
    }
    const ctx = await getStorageContext();
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    if (!path) return NextResponse.json({ error: "Path required" }, { status: 400 });

    const supabase = createServerSupabase(ctx.cookieHeader);
    const normalized = path.replace(/\.md$/, "");

    const { data } = await supabase
      .from("notes")
      .select("is_published, slug, published_at")
      .eq("user_id", ctx.userId)
      .eq("path", normalized)
      .eq("is_trashed", false)
      .single();

    return NextResponse.json({
      isPublished: data?.is_published ?? false,
      slug: data?.slug ?? null,
      publishedAt: data?.published_at ?? null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

// POST — publish or unpublish
export async function POST(req: NextRequest) {
  try {
    if (!isCloudMode()) {
      return NextResponse.json({ error: "Publishing requires cloud mode" }, { status: 400 });
    }
    const ctx = await getStorageContext();
    const rlKey = getRateLimitKey("publish", ctx.userId, req);
    const rl = await checkRateLimit(rlKey, RATE_LIMITS.crud);
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    const { path, publish, slug: customSlug } = await req.json();
    if (!path) return NextResponse.json({ error: "Path required" }, { status: 400 });

    const supabase = createServerSupabase(ctx.cookieHeader);
    const normalized = path.replace(/\.md$/, "");

    const { data: note } = await supabase
      .from("notes")
      .select("id, name, slug")
      .eq("user_id", ctx.userId)
      .eq("path", normalized)
      .eq("is_trashed", false)
      .single();

    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    if (publish === false) {
      // Unpublish
      const { error } = await supabase
        .from("notes")
        .update({ is_published: false, slug: null, published_at: null })
        .eq("id", note.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ isPublished: false, slug: null });
    }

    // Publish — run customSlug through the same slugify policy as auto-generated
    // slugs. Previously customSlug was trusted raw, allowing slashes, unicode
    // confusables, path-looking strings, and over-length values into /p/{slug}.
    // If the caller explicitly requested a custom slug but it normalizes to
    // empty (e.g. all symbols), return 400 instead of silently falling back.
    let slug: string;
    if (typeof customSlug === "string" && customSlug.trim().length > 0) {
      const normalized = slugify(customSlug);
      if (!normalized) {
        return NextResponse.json(
          { error: "Custom slug contains no valid characters" },
          { status: 400 }
        );
      }
      slug = normalized;
    } else {
      slug = note.slug || slugify(note.name);
    }
    if (!slug) slug = `note-${Date.now()}`;

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("notes")
      .select("id")
      .eq("slug", slug)
      .eq("is_published", true)
      .eq("is_trashed", false)
      .neq("id", note.id)
      .single();

    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const { error } = await supabase
      .from("notes")
      .update({
        is_published: true,
        slug,
        published_at: new Date().toISOString(),
      })
      .eq("id", note.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://vault.novyxlabs.com"}/p/${slug}`;
    return NextResponse.json({ isPublished: true, slug, url: publicUrl });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
