import { beforeEach, describe, expect, it, vi } from "vitest";

const isCloudModeMock = vi.fn(() => true);
const getStorageContextMock = vi.fn();
const getStorageMock = vi.fn();
const writeNoteMock = vi.fn();
const walkAllNotesMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  isCloudMode: () => isCloudModeMock(),
  getStorageContext: () => getStorageContextMock(),
}));

vi.mock("@/lib/storage", () => ({
  getStorage: (...args: unknown[]) => getStorageMock(...args),
}));

vi.mock("@/lib/storage/fs-adapter", () => ({
  FsAdapter: vi.fn(function FsAdapter() {
    return {
      walkAllNotes: () => walkAllNotesMock(),
    };
  }),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      update: updateMock,
    })),
  })),
}));

describe("local-to-cloud import route", () => {
  beforeEach(() => {
    process.env.ALLOW_LOCAL_IMPORT = "true";
    isCloudModeMock.mockReturnValue(true);
    getStorageContextMock.mockResolvedValue({
      userId: "user-1",
      cookieHeader: "sb=test",
    });
    getStorageMock.mockReturnValue({ writeNote: writeNoteMock });
    walkAllNotesMock.mockResolvedValue([
      { relPath: "ok.md", content: "ok" },
      { relPath: "fail.md", content: "fail" },
    ]);
    writeNoteMock.mockReset();
    updateMock.mockReset();
    eqMock.mockReset();
    updateMock.mockReturnValue({ eq: eqMock });
  });

  it("does not mark import complete when any note fails", async () => {
    writeNoteMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("write failed"));

    const { POST } = await import("@/app/api/notes/import/route");
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(207);
    expect(body).toMatchObject({
      imported: 1,
      failed: 1,
      total: 2,
      completed: false,
      failures: [{ path: "fail.md", error: "write failed" }],
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("marks import complete only when every note succeeds", async () => {
    writeNoteMock.mockResolvedValue(undefined);

    const { POST } = await import("@/app/api/notes/import/route");
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      imported: 2,
      failed: 0,
      total: 2,
      completed: true,
    });
    expect(updateMock).toHaveBeenCalledWith({
      import_completed_at: expect.any(String),
    });
    expect(eqMock).toHaveBeenCalledWith("id", "user-1");
  });
});
