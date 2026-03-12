import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock isCloudMode — controls whether the route treats this as desktop or cloud
const isCloudModeMock = vi.fn(() => false);

vi.mock("@/lib/auth", () => ({
  isCloudMode: () => isCloudModeMock(),
  getStorageContext: vi.fn().mockRejectedValue(new Error("should not be called in desktop mode")),
}));

vi.mock("@/lib/supabase", () => ({
  createServerSupabase: vi.fn().mockReturnValue({}),
}));

describe("publish route desktop guard", () => {
  beforeEach(() => {
    isCloudModeMock.mockReturnValue(false);
  });

  it("GET returns isPublished:false in desktop mode without touching Supabase", async () => {
    const { GET } = await import("@/app/api/notes/publish/route");
    const req = new NextRequest("http://localhost:3000/api/notes/publish?path=test-note");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isPublished).toBe(false);
    expect(body.slug).toBeNull();
  });

  it("POST returns 400 with message in desktop mode without touching Supabase", async () => {
    const { POST } = await import("@/app/api/notes/publish/route");
    const req = new NextRequest("http://localhost:3000/api/notes/publish", {
      method: "POST",
      body: JSON.stringify({ path: "test-note", publish: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/cloud mode/i);
  });
});
