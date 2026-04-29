import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const isCloudModeMock = vi.fn();
const getUserMock = vi.fn();
const getUserNovyxKeyMock = vi.fn();
const checkRateLimitMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  isCloudMode: () => isCloudModeMock(),
  getUser: (...args: unknown[]) => getUserMock(...args),
}));

vi.mock("@/lib/novyx", () => ({
  getUserNovyxKey: (...args: unknown[]) => getUserNovyxKeyMock(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getRateLimitKey: vi.fn().mockReturnValue("billing:user-1"),
  rateLimitResponse: vi.fn((resetMs: number) =>
    new Response(JSON.stringify({ error: "limited", resetMs }), { status: 429 })
  ),
  RATE_LIMITS: { billing: { limit: 3, windowMs: 60_000 } },
}));

function billingReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/billing", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", cookie: "sb=token" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  isCloudModeMock.mockReturnValue(true);
  getUserMock.mockResolvedValue({ id: "user-1", email: "user@example.com" });
  getUserNovyxKeyMock.mockResolvedValue("nram_secret_key");
  checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 2, resetMs: 0 });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ checkout_url: "https://checkout.example/session" }),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/billing", () => {
  it("rejects unsupported tiers before calling checkout", async () => {
    const { POST } = await import("@/app/api/billing/route");

    const res = await POST(billingReq({ tier: "enterprise" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Unsupported billing tier");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["", false, 0, null])("rejects falsey unsupported tier %s", async (tier) => {
    const { POST } = await import("@/app/api/billing/route");

    const res = await POST(billingReq({ tier }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Unsupported billing tier");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("defaults to pro only when tier is omitted", async () => {
    const { POST } = await import("@/app/api/billing/route");

    const res = await POST(billingReq({}));

    expect(res.status).toBe(200);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body)).tier).toBe("pro");
  });

  it("sends the API key only as a bearer token for valid checkout tiers", async () => {
    const { POST } = await import("@/app/api/billing/route");

    const res = await POST(billingReq({ tier: "pro" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.checkout_url).toBe("https://checkout.example/session");
    expect(fetch).toHaveBeenCalledOnce();
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.headers).toMatchObject({ Authorization: "Bearer nram_secret_key" });
    expect(JSON.parse(String(init?.body))).toEqual({
      tier: "pro",
      email: "user@example.com",
    });
  });
});
