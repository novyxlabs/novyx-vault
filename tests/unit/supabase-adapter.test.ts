import { describe, it, expect, vi } from "vitest";

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

describe("SupabaseAdapter.deleteNote — folder trash preserves child paths", () => {
  it("sets each child's own path as original_path when trashing a folder", async () => {
    const updateCalls: { data: Record<string, unknown>; id: string }[] = [];

    const mockSupa = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(function (this: unknown, _col: string, val: string) {
            // Return folder target on first chain, children on second
            const self = this as { _eqCount?: number };
            if (!self._eqCount) self._eqCount = 0;
            self._eqCount++;
            return {
              eq: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "folder-1", is_folder: true, path: "projects" },
                  error: null,
                }),
              }),
              like: vi.fn().mockResolvedValue({
                data: [
                  { id: "child-1", path: "projects/note-a" },
                  { id: "child-2", path: "projects/sub/note-b" },
                ],
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: { id: "folder-1", is_folder: true, path: "projects" },
                error: null,
              }),
            };
          }),
        }),
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
          eq: vi.fn().mockImplementation((_col: string, id: string) => {
            updateCalls.push({ data, id });
            return Promise.resolve({ error: null });
          }),
        })),
      }),
    };

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    await adapter.deleteNote("projects");

    // Verify each child got its own path as original_path
    const childUpdates = updateCalls.filter(
      (c) => c.id === "child-1" || c.id === "child-2"
    );
    expect(childUpdates).toHaveLength(2);

    const child1 = childUpdates.find((c) => c.id === "child-1");
    const child2 = childUpdates.find((c) => c.id === "child-2");
    expect(child1?.data.original_path).toBe("projects/note-a");
    expect(child2?.data.original_path).toBe("projects/sub/note-b");
  });
});

describe("SupabaseAdapter — path normalization", () => {
  it("inserts a new note with the normalized validator result", async () => {
    const insertPayloads: Array<Record<string, unknown>> = [];
    const mockSupa = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          insertPayloads.push(payload);
          return Promise.resolve({ error: null });
        }),
      })),
    };

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    await adapter.writeNote("/folder/note", "body");

    expect(insertPayloads.at(-1)?.path).toBe("folder/note");
    expect(insertPayloads.at(-1)?.name).toBe("note");
    expect(insertPayloads.at(-1)?.content).toBe("body");
  });

  it("updates an existing non-trashed note instead of using upsert", async () => {
    const updateCalls: Array<{ data: Record<string, unknown>; id: string }> = [];
    const mockSupa = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "note-1" },
            error: null,
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
          eq: vi.fn().mockImplementation((_col: string, id: string) => {
            updateCalls.push({ data, id });
            return Promise.resolve({ error: null });
          }),
        })),
      }),
    };

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    await adapter.writeNote("/note", "updated body");

    expect(mockSupa.from().insert).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe("note-1");
    expect(updateCalls[0].data).toMatchObject({
      name: "note",
      content: "updated body",
      is_folder: false,
    });
  });

  it("inserts a new note when only a trashed row shares the path", async () => {
    const eqCalls: Array<[string, unknown]> = [];
    const insertPayloads: Array<Record<string, unknown>> = [];
    const query = {
      eq: vi.fn().mockImplementation((col: string, value: unknown) => {
        eqCalls.push([col, value]);
        return query;
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const mockSupa = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(query),
        insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          insertPayloads.push(payload);
          return Promise.resolve({ error: null });
        }),
      }),
    };

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    await adapter.writeNote("/note", "new body");

    expect(eqCalls).toContainEqual(["is_trashed", false]);
    expect(insertPayloads).toHaveLength(1);
    expect(insertPayloads[0]).toMatchObject({
      path: "note",
      content: "new body",
      is_trashed: false,
    });
  });

  it("queries the normalized validator result when reading a note", async () => {
    let orClause = "";
    const mockSupa = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockImplementation((clause: string) => {
          orClause = clause;
          return {
            single: vi.fn().mockResolvedValue({
              data: { content: "body" },
              error: null,
            }),
          };
        }),
      }),
    };

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    await expect(adapter.readNote("/folder/note")).resolves.toBe("body");
    expect(orClause).toBe("path.eq.folder/note,path.eq.folder/note.md");
  });
});

describe("SupabaseAdapter.restoreFromTrash — folder restore includes children", () => {
  it("restores a trashed folder and all its trashed children", async () => {
    const updateCalls: { data: Record<string, unknown>; id: string }[] = [];

    const mockSupa = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(function (this: unknown) {
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "folder-1",
                      original_path: "projects",
                      path: "projects",
                      is_folder: true,
                    },
                    error: null,
                  }),
                }),
                or: vi.fn().mockResolvedValue({
                  data: [
                    { id: "child-1", original_path: "projects/note-a", path: "projects/note-a" },
                    { id: "child-2", original_path: "projects/sub/note-b", path: "projects/sub/note-b" },
                  ],
                  error: null,
                }),
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "folder-1",
                  original_path: "projects",
                  path: "projects",
                  is_folder: true,
                },
                error: null,
              }),
            };
          }),
        }),
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
          eq: vi.fn().mockImplementation((_col: string, id: string) => {
            updateCalls.push({ data, id });
            return Promise.resolve({ error: null });
          }),
        })),
      }),
    };

    const adapter = new SupabaseAdapter("user1");
    (adapter as unknown as { supabase: unknown }).supabase = mockSupa;

    const restored = await adapter.restoreFromTrash("folder-1");

    expect(restored).toBe("projects");

    // Should have restored the folder + 2 children = 3 updates
    expect(updateCalls.length).toBeGreaterThanOrEqual(3);

    // Verify children were restored with their own original paths
    const child1 = updateCalls.find((c) => c.id === "child-1");
    const child2 = updateCalls.find((c) => c.id === "child-2");
    expect(child1).toBeDefined();
    expect(child2).toBeDefined();
    expect(child1?.data.is_trashed).toBe(false);
    expect(child2?.data.is_trashed).toBe(false);
    expect(child1?.data.path).toBe("projects/note-a");
    expect(child2?.data.path).toBe("projects/sub/note-b");
  });
});
