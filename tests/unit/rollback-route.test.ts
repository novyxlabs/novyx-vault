import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getStorageContextMock = vi.fn();
const isCloudModeMock = vi.fn();
const getUserNovyxKeyMock = vi.fn();
const getNovyxForKeyMock = vi.fn();
const requireFeatureMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getStorageContext: (...args: unknown[]) => getStorageContextMock(...args),
  isCloudMode: () => isCloudModeMock(),
}));

vi.mock("@/lib/novyx", () => ({
  getUserNovyxKey: (...args: unknown[]) => getUserNovyxKeyMock(...args),
  getNovyxForKey: (...args: unknown[]) => getNovyxForKeyMock(...args),
  requireFeature: (...args: unknown[]) => requireFeatureMock(...args),
}));

const mockNxClient = {
  rollback: vi.fn(),
  rollbackPreview: vi.fn(),
};

function buildPostReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/memory/rollback", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function buildGetReq(target?: string): NextRequest {
  const url = target
    ? `http://localhost:3000/api/memory/rollback?target=${encodeURIComponent(target)}`
    : "http://localhost:3000/api/memory/rollback";
  return new NextRequest(url);
}

async function loadRoute() {
  return await import("@/app/api/memory/rollback/route");
}

beforeEach(() => {
  vi.clearAllMocks();
  isCloudModeMock.mockReturnValue(true);
  getStorageContextMock.mockResolvedValue({ userId: "user-1", cookieHeader: "" });
  getUserNovyxKeyMock.mockResolvedValue("user-api-key");
  requireFeatureMock.mockResolvedValue(null);
  getNovyxForKeyMock.mockReturnValue(mockNxClient);
  mockNxClient.rollback.mockReset();
  mockNxClient.rollbackPreview.mockReset();
});

describe("POST /api/memory/rollback — input validation", () => {
  it("returns 400 on malformed JSON body", async () => {
    const { POST } = await loadRoute();
    const req = new NextRequest("http://localhost:3000/api/memory/rollback", {
      method: "POST",
      body: "{not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
    expect(mockNxClient.rollback).not.toHaveBeenCalled();
  });

  it("returns 400 when target is missing", async () => {
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing rollback target/i);
  });

  it("returns 400 for epoch millisecond targets", async () => {
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "1710000000000" }));
    expect(res.status).toBe(400);
    expect(mockNxClient.rollback).not.toHaveBeenCalled();
  });

  it("returns 400 for date-only targets without time component", async () => {
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty string target", async () => {
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown relative phrasings", async () => {
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "yesterday" }));
    expect(res.status).toBe(400);
  });

  it("accepts valid ISO 8601 targets", async () => {
    mockNxClient.rollback.mockResolvedValue({ status: "success", artifacts_restored: 2 });
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    expect(res.status).toBe(200);
    expect(mockNxClient.rollback).toHaveBeenCalledWith("2026-04-15T12:00:00Z", false, true);
  });

  it("accepts valid relative-time targets", async () => {
    mockNxClient.rollback.mockResolvedValue({ status: "success", artifacts_restored: 1 });
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2 hours ago" }));
    expect(res.status).toBe(200);
    expect(mockNxClient.rollback).toHaveBeenCalledWith("2 hours ago", false, true);
  });
});

describe("POST /api/memory/rollback — auth and gating", () => {
  it("propagates 401 from getStorageContext", async () => {
    getStorageContextMock.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 'Novyx not configured' when cloud apiKey is null", async () => {
    getUserNovyxKeyMock.mockResolvedValue(null);
    requireFeatureMock.mockResolvedValue(null);
    getNovyxForKeyMock.mockReturnValue(null);
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Novyx not configured");
    expect(mockNxClient.rollback).not.toHaveBeenCalled();
  });

  it("propagates feature-gate 403 from requireFeature", async () => {
    requireFeatureMock.mockResolvedValue(
      Response.json(
        {
          error: "feature_not_available",
          code: "novyx_ram.v1.feature_not_available",
          plan: "free",
          message: "Replay requires Pro plan or above.",
          feature: "replay",
          required_plan: "pro",
          upgrade_url: "https://novyxlabs.com/pricing",
        },
        { status: 403 }
      )
    );
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("feature_not_available");
    expect(body.required_plan).toBe("pro");
  });
});

