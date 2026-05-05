import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceSupabase: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase", () => ({
  createServiceSupabase: mocks.createServiceSupabase,
}));

describe("published page JSON-LD", () => {
  it("escapes user-controlled script terminators in note titles", async () => {
    const { safeJsonLd } = await import("@/app/p/[slug]/page");
    const html = safeJsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "</script><script>alert(1)</script>",
    });

    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c/script>");
    expect(html).toContain("\\u003cscript>alert(1)\\u003c/script>");
  });
});

describe("published page lookup", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createClient.mockReset();
    mocks.createServiceSupabase.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("reads published notes by slug through the anon published_notes view", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        name: "Public note",
        content: "# Public note",
        published_at: "2026-05-05T00:00:00.000Z",
        slug: "public-note",
      },
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    mocks.createClient.mockReturnValue({ from });

    const { getPublishedNote } = await import("@/app/p/[slug]/page");
    const note = await getPublishedNote("public-note");

    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://supabase.example",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
      })
    );
    expect(from).toHaveBeenCalledWith("published_notes");
    expect(select).toHaveBeenCalledWith("name, content, published_at, slug");
    expect(eq).toHaveBeenCalledWith("slug", "public-note");
    expect(note?.name).toBe("Public note");
    expect(mocks.createServiceSupabase).not.toHaveBeenCalled();
  });

  it("falls back to a limited service-role notes query when the public view is missing", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    const viewSingle = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.published_notes' in the schema cache",
      },
    });
    const viewEq = vi.fn().mockReturnValue({ single: viewSingle });
    const viewSelect = vi.fn().mockReturnValue({ eq: viewEq });
    mocks.createClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select: viewSelect }) });

    const notesSingle = vi.fn().mockResolvedValue({
      data: {
        name: "Fallback note",
        content: "# Fallback note",
        published_at: "2026-05-05T00:00:00.000Z",
        slug: "fallback-note",
      },
    });
    const notesEq = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: notesSingle }) }) });
    const notesSelect = vi.fn().mockReturnValue({ eq: notesEq });
    const notesFrom = vi.fn().mockReturnValue({ select: notesSelect });
    mocks.createServiceSupabase.mockReturnValue({ from: notesFrom });

    const { getPublishedNote } = await import("@/app/p/[slug]/page");
    const note = await getPublishedNote("fallback-note");

    expect(mocks.createServiceSupabase).toHaveBeenCalled();
    expect(notesFrom).toHaveBeenCalledWith("notes");
    expect(notesSelect).toHaveBeenCalledWith("name, content, published_at, slug");
    expect(notesEq).toHaveBeenCalledWith("slug", "fallback-note");
    expect(note?.name).toBe("Fallback note");
  });
});
