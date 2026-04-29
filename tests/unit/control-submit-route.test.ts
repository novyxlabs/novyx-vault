import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getStorageContextMock = vi.fn();
const getUserNovyxKeyMock = vi.fn();
const submitActionMock = vi.fn();
const checkRateLimitMock = vi.fn();
const getRateLimitKeyMock = vi.fn();
const rateLimitResponseMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getStorageContext: (...args: unknown[]) => getStorageContextMock(...args),
}));

vi.mock("@/lib/novyx", () => ({
  getUserNovyxKey: (...args: unknown[]) => getUserNovyxKeyMock(...args),
}));

vi.mock("@/lib/control", () => ({
  submitAction: (...args: unknown[]) => submitActionMock(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getRateLimitKey: (...args: unknown[]) => getRateLimitKeyMock(...args),
  rateLimitResponse: (...args: unknown[]) => rateLimitResponseMock(...args),
  RATE_LIMITS: { crud: { limit: 60, windowMs: 60_000 } },
}));

function submitReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/control/actions/submit", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getStorageContextMock.mockResolvedValue({ userId: "user-1", cookieHeader: "sb=token" });
  getUserNovyxKeyMock.mockResolvedValue("nram_test_key");
  getRateLimitKeyMock.mockReturnValue("control-action-submit:user-1");
  checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 59, resetMs: 0 });
  rateLimitResponseMock.mockImplementation(
    (resetMs: number) => new Response(JSON.stringify({ error: "limited", resetMs }), { status: 429 })
  );
});

describe("POST /api/control/actions/submit", () => {
  it("rate limits submissions before calling the control API", async () => {
    checkRateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0, resetMs: 7_000 });
    const { POST } = await import("@/app/api/control/actions/submit/route");

    const res = await POST(submitReq({ action: "deploy", params: {} }));

    expect(res.status).toBe(429);
    expect(getRateLimitKeyMock).toHaveBeenCalledWith(
      "control-action-submit",
      "user-1",
      expect.any(NextRequest)
    );
    expect(rateLimitResponseMock).toHaveBeenCalledWith(7_000);
    expect(submitActionMock).not.toHaveBeenCalled();
  });

  it("rejects non-object params without submitting an action", async () => {
    const { POST } = await import("@/app/api/control/actions/submit/route");

    const res = await POST(submitReq({ action: "deploy", params: "bad" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("params must be an object");
    expect(submitActionMock).not.toHaveBeenCalled();
  });

  it("returns the production audit-chain fields from submitAction unchanged", async () => {
    submitActionMock.mockResolvedValueOnce({
      status: "pending_review",
      action_id: "action-1",
      policy_result: {
        triggered_policy: "Production Deploys",
        audit_hash: "hash-1",
        audit_chain_index: 42,
      },
    });
    const { POST } = await import("@/app/api/control/actions/submit/route");

    const res = await POST(submitReq({ action: "deploy", params: { env: "prod" }, agent_id: "agent-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.policy_result.audit_hash).toBe("hash-1");
    expect(body.policy_result.audit_chain_index).toBe(42);
    expect(submitActionMock).toHaveBeenCalledWith(
      "deploy",
      { env: "prod" },
      "nram_test_key",
      { agent_id: "agent-1" }
    );
  });
});
