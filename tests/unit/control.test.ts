import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isControlConfigured,
  getActions,
  submitDecision,
  getPolicies,
} from "@/lib/control";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("isControlConfigured", () => {
  afterEach(() => {
    delete process.env.NOVYX_CONTROL_URL;
  });

  it("returns false when NOVYX_CONTROL_URL is not set", () => {
    delete process.env.NOVYX_CONTROL_URL;
    expect(isControlConfigured()).toBe(false);
  });

  it("returns false when NOVYX_CONTROL_URL is empty string", () => {
    process.env.NOVYX_CONTROL_URL = "";
    expect(isControlConfigured()).toBe(false);
  });

  it("returns true when NOVYX_CONTROL_URL is set", () => {
    process.env.NOVYX_CONTROL_URL = "https://control.novyxlabs.com";
    expect(isControlConfigured()).toBe(true);
  });
});

describe("getActions", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.NOVYX_CONTROL_URL = "https://control.novyxlabs.com";
  });

  afterEach(() => {
    delete process.env.NOVYX_CONTROL_URL;
  });

  it("returns empty when control is not configured", async () => {
    delete process.env.NOVYX_CONTROL_URL;
    const result = await getActions({}, "test-key");
    expect(result).toEqual({ actions: [], total: 0 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches actions with correct URL and auth header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ actions: [{ id: "a1", action_type: "deploy", status: "pending" }], total: 1 }),
    });

    const result = await getActions({ status: "pending", limit: 10 }, "my-api-key");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("https://control.novyxlabs.com/v1/actions");
    expect(url).toContain("status=pending");
    expect(url).toContain("limit=10");
    expect(opts.headers.Authorization).toBe("Bearer my-api-key");
    expect(result.actions).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("builds URL without optional params when not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ actions: [], total: 0 }),
    });

    await getActions({}, "key");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://control.novyxlabs.com/v1/actions");
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

    await expect(getActions({}, "key")).rejects.toThrow("Control API error: 403");
  });
});

describe("submitDecision", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.NOVYX_CONTROL_URL = "https://control.novyxlabs.com";
  });

  afterEach(() => {
    delete process.env.NOVYX_CONTROL_URL;
  });

  it("throws when control is not configured", async () => {
    delete process.env.NOVYX_CONTROL_URL;
    await expect(submitDecision("a1", "approved", "key")).rejects.toThrow("Control not configured");
  });

  it("posts approval decision with correct body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await submitDecision("approval-123", "approved", "my-key");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://control.novyxlabs.com/v1/approvals/approval-123/decision");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ decision: "approved" });
    expect(opts.headers.Authorization).toBe("Bearer my-key");
    expect(result.success).toBe(true);
  });

  it("posts denial decision", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await submitDecision("a1", "denied", "key");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.decision).toBe("denied");
  });

  it("throws with API error message on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ message: "Action already decided" }),
    });

    await expect(submitDecision("a1", "approved", "key")).rejects.toThrow("Action already decided");
  });

  it("throws with status code when response body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error("not json"); },
    });

    await expect(submitDecision("a1", "approved", "key")).rejects.toThrow("Control API error: 500");
  });
});

describe("getPolicies", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.NOVYX_CONTROL_URL = "https://control.novyxlabs.com";
  });

  afterEach(() => {
    delete process.env.NOVYX_CONTROL_URL;
  });

  it("returns empty when control is not configured", async () => {
    delete process.env.NOVYX_CONTROL_URL;
    const result = await getPolicies("key");
    expect(result).toEqual({ policies: [] });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches policies with auth header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        policies: [{
          id: "p1",
          name: "Default",
          rules: [{ action: "deploy", effect: "require_approval" }],
        }],
      }),
    });

    const result = await getPolicies("my-key");

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://control.novyxlabs.com/v1/control/policies");
    expect(opts.headers.Authorization).toBe("Bearer my-key");
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].name).toBe("Default");
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await expect(getPolicies("bad-key")).rejects.toThrow("Control API error: 401");
  });
});
