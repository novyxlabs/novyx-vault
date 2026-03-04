import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("isCloudMode", () => {
  const originalEnv = process.env.STORAGE_MODE;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.STORAGE_MODE;
    } else {
      process.env.STORAGE_MODE = originalEnv;
    }
    vi.resetModules();
  });

  it("returns true when STORAGE_MODE is supabase", async () => {
    process.env.STORAGE_MODE = "supabase";
    const { isCloudMode } = await import("@/lib/auth");
    expect(isCloudMode()).toBe(true);
  });

  it("returns false when STORAGE_MODE is unset", async () => {
    delete process.env.STORAGE_MODE;
    const { isCloudMode } = await import("@/lib/auth");
    expect(isCloudMode()).toBe(false);
  });

  it("returns false when STORAGE_MODE is empty string", async () => {
    process.env.STORAGE_MODE = "";
    const { isCloudMode } = await import("@/lib/auth");
    expect(isCloudMode()).toBe(false);
  });
});
