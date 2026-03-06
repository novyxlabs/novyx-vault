import { NextRequest, NextResponse } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";

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
    const ctx = await getStorageContext();
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

    // Publish
    let slug = customSlug || note.slug || slugify(note.name);
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
