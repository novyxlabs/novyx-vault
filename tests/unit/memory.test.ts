import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the novyx module
vi.mock("@/lib/novyx", () => ({
  getNovyxForKey: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isCloudMode: vi.fn(() => false),
}));

describe("memory functions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NOVYX_MEMORY_API_KEY;
  });

  it("recallMemories returns empty array when no client", async () => {
    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue(null);

    const { recallMemories } = await import("@/lib/memory");
    const result = await recallMemories("test query");
    expect(result).toEqual([]);
  });

  it("recallMemories returns observations from SDK", async () => {
    const mockRecall = vi.fn().mockResolvedValue({
      memories: [
        { observation: "memory 1" },
        { observation: "memory 2" },
      ],
    });

    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue({ recall: mockRecall } as unknown as ReturnType<typeof getNovyxForKey>);

    const { recallMemories } = await import("@/lib/memory");
    const result = await recallMemories("test", "user1", "key");
    expect(result).toEqual(["memory 1", "memory 2"]);
    expect(mockRecall).toHaveBeenCalledWith("test", { tags: ["user:user1"] });
  });

  it("does not use NOVYX_MEMORY_API_KEY fallback in cloud mode", async () => {
    process.env.NOVYX_MEMORY_API_KEY = "global-key";
    const { isCloudMode } = await import("@/lib/auth");
    vi.mocked(isCloudMode).mockReturnValue(true);

    const { getNovyxForKey } = await import("@/lib/novyx");
    const { recallMemories } = await import("@/lib/memory");

    const result = await recallMemories("test query");

    expect(result).toEqual([]);
    expect(getNovyxForKey).not.toHaveBeenCalled();
  });

  it("recallMemories returns empty array on SDK error", async () => {
    const mockRecall = vi.fn().mockRejectedValue(new Error("SDK error"));
    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue({ recall: mockRecall } as unknown as ReturnType<typeof getNovyxForKey>);

    const { recallMemories } = await import("@/lib/memory");
    const result = await recallMemories("test", undefined, "key");
    expect(result).toEqual([]);
  });

  it("forgetMemory returns false when no client", async () => {
    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue(null);

    const { forgetMemory } = await import("@/lib/memory");
    const result = await forgetMemory("some-id");
    expect(result).toBe(false);
  });

  it("listMemories returns empty result when no client", async () => {
    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue(null);

    const { listMemories } = await import("@/lib/memory");
    const result = await listMemories();
    expect(result).toEqual({ memories: [], total: 0 });
  });

  it("getKnowledgeGraph returns empty when no client", async () => {
    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue(null);

    const { getKnowledgeGraph } = await import("@/lib/memory");
    const result = await getKnowledgeGraph();
    expect(result).toEqual({ nodes: [], edges: [] });
  });

  it("rememberExchange reports false when no client is available", async () => {
    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue(null);

    const { rememberExchange } = await import("@/lib/memory");
    await expect(rememberExchange("hello", "world")).resolves.toBe(false);
  });

  it("rememberExchange reports true after SDK remember succeeds", async () => {
    const mockRemember = vi.fn().mockResolvedValue({ uuid: "memory-1" });
    const { getNovyxForKey } = await import("@/lib/novyx");
    vi.mocked(getNovyxForKey).mockReturnValue({ remember: mockRemember } as unknown as ReturnType<typeof getNovyxForKey>);

    const { rememberExchange } = await import("@/lib/memory");
    await expect(rememberExchange("hello", "world", "user1", "key")).resolves.toBe(true);
    expect(mockRemember).toHaveBeenCalledWith("hello", {
      auto_link: true,
      context: "world",
      tags: ["user:user1", "source:vault"],
    });
  });
});
