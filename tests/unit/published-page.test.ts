import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
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
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
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
  });
});
