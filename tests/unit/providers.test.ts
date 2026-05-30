import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  isLocalProviderBaseURL,
  loadCloudSettings,
  validateProviderBaseURL,
} from "@/lib/providers";
import { createSafeProviderFetch, resolveAndValidateHost } from "@/lib/providers.server";

const originalStorageMode = process.env.STORAGE_MODE;

afterEach(() => {
  process.env.STORAGE_MODE = originalStorageMode;
  vi.unstubAllGlobals();
});

describe("validateProviderBaseURL", () => {
  it("allows known provider HTTPS hosts", () => {
    expect(validateProviderBaseURL("https://api.openai.com/v1")).toBeNull();
    expect(validateProviderBaseURL("https://api.anthropic.com/v1")).toBeNull();
  });

  it("allows localhost for local providers", () => {
    expect(validateProviderBaseURL("http://localhost:1234")).toBeNull();
    expect(validateProviderBaseURL("http://127.0.0.1:11434")).toBeNull();
    expect(validateProviderBaseURL("http://[::1]:11434")).toBeNull();
  });

  it("allows custom HTTPS hosts with public domains", () => {
    expect(validateProviderBaseURL("https://my-custom-ai.example.com/v1")).toBeNull();
  });

  it("rejects internal hostnames", () => {
    expect(validateProviderBaseURL("https://service.internal")).toBe("Internal hostnames are not allowed");
    expect(validateProviderBaseURL("https://myhost.local")).toBe("Internal hostnames are not allowed");
    expect(validateProviderBaseURL("https://intranet")).toBe("Internal hostnames are not allowed");
  });

  it("rejects invalid URLs", () => {
    expect(validateProviderBaseURL("not-a-url")).toBe("Invalid provider URL");
  });

  it("rejects private IP addresses", () => {
    expect(validateProviderBaseURL("http://10.0.0.1/v1")).toBe("Private network addresses are not allowed");
    expect(validateProviderBaseURL("http://192.168.1.1/v1")).toBe("Private network addresses are not allowed");
    expect(validateProviderBaseURL("http://172.16.0.1/v1")).toBe("Private network addresses are not allowed");
  });

  it("rejects cloud metadata endpoints", () => {
    // 169.254.x.x is caught by private IP regex first (link-local range)
    expect(validateProviderBaseURL("http://169.254.169.254/latest/meta-data")).toBe("Private network addresses are not allowed");
    expect(validateProviderBaseURL("http://metadata.google.internal")).toBe("Metadata endpoints are not allowed");
  });

  it("rejects non-HTTPS remote hosts", () => {
    expect(validateProviderBaseURL("http://some-remote-host.com/v1")).toBe("Only HTTPS URLs are allowed for remote providers");
  });

  it("rejects non-HTTPS known provider hosts before allowlisting them", () => {
    expect(validateProviderBaseURL("http://api.openai.com/v1")).toBe("Only HTTPS URLs are allowed for remote providers");
    expect(validateProviderBaseURL("http://api.anthropic.com/v1")).toBe("Only HTTPS URLs are allowed for remote providers");
  });
});

describe("isLocalProviderBaseURL", () => {
  it("only treats exact loopback hosts as local providers", () => {
    expect(isLocalProviderBaseURL("http://localhost:11434/v1")).toBe(true);
    expect(isLocalProviderBaseURL("http://127.0.0.1:11434/v1")).toBe(true);
    expect(isLocalProviderBaseURL("http://127.1.2.3:11434/v1")).toBe(true);
    expect(isLocalProviderBaseURL("http://[::1]:11434/v1")).toBe(true);
    expect(isLocalProviderBaseURL("https://example.com/localhost")).toBe(false);
    expect(isLocalProviderBaseURL("https://127.0.0.1.example.com/v1")).toBe(false);
    expect(isLocalProviderBaseURL("not-a-url")).toBe(false);
  });
});

