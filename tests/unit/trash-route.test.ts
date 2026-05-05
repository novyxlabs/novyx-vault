import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getStorageContextMock = vi.fn();
const restoreFromTrashMock = vi.fn();
const purgeFromTrashMock = vi.fn();
const emptyTrashMock = vi.fn();
const checkRateLimitMock = vi.fn();
const getRateLimitKeyMock = vi.fn();
const rateLimitResponseMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getStorageContext: (...args: unknown[]) => getStorageContextMock(...args),
}));

vi.mock("@/lib/notes", () => ({
  listTrash: vi.fn(),
  restoreFromTrash: (...args: unknown[]) => restoreFromTrashMock(...args),
  purgeFromTrash: (...args: unknown[]) => purgeFromTrashMock(...args),
  emptyTrash: (...args: unknown[]) => emptyTrashMock(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getRateLimitKey: (...args: unknown[]) => getRateLimitKeyMock(...args),
  rateLimitResponse: (...args: unknown[]) => rateLimitResponseMock(...args),
  RATE_LIMITS: { destructive: { limit: 10, windowMs: 60_000 } },
}));

function trashReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/notes/trash", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getStorageContextMock.mockResolvedValue({ userId: "user-1", cookieHeader: "sb=token" });
  getRateLimitKeyMock.mockReturnValue("trash:user-1");
  checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 9, resetMs: 0 });
  rateLimitResponseMock.mockImplementation(
    (resetMs: number) => new Response(JSON.stringify({ error: "limited", resetMs }), { status: 429 })
  );
});

describe("POST /api/notes/trash rate limits destructive operations", () => {
  it("uses the destructive limiter before purging one trashed note", async () => {
    const { POST } = await import("@/app/api/notes/trash/route");

    const res = await POST(trashReq({ action: "purge", id: "note-1" }));

    expect(res.status).toBe(200);
    expect(getRateLimitKeyMock).toHaveBeenCalledWith("trash-purge", "user-1", expect.any(NextRequest));
    expect(checkRateLimitMock).toHaveBeenCalledWith("trash:user-1", { limit: 10, windowMs: 60_000 });
    expect(purgeFromTrashMock).toHaveBeenCalledWith("note-1", {
      userId: "user-1",
      cookieHeader: "sb=token",
    });
  });

  it("returns the shared rate-limit response before emptying trash", async () => {
    checkRateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0, resetMs: 12_000 });
    const { POST } = await import("@/app/api/notes/trash/route");

    const res = await POST(trashReq({ action: "empty" }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("limited");
    expect(rateLimitResponseMock).toHaveBeenCalledWith(12_000);
    expect(emptyTrashMock).not.toHaveBeenCalled();
  });
});
