import { describe, it, expect, vi } from "vitest";
import path from "path";
import os from "os";

// We test the sanitizePath logic by importing the FsAdapter and calling methods
// that hit sanitizePath internally. Since we can't call sanitizePath directly
// (it's not exported), we test through the adapter methods.
// The adapter will throw "Invalid path" for traversal attempts before touching fs.

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockRejectedValue(new Error("ENOENT")),
    stat: vi.fn().mockRejectedValue(new Error("ENOENT")),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  },
}));

import { FsAdapter } from "@/lib/storage/fs-adapter";

const NOTES_DIR = path.join(os.homedir(), "SecondBrain");

describe("FsAdapter path traversal prevention", () => {
  const adapter = new FsAdapter();

  it("rejects sibling-prefix traversal (SecondBrain-backup)", async () => {
    // ../SecondBrain-backup/secrets would resolve to a path that starts
    // with NOTES_DIR string but is outside the actual directory
    await expect(
      adapter.readNote("../SecondBrain-backup/secrets")
    ).rejects.toThrow("Invalid path");
  });

  it("rejects parent directory traversal", async () => {
    await expect(
      adapter.readNote("../../etc/passwd")
    ).rejects.toThrow("Invalid path");
  });

  it("rejects absolute path escape", async () => {
    await expect(
      adapter.readNote("/etc/passwd")
    ).rejects.toThrow("Invalid path");
  });

  it("allows valid paths within SecondBrain", async () => {
    // This should NOT throw "Invalid path" — it will throw ENOENT from the mock
    await expect(
      adapter.readNote("notes/my-note.md")
    ).rejects.toThrow("ENOENT");
  });

  it("allows listing root directory", async () => {
    // Empty path should resolve to NOTES_DIR itself — must be allowed
    const result = await adapter.listNotes("");
    expect(result).toEqual([]);
  });

  it("rejects write to sibling-prefix path", async () => {
    await expect(
      adapter.writeNote("../SecondBrain-evil/payload", "bad")
    ).rejects.toThrow("Invalid path");
  });

  it("rejects rename to sibling-prefix path", async () => {
    await expect(
      adapter.renameNote("valid-note", "../SecondBrain-evil/stolen")
    ).rejects.toThrow("Invalid path");
  });
});
