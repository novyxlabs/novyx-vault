import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before import
vi.mock("@/lib/supabase", () => ({
  createServerSupabase: vi.fn(),
}));

import { SupabaseAdapter } from "@/lib/storage/supabase-adapter";

function mockSupabaseQuery(data: unknown[] | null, error: { message: string } | null = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

describe("SupabaseAdapter.listNotes — buildTree", () => {
  it("builds a flat list for root-level notes", async () => {
    const mockSupa = mockSupabaseQuery([
      { id: "1", path: "hello", name: "hello", is_folder: false, modified_at: "2025-01-01" },
      { id: "2", path: "world", name: "world", is_folder: false, modified_at: "2025-01-02" },
    ]);

    const adapter = new SupabaseAdapter("user1");
    // Replace the internal supabase client with our mock
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    const result = await adapter.listNotes();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("hello");
    expect(result[1].name).toBe("world");
    expect(result[0].isFolder).toBe(false);
  });

  it("nests children under folders", async () => {
    const mockSupa = mockSupabaseQuery([
      { id: "1", path: "projects", name: "projects", is_folder: true, modified_at: "2025-01-01" },
      { id: "2", path: "projects/todo", name: "todo", is_folder: false, modified_at: "2025-01-02" },
      { id: "3", path: "projects/ideas", name: "ideas", is_folder: false, modified_at: "2025-01-03" },
      { id: "4", path: "readme", name: "readme", is_folder: false, modified_at: "2025-01-04" },
    ]);

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    const result = await adapter.listNotes();
    // Folders first, then files
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("projects");
    expect(result[0].isFolder).toBe(true);
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0].name).toBe("ideas");
    expect(result[0].children![1].name).toBe("todo");
    expect(result[1].name).toBe("readme");
  });

  it("handles deeply nested folders", async () => {
    const mockSupa = mockSupabaseQuery([
      { id: "1", path: "a", name: "a", is_folder: true, modified_at: "2025-01-01" },
      { id: "2", path: "a/b", name: "b", is_folder: true, modified_at: "2025-01-01" },
      { id: "3", path: "a/b/c", name: "c", is_folder: false, modified_at: "2025-01-01" },
    ]);

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    const result = await adapter.listNotes();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a");
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].name).toBe("b");
    expect(result[0].children![0].children).toHaveLength(1);
    expect(result[0].children![0].children![0].name).toBe("c");
  });

  it("returns empty array for no data", async () => {
    const mockSupa = mockSupabaseQuery(null);

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    const result = await adapter.listNotes();
    expect(result).toEqual([]);
  });

  it("throws on query error", async () => {
    const mockSupa = mockSupabaseQuery(null, { message: "Database error" });

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    await expect(adapter.listNotes()).rejects.toThrow("Database error");
  });

  it("lists only a subdirectory when dirPath is given", async () => {
    const mockSupa = mockSupabaseQuery([
      { id: "1", path: "projects", name: "projects", is_folder: true, modified_at: "2025-01-01" },
      { id: "2", path: "projects/todo", name: "todo", is_folder: false, modified_at: "2025-01-02" },
      { id: "3", path: "projects/ideas", name: "ideas", is_folder: false, modified_at: "2025-01-03" },
      { id: "4", path: "readme", name: "readme", is_folder: false, modified_at: "2025-01-04" },
    ]);

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    const result = await adapter.listNotes("projects");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("ideas");
    expect(result[1].name).toBe("todo");
  });

  it("sorts folders before files", async () => {
    const mockSupa = mockSupabaseQuery([
      { id: "1", path: "zfile", name: "zfile", is_folder: false, modified_at: "2025-01-01" },
      { id: "2", path: "afolder", name: "afolder", is_folder: true, modified_at: "2025-01-01" },
    ]);

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    const result = await adapter.listNotes();
    expect(result[0].name).toBe("afolder");
    expect(result[0].isFolder).toBe(true);
    expect(result[1].name).toBe("zfile");
    expect(result[1].isFolder).toBe(false);
  });

  it("only issues one query (no N+1)", async () => {
    const mockSupa = mockSupabaseQuery([
      { id: "1", path: "folder1", name: "folder1", is_folder: true, modified_at: "2025-01-01" },
      { id: "2", path: "folder1/note1", name: "note1", is_folder: false, modified_at: "2025-01-01" },
      { id: "3", path: "folder2", name: "folder2", is_folder: true, modified_at: "2025-01-01" },
      { id: "4", path: "folder2/note2", name: "note2", is_folder: false, modified_at: "2025-01-01" },
    ]);

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    await adapter.listNotes();
    // from() should only be called once (single query)
    expect(mockSupa.from).toHaveBeenCalledTimes(1);
  });
});