describe("resolveAndValidateHost", () => {
  it("skips DNS check for known provider hosts", async () => {
    expect(await resolveAndValidateHost("https://api.openai.com/v1")).toBeNull();
  });

  it("skips DNS check for localhost", async () => {
    expect(await resolveAndValidateHost("http://localhost:11434")).toBeNull();
  });

  it("blocks hosts that resolve to private IPv4", async () => {
    vi.doMock("dns", () => ({
      promises: {
        resolve4: vi.fn().mockResolvedValue(["127.0.0.1"]),
        resolve6: vi.fn().mockRejectedValue(new Error("no AAAA")),
      },
    }));

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers.server");
    const result = await resolve("https://evil.nip.io/v1");
    expect(result).toBe("Provider hostname resolves to a private network address");

    vi.doUnmock("dns");
  });

  it("blocks hosts resolving to RFC1918 ranges", async () => {
    vi.doMock("dns", () => ({
      promises: {
        resolve4: vi.fn().mockResolvedValue(["10.0.0.5"]),
        resolve6: vi.fn().mockRejectedValue(new Error("no AAAA")),
      },
    }));

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers.server");
    const result = await resolve("https://sneaky.sslip.io/v1");
    expect(result).toBe("Provider hostname resolves to a private network address");

    vi.doUnmock("dns");
  });

  it("blocks hosts that resolve only to private IPv6 (::1)", async () => {
    vi.doMock("dns", () => ({
      promises: {
        resolve4: vi.fn().mockRejectedValue(new Error("no A record")),
        resolve6: vi.fn().mockResolvedValue(["::1"]),
      },
    }));

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers.server");
    const result = await resolve("https://ipv6-loopback.example.com/v1");
    expect(result).toBe("Provider hostname resolves to a private network address");

    vi.doUnmock("dns");
  });

  it("blocks hosts that resolve to IPv6 ULA (fc00::/7)", async () => {
    vi.doMock("dns", () => ({
      promises: {
        resolve4: vi.fn().mockRejectedValue(new Error("no A record")),
        resolve6: vi.fn().mockResolvedValue(["fd12:3456:789a::1"]),
      },
    }));

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers.server");
    const result = await resolve("https://ula-host.example.com/v1");
    expect(result).toBe("Provider hostname resolves to a private network address");

    vi.doUnmock("dns");
  });

  it("blocks hosts that resolve to IPv6 link-local (fe80::/10)", async () => {
    vi.doMock("dns", () => ({
      promises: {
        resolve4: vi.fn().mockRejectedValue(new Error("no A record")),
        resolve6: vi.fn().mockResolvedValue(["fe80::1"]),
      },
    }));

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers.server");
    const result = await resolve("https://link-local.example.com/v1");
    expect(result).toBe("Provider hostname resolves to a private network address");

    vi.doUnmock("dns");
  });
});

describe("createSafeProviderFetch", () => {
  it("uses manual redirects for provider requests", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    const safeFetch = createSafeProviderFetch();
    await expect(safeFetch("https://custom-provider.example.com/v1/chat", {
      method: "POST",
    })).resolves.toBe(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://custom-provider.example.com/v1/chat",
      expect.objectContaining({ method: "POST", redirect: "manual" })
    );
  });

  it("blocks provider redirects to private network targets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1:11434/v1" },
    })));

    const safeFetch = createSafeProviderFetch();
    await expect(safeFetch("https://custom-provider.example.com/v1/chat")).rejects.toThrow(
      "Provider redirect blocked"
    );
  });
});

describe("loadCloudSettings", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
      clear: vi.fn(() => {
        store.clear();
      }),
      get length() {
        return store.size;
      },
    });
  });

  it("does not ambiently reveal or restore encrypted provider keys on first cloud load", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      settings: {
        aiSettings: {
          activeProviderId: "openai",
          providers: [{
            id: "openai",
            name: "OpenAI",
            baseURL: "https://api.openai.com/v1",
            apiKey: "",
            model: "gpt-4.1-mini",
          }],
        },
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await loadCloudSettings();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/settings");
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("reveal=true"));

    const restored = JSON.parse(store.get("noctivault-ai-settings") || "{}");
    expect(restored.providers[0].apiKey).toBe("");
  });
});
