import { describe, it, expect, vi, beforeEach } from "vitest";

// The /p/[slug] share page is a route handler (not a page) so it can return
// a real 404 status — pages commit a 200 before notFound() fires.

const state = vi.hoisted(() => ({
  note: null as null | {
    name: string;
    content: string;
    published_at: string | null;
    slug: string;
  },
}));

vi.mock("@/lib/published-note", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/published-note")>();
  return {
    ...actual,
    getPublishedNote: async () => state.note,
  };
});

import { GET } from "@/app/p/[slug]/route";

function call(slug: string) {
  return GET(new Request(`https://vault.novyxlabs.com/p/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

describe("published note route", () => {
  beforeEach(() => {
    state.note = null;
  });

  it("returns 404 with noindex for unknown slugs", async () => {
    const res = await call("nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain("Note not found");
  });

  it("returns 200 with rendered markdown for published notes", async () => {
    state.note = {
      name: "My Note",
      content: "# Hello\n\nSome **bold** text",
      published_at: "2026-06-01T00:00:00Z",
      slug: "my-note",
    };
    const res = await call("my-note");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<title>My Note</title>");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain('rel="canonical" href="https://vault.novyxlabs.com/p/my-note"');
    expect(html).toContain("application/ld+json");
  });

  it("escapes HTML in note name and description", async () => {
    state.note = {
      name: '<script>alert("xss")</script>',
      content: "body",
      published_at: null,
      slug: "xss",
    };
    const res = await call("xss");
    const html = await res.text();
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain("&lt;script&gt;");
  });
});
