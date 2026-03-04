import { describe, it, expect } from "vitest";
import { validateProviderBaseURL } from "@/lib/providers";

describe("validateProviderBaseURL", () => {
  it("allows known provider HTTPS hosts", () => {
    expect(validateProviderBaseURL("https://api.openai.com/v1")).toBeNull();
    expect(validateProviderBaseURL("https://api.anthropic.com/v1")).toBeNull();
  });

  it("allows localhost for local providers", () => {
    expect(validateProviderBaseURL("http://localhost:1234")).toBeNull();
    expect(validateProviderBaseURL("http://127.0.0.1:11434")).toBeNull();
  });

  it("allows any HTTPS host (custom endpoints)", () => {
    expect(validateProviderBaseURL("https://my-custom-ai.example.com/v1")).toBeNull();
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
