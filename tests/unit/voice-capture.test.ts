import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — top-level vi.mock calls are hoisted by vitest
// ---------------------------------------------------------------------------

// Mock the novyx module (same pattern as memory.test.ts)
vi.mock("@/lib/novyx", () => ({
  getNovyxForKey: vi.fn(),
  getUserNovyxKey: vi.fn().mockResolvedValue("nk_test_key"),
}));

// Mock auth — needed by API route handlers
vi.mock("@/lib/auth", () => ({
  getStorageContext: vi.fn().mockResolvedValue({
    userId: "user-123",
    cookieHeader: "cookie=val",
  }),
}));

// Mock rate limiter — always allow
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  getRateLimitKey: vi.fn().mockReturnValue("test-key"),
  rateLimitResponse: vi.fn(),
  RATE_LIMITS: { ai: { limit: 60, window: 60000 } },
}));

// Mock provider validation
vi.mock("@/lib/providers", () => ({
  validateProviderBaseURL: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/providers.server", () => ({
  resolveAndValidateHost: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// 1. lib/transcribe.ts — client-side utils
// ---------------------------------------------------------------------------

describe("lib/transcribe.ts", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("isLocalWhisperSupported() returns false when window is undefined (SSR)", async () => {
    // In vitest/node there is no window by default, but let's be explicit
    const originalWindow = globalThis.window;
    // @ts-expect-error — intentionally removing window for SSR simulation
    delete globalThis.window;

    const { isLocalWhisperSupported } = await import("@/lib/transcribe");
    expect(isLocalWhisperSupported()).toBe(false);

    // Restore
    globalThis.window = originalWindow;
  });

  it("isLocalWhisperSupported() returns true when WebAssembly and AudioContext exist", async () => {
    // Simulate a browser-like environment
    const fakeWindow = {} as Window & typeof globalThis;
    globalThis.window = fakeWindow;

    // WebAssembly is already defined in Node, so we just need AudioContext
    const originalAudioContext = globalThis.AudioContext;
    // @ts-expect-error — minimal stub
    globalThis.AudioContext = class {};

    const { isLocalWhisperSupported } = await import("@/lib/transcribe");
    expect(isLocalWhisperSupported()).toBe(true);

    // Restore
    globalThis.AudioContext = originalAudioContext;
  });

  it("getModelStatus() returns 'idle' initially", async () => {
    const { getModelStatus } = await import("@/lib/transcribe");
    expect(getModelStatus()).toBe("idle");
  });

  it("onModelProgress() registers callback without throwing", async () => {
    const { onModelProgress } = await import("@/lib/transcribe");
    const cb = vi.fn();
    expect(() => onModelProgress(cb)).not.toThrow();
  });

  it("cleanup() resets model status to 'idle'", async () => {
    const { cleanup, getModelStatus } = await import("@/lib/transcribe");
    cleanup();
    expect(getModelStatus()).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// 2. lib/memory.ts — rememberCapture
// ---------------------------------------------------------------------------

describe("rememberCapture", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NOVYX_MEMORY_API_KEY;
  });

  it("calls nx.remember with source:capture tag", async () => {
    const mockRemember = vi.fn().mockResolvedValue(undefined);

    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue({
      remember: mockRemember,
    } as unknown as ReturnType<typeof getNovyxForKey>);

    const { rememberCapture } = await import("@/lib/memory");
    await rememberCapture("test transcript", undefined, undefined, "key");

    expect(mockRemember).toHaveBeenCalledWith("test transcript", {
      auto_link: true,
      context: undefined,
      tags: ["source:capture"],
    });
  });

  it("includes user tag when userId provided", async () => {
    const mockRemember = vi.fn().mockResolvedValue(undefined);

    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue({
      remember: mockRemember,
    } as unknown as ReturnType<typeof getNovyxForKey>);

    const { rememberCapture } = await import("@/lib/memory");
    await rememberCapture("transcript", "My Title", "user-42", "key");

    expect(mockRemember).toHaveBeenCalledWith("transcript", {
      auto_link: true,
      context: "Voice capture: My Title",
      tags: ["user:user-42", "source:capture"],
    });
  });

  it("returns silently when no API key (no client)", async () => {
    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue(null);

    const { rememberCapture } = await import("@/lib/memory");
    // Should not throw, should return undefined
    await expect(rememberCapture("transcript")).resolves.toBeUndefined();
  });

  it("handles SDK errors gracefully (does not throw)", async () => {
    const mockRemember = vi.fn().mockRejectedValue(new Error("SDK boom"));

    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue({
      remember: mockRemember,
    } as unknown as ReturnType<typeof getNovyxForKey>);

    const { rememberCapture } = await import("@/lib/memory");
    // Should swallow the error
    await expect(
      rememberCapture("transcript", "title", "user1", "key")
    ).resolves.toBeUndefined();
  });

  it("includes 'Voice capture: {title}' in context when title provided", async () => {
    const mockRemember = vi.fn().mockResolvedValue(undefined);

    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue({
      remember: mockRemember,
    } as unknown as ReturnType<typeof getNovyxForKey>);

    const { rememberCapture } = await import("@/lib/memory");
    await rememberCapture("some words", "Weekly Standup", undefined, "key");

    const callArgs = mockRemember.mock.calls[0][1];
    expect(callArgs.context).toBe("Voice capture: Weekly Standup");
  });
});

// ---------------------------------------------------------------------------
// 3. API route: /api/notes/transcribe
// ---------------------------------------------------------------------------

describe("API /api/notes/transcribe", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 when no audio file is provided", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/notes/transcribe/route");

    // Create a FormData with no audio field
    const formData = new FormData();
    formData.append("providerApiKey", "sk-test");

    const req = new NextRequest("http://localhost:3000/api/notes/transcribe", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/no audio file/i);
  });

  it("returns 400 when audio file is too large (>25MB)", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/notes/transcribe/route");

    // Create a blob > 25MB
    const bigBuffer = new ArrayBuffer(26 * 1024 * 1024);
    const bigBlob = new Blob([bigBuffer], { type: "audio/webm" });

    const formData = new FormData();
    formData.append("audio", bigBlob, "audio.webm");
    formData.append("providerApiKey", "sk-test");

    const req = new NextRequest("http://localhost:3000/api/notes/transcribe", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/too large/i);
  });

  it("returns 400 when no API key for non-local provider", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/notes/transcribe/route");

    const smallBlob = new Blob(["audio data"], { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", smallBlob, "audio.webm");
    // No providerApiKey, non-local base URL (default is openai)

    const req = new NextRequest("http://localhost:3000/api/notes/transcribe", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/no api key/i);
  });

  it("returns 400 when provider URL is invalid", async () => {
    const { validateProviderBaseURL } = await import("@/lib/providers");
    vi.mocked(validateProviderBaseURL).mockReturnValueOnce("Invalid provider URL");

    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/notes/transcribe/route");

    const smallBlob = new Blob(["audio data"], { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", smallBlob, "audio.webm");
    formData.append("providerApiKey", "sk-test");
    formData.append("providerBaseURL", "not-a-url");

    const req = new NextRequest("http://localhost:3000/api/notes/transcribe", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid provider URL");
  });
});

// ---------------------------------------------------------------------------
// 4. API route: /api/notes/voice-structure
// ---------------------------------------------------------------------------

describe("API /api/notes/voice-structure", () => {
  beforeEach(() => {
    vi.resetModules();
    // Mock @/lib/memory for this describe block so the route handler
    // can import rememberCapture without pulling in real Novyx SDK
    vi.doMock("@/lib/memory", () => ({
      rememberCapture: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it("returns 400 when transcript is empty/too short", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/notes/voice-structure/route");

    const req = new NextRequest(
      "http://localhost:3000/api/notes/voice-structure",
      {
        method: "POST",
        body: JSON.stringify({
          transcript: "short",
          provider: {
            baseURL: "https://api.openai.com/v1",
            apiKey: "sk-test",
            model: "gpt-4",
          },
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/too short/i);
  });

  it("returns 400 when no model configured", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/notes/voice-structure/route");

    const req = new NextRequest(
      "http://localhost:3000/api/notes/voice-structure",
      {
        method: "POST",
        body: JSON.stringify({
          transcript: "This is a sufficiently long transcript for testing purposes",
          provider: {
            baseURL: "https://api.openai.com/v1",
            apiKey: "sk-test",
            model: "", // empty model
          },
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/no model/i);
  });

  it("returns 400 when no API key for non-local provider", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/notes/voice-structure/route");

    const req = new NextRequest(
      "http://localhost:3000/api/notes/voice-structure",
      {
        method: "POST",
        body: JSON.stringify({
          transcript: "This is a sufficiently long transcript for testing the voice structure endpoint",
          provider: {
            baseURL: "https://api.openai.com/v1",
            apiKey: "", // no key
            model: "gpt-4",
          },
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/no api key/i);
  });

  it("returns 400 for invalid request body (non-JSON)", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/notes/voice-structure/route");

    const req = new NextRequest(
      "http://localhost:3000/api/notes/voice-structure",
      {
        method: "POST",
        body: "not json at all",
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid request body/i);
  });
});

// ---------------------------------------------------------------------------
// 5. MemoryDashboard SOURCE_STYLES — capture key
// ---------------------------------------------------------------------------

describe("MemoryDashboard SOURCE_STYLES", () => {
  it("capture key exists in SOURCE_STYLES with amber color styling", async () => {
    // SOURCE_STYLES is a module-level const, so we read the file and verify
    // the structure. Since it's a React component we can't import it in
    // Node tests without a DOM. Instead, we test the exported constant by
    // importing just the relevant lines via a lightweight approach.
    //
    // The component is not separately exported, so we verify by reading
    // the source and checking the object literal.
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      __dirname,
      "../../components/MemoryDashboard.tsx"
    );
    const source = fs.readFileSync(filePath, "utf-8");

    // Verify the capture key exists
    expect(source).toContain('capture:');

    // Verify it has amber color styling
    expect(source).toMatch(/capture.*amber/s);

    // Verify the label is "Capture"
    expect(source).toContain('"Capture"');

    // Verify the full entry structure
    expect(source).toContain(
      'capture: { label: "Capture", className: "bg-amber-400/10 text-amber-400/70" }'
    );
  });
});
