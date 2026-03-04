import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing
vi.mock("@/lib/supabase", () => ({
  createServerSupabase: vi.fn(),
  createServiceSupabase: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isCloudMode: vi.fn(),
}));

describe("Feature gating", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("FeatureGating interface has correct shape", async () => {
    const { getFeatureGating } = await import("@/lib/novyx");

    // With no valid Novyx client, it falls back to free tier
    const gating = await getFeatureGating("fake-key");
    expect(gating).toHaveProperty("tier");
    expect(gating).toHaveProperty("features");
    expect(gating).toHaveProperty("usage");
    expect(gating.features).toHaveProperty("graph");
    expect(gating.features).toHaveProperty("cortex");
    expect(gating.features).toHaveProperty("replay");
    expect(gating.features).toHaveProperty("insights");
    // drift should NOT be present (removed as unused)
    expect(gating.features).not.toHaveProperty("drift");
  });

  it("free tier disables all pro features", async () => {
    const { getFeatureGating } = await import("@/lib/novyx");
    const gating = await getFeatureGating("fake-key");
    expect(gating.tier).toBe("free");
    expect(gating.features.graph).toBe(false);
    expect(gating.features.cortex).toBe(false);
    expect(gating.features.replay).toBe(false);
    expect(gating.features.insights).toBe(false);
  });

  it("requireFeature allows all features when no API key (desktop mode)", async () => {
    const { requireFeature } = await import("@/lib/novyx");
    const result = await requireFeature(null, "graph");
    expect(result).toBeNull();
  });

  it("requireFeature allows all features with undefined key", async () => {
    const { requireFeature } = await import("@/lib/novyx");
    const result = await requireFeature(undefined, "cortex");
    expect(result).toBeNull();
  });
});

describe("getUserNovyxKey", () => {
  const originalEnv = process.env.NOVYX_MEMORY_API_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NOVYX_MEMORY_API_KEY;
    } else {
      process.env.NOVYX_MEMORY_API_KEY = originalEnv;
    }
    vi.resetModules();
  });

  it("returns env var in desktop mode", async () => {
    const { isCloudMode } = await import("@/lib/auth");
    vi.mocked(isCloudMode).mockReturnValue(false);
    process.env.NOVYX_MEMORY_API_KEY = "test-key-123";

    const { getUserNovyxKey } = await import("@/lib/novyx");
    const key = await getUserNovyxKey();
    expect(key).toBe("test-key-123");
  });

  it("returns null in desktop mode when no env var", async () => {
    const { isCloudMode } = await import("@/lib/auth");
    vi.mocked(isCloudMode).mockReturnValue(false);
    delete process.env.NOVYX_MEMORY_API_KEY;

    const { getUserNovyxKey } = await import("@/lib/novyx");
    const key = await getUserNovyxKey();
    expect(key).toBeNull();
  });

  it("returns null in cloud mode when no userId", async () => {
    const { isCloudMode } = await import("@/lib/auth");
    vi.mocked(isCloudMode).mockReturnValue(true);

    const { getUserNovyxKey } = await import("@/lib/novyx");
    const key = await getUserNovyxKey(undefined, "cookie");
    expect(key).toBeNull();
  });
});
