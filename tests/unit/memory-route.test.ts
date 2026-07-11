import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetStorageContext = vi.fn();
const mockGetUser = vi.fn();
const mockGetUserNovyxKey = vi.fn();
const mockEnsureNovyxKey = vi.fn();
const mockRememberExchange = vi.fn();
const mockListMemories = vi.fn();
const mockForgetMemory = vi.fn();

vi.mock("@/lib/auth", () => ({
  getStorageContext: mockGetStorageContext,
  getUser: mockGetUser,
}));

vi.mock("@/lib/novyx", () => ({
  getUserNovyxKey: mockGetUserNovyxKey,
  ensureNovyxKey: mockEnsureNovyxKey,
}));

vi.mock("@/lib/memory", () => ({
  listMemories: mockListMemories,
  forgetMemory: mockForgetMemory,
  rememberExchange: mockRememberExchange,
}));

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: {
    crud: { limit: 30, windowMs: 60_000 },
    destructive: { limit: 10, windowMs: 60_000 },
  },
  checkRateLimit: vi.fn(async () => ({ allowed: true, resetMs: 0 })),
  getRateLimitKey: vi.fn(() => "memory-write:test"),
  rateLimitResponse: vi.fn(() => new Response("rate limited", { status: 429 })),
}));

function postMemory(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/memory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetStorageContext.mockResolvedValue({ userId: undefined, cookieHeader: undefined });
    mockGetUser.mockResolvedValue(null);
    mockGetUserNovyxKey.mockResolvedValue(null);
    mockEnsureNovyxKey.mockResolvedValue(null);
    mockRememberExchange.mockResolvedValue(true);
  });

  it("does not report success when no Novyx Memory key is configured", async () => {
    const { POST } = await import("@/app/api/memory/route");

    const res = await POST(postMemory({ observation: "real write required" }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toMatch(/not configured/i);
    expect(mockRememberExchange).not.toHaveBeenCalled();
  });

  it("returns success only after rememberExchange confirms the write", async () => {
    mockGetUserNovyxKey.mockResolvedValue("novyx-key");
    mockRememberExchange.mockResolvedValue(true);
    const { POST } = await import("@/app/api/memory/route");

    const res = await POST(postMemory({ observation: "real write" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRememberExchange).toHaveBeenCalledWith("real write", undefined, undefined, "novyx-key");
  });

  it("returns a bad gateway when Novyx rejects the write", async () => {
    mockGetUserNovyxKey.mockResolvedValue("novyx-key");
    mockRememberExchange.mockResolvedValue(false);
    const { POST } = await import("@/app/api/memory/route");

    const res = await POST(postMemory({ observation: "write fails upstream" }));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("Failed to save memory");
  });
});
