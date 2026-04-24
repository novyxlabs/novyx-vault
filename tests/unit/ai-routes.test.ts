import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("openai", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getStorageContext: vi.fn().mockResolvedValue({
    userId: "user-123",
    cookieHeader: "sb=token",
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  getRateLimitKey: vi.fn().mockReturnValue("test-key"),
  rateLimitResponse: vi.fn(),
  RATE_LIMITS: { ai: { limit: 60, window: 60000 } },
}));

vi.mock("@/lib/novyx", () => ({
  getUserNovyxKey: vi.fn().mockResolvedValue("novyx-key"),
}));

vi.mock("@/lib/providers", () => ({
  validateProviderBaseURL: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/providers.server", () => ({
  resolveAndValidateHost: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/search", () => ({
  searchNotes: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/notes", () => ({
  readNote: vi.fn(),
  listNotes: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/memory", () => ({
  recallMemories: vi.fn().mockResolvedValue([]),
  rememberExchange: vi.fn(),
}));

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API /api/chat", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when no model is configured", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const req = jsonRequest("http://localhost:3000/api/chat", {
      messages: [{ role: "user", content: "hello" }],
      provider: {
        baseURL: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "No AI provider configured. Add one in Settings.",
    });
  });

  it("returns 400 when a remote provider has no API key", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const req = jsonRequest("http://localhost:3000/api/chat", {
      messages: [{ role: "user", content: "hello" }],
      provider: {
        baseURL: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-4.1-mini",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "No API key configured for this provider",
    });
  });

  it("returns 400 when provider URL validation fails", async () => {
    const { validateProviderBaseURL } = await import("@/lib/providers");
    vi.mocked(validateProviderBaseURL).mockReturnValue("Invalid provider URL");
    const { POST } = await import("@/app/api/chat/route");

    const req = jsonRequest("http://localhost:3000/api/chat", {
      messages: [{ role: "user", content: "hello" }],
      provider: {
        baseURL: "not-a-url",
        apiKey: "sk-test",
        model: "gpt-4.1-mini",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Invalid provider URL",
    });
  });
});

describe("API /api/notes/brain-dump", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when the request body is invalid JSON", async () => {
    const { POST } = await import("@/app/api/notes/brain-dump/route");

    const req = new NextRequest("http://localhost:3000/api/notes/brain-dump", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Invalid request body",
    });
  });

  it("returns 400 when the brain dump text is too short", async () => {
    const { POST } = await import("@/app/api/notes/brain-dump/route");

    const req = jsonRequest("http://localhost:3000/api/notes/brain-dump", {
      rawText: "short",
      provider: {
        baseURL: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "gpt-4.1-mini",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Brain dump text is too short",
    });
  });

  it("returns 400 when no model is configured", async () => {
    const { POST } = await import("@/app/api/notes/brain-dump/route");

    const req = jsonRequest("http://localhost:3000/api/notes/brain-dump", {
      rawText: "This is a long enough brain dump for validation.",
      provider: {
        baseURL: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "No model configured",
    });
  });

  it("returns 400 when a remote provider has no API key", async () => {
    const { POST } = await import("@/app/api/notes/brain-dump/route");

    const req = jsonRequest("http://localhost:3000/api/notes/brain-dump", {
      rawText: "This is a long enough brain dump for validation.",
      provider: {
        baseURL: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-4.1-mini",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "No API key configured for this provider",
    });
  });
});
