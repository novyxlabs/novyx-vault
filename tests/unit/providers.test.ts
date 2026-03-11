import { describe, it, expect, vi } from "vitest";
import { validateProviderBaseURL, resolveAndValidateHost } from "@/lib/providers";

describe("validateProviderBaseURL", () => {
  it("allows known provider HTTPS hosts", () => {
    expect(validateProviderBaseURL("https://api.openai.com/v1")).toBeNull();
    expect(validateProviderBaseURL("https://api.anthropic.com/v1")).toBeNull();
  });

  it("allows localhost for local providers", () => {
    expect(validateProviderBaseURL("http://localhost:1234")).toBeNull();
    expect(validateProviderBaseURL("http://127.0.0.1:11434")).toBeNull();
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

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers");
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

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers");
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

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers");
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

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers");
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

    const { resolveAndValidateHost: resolve } = await import("@/lib/providers");
    const result = await resolve("https://link-local.example.com/v1");
    expect(result).toBe("Provider hostname resolves to a private network address");

    vi.doUnmock("dns");
  });
});