describe("POST /api/memory/rollback — upstream response handling", () => {
  it("returns 429 with quota body when SDK throws NovyxRateLimitError", async () => {
    const rateLimitError = Object.assign(new Error("rollback_limit_reached"), {
      name: "NovyxRateLimitError",
      data: {
        error: "rollback_limit_reached",
        code: "novyx_ram.v1.rollback_limit_reached",
        plan: "free",
        message: "You've used all 10 free rollbacks this month.",
        current: 10,
        limit: 10,
        max_allowed: 10,
        upgrade_url: "https://novyxlabs.com/pricing",
        resets_at: "",
      },
    });
    mockNxClient.rollback.mockRejectedValue(rateLimitError);
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("novyx_ram.v1.rollback_limit_reached");
    expect(body.current).toBe(10);
    expect(body.limit).toBe(10);
    expect(body.upgrade_url).toBe("https://novyxlabs.com/pricing");
  });

  it("falls through to generic 500 for non-quota SDK errors", async () => {
    mockNxClient.rollback.mockRejectedValue(new Error("connection refused"));
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to perform rollback");
  });

  it("preserves partial_success status and errors[] on HTTP 200", async () => {
    mockNxClient.rollback.mockResolvedValue({
      status: "partial_success",
      artifacts_restored: 3,
      artifacts_affected: 5,
      errors: ["failed to archive memory-42", "failed to restore memory-7"],
    });
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("partial_success");
    expect(body.errors).toEqual(["failed to archive memory-42", "failed to restore memory-7"]);
    expect(body.artifacts_restored).toBe(3);
  });

  it("preserves artifacts_affected:0 for targets outside history window", async () => {
    mockNxClient.rollback.mockResolvedValue({
      status: "success",
      artifacts_affected: 0,
      artifacts_restored: 0,
    });
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.artifacts_affected).toBe(0);
    expect(body.rollback_target).toBe("2026-04-15T12:00:00Z");
  });

  it("echoes rollback_target in successful POST responses", async () => {
    mockNxClient.rollback.mockResolvedValue({ status: "success", artifacts_restored: 1 });
    const { POST } = await loadRoute();
    const res = await POST(buildPostReq({ target: "2026-04-15T12:00:00Z" }));
    const body = await res.json();
    expect(body.mode).toBe("rollback");
    expect(body.target).toBe("2026-04-15T12:00:00Z");
    expect(body.rollback_target).toBe("2026-04-15T12:00:00Z");
  });
});

describe("GET /api/memory/rollback (preview)", () => {
  it("returns 400 when target query param is missing", async () => {
    const { GET } = await loadRoute();
    const res = await GET(buildGetReq());
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid target format", async () => {
    const { GET } = await loadRoute();
    const res = await GET(buildGetReq("not-a-date"));
    expect(res.status).toBe(400);
    expect(mockNxClient.rollbackPreview).not.toHaveBeenCalled();
  });

  it("echoes rollback_target in preview responses", async () => {
    mockNxClient.rollbackPreview.mockResolvedValue({
      operations_to_undo: 5,
      memories_to_restore: 3,
      memories_to_remove: 2,
    });
    const { GET } = await loadRoute();
    const res = await GET(buildGetReq("2026-04-15T12:00:00Z"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe("preview");
    expect(body.target).toBe("2026-04-15T12:00:00Z");
    expect(body.rollback_target).toBe("2026-04-15T12:00:00Z");
    expect(body.operations_to_undo).toBe(5);
  });

  it("returns 500 'Novyx not configured' for cloud apiKey null", async () => {
    getUserNovyxKeyMock.mockResolvedValue(null);
    getNovyxForKeyMock.mockReturnValue(null);
    const { GET } = await loadRoute();
    const res = await GET(buildGetReq("2026-04-15T12:00:00Z"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Novyx not configured");
  });
});
