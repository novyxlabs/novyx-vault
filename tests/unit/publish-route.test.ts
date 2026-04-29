import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock isCloudMode — controls whether the route treats this as desktop or cloud
const isCloudModeMock = vi.fn(() => false);
const getStorageContextMock = vi.fn().mockRejectedValue(new Error("should not be called in desktop mode"));
const createServerSupabaseMock = vi.fn().mockReturnValue({});

vi.mock("@/lib/auth", () => ({
  isCloudMode: () => isCloudModeMock(),
  getStorageContext: (...args: unknown[]) => getStorageContextMock(...args),
}));

vi.mock("@/lib/supabase", () => ({
  createServerSupabase: (...args: unknown[]) => createServerSupabaseMock(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetMs: 0 }),
  getRateLimitKey: vi.fn().mockReturnValue("publish:user-1"),
  rateLimitResponse: vi.fn(),
  RATE_LIMITS: { crud: { limit: 60, windowMs: 60_000 } },
}));

describe("publish route desktop guard", () => {
  beforeEach(() => {
    isCloudModeMock.mockReturnValue(false);
    getStorageContextMock.mockClear();
    createServerSupabaseMock.mockClear();
  });

  it("GET returns isPublished:false in desktop mode without touching Supabase", async () => {
    const { GET } = await import("@/app/api/notes/publish/route");
    const req = new NextRequest("http://localhost:3000/api/notes/publish?path=test-note");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isPublished).toBe(false);
    expect(body.slug).toBeNull();
    expect(getStorageContextMock).not.toHaveBeenCalled();
    expect(createServerSupabaseMock).not.toHaveBeenCalled();
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
    expect(getStorageContextMock).not.toHaveBeenCalled();
    expect(createServerSupabaseMock).not.toHaveBeenCalled();
  });

  it("retries a slug update when the database reports a unique constraint collision", async () => {
    isCloudModeMock.mockReturnValue(true);
    getStorageContextMock.mockResolvedValue({
      userId: "user-1",
      cookieHeader: "sb=token",
    });

    const updatePayloads: Array<Record<string, unknown>> = [];
    const noteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "note-1", name: "Race Note", slug: null },
        error: null,
      }),
    };
    const existingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const updateClient = {
      update: vi.fn().mockImplementation((payload: Record<string, unknown>) => ({
        eq: vi.fn().mockImplementation(() => {
          updatePayloads.push(payload);
          if (updatePayloads.length === 1) {
            return Promise.resolve({
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "notes_slug_unique"',
              },
            });
          }
          return Promise.resolve({ error: null });
        }),
      })),
    };
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce(noteQuery)
        .mockReturnValueOnce(existingQuery)
        .mockReturnValue(updateClient),
    };
    createServerSupabaseMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/notes/publish/route");
    const req = new NextRequest("http://localhost:3000/api/notes/publish", {
      method: "POST",
      body: JSON.stringify({ path: "Race Note", publish: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(updatePayloads).toHaveLength(2);
    expect(updatePayloads[0].slug).toBe("race-note");
    expect(String(updatePayloads[1].slug)).toMatch(/^race-note-[a-z0-9]+-1$/);
    expect(body.slug).toBe(updatePayloads[1].slug);
  });
});
