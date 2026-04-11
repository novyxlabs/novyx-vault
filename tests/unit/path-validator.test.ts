import { describe, it, expect } from "vitest";
import {
  validateNotePath,
  tryValidateNotePath,
  InvalidPathError,
} from "@/lib/storage/path-validator";

describe("validateNotePath", () => {
  describe("accepts valid paths", () => {
    const cases = [
      "",
      "note",
      "note.md",
      "folder/note",
      "folder/sub/note",
      "My Folder/My Note",
      "with-dashes",
      "with_underscores",
      "with.dots.in.middle",
      "unicode-日本語-note",
      "2026-04-11 daily",
    ];
    for (const p of cases) {
      it(`accepts ${JSON.stringify(p)}`, () => {
        expect(() => validateNotePath(p)).not.toThrow();
      });
    }
  });

  describe("rejects traversal attempts", () => {
    const cases = [
      "..",
      "../etc/passwd",
      "folder/../escape",
      "folder/sub/../../escape",
      "./relative",
      "folder/./note",
    ];
    for (const p of cases) {
      it(`rejects ${JSON.stringify(p)}`, () => {
        expect(() => validateNotePath(p)).toThrow(InvalidPathError);
      });
    }
  });

  describe("rejects absolute paths", () => {
    const cases = [
      "C:/Windows/System32",
      "C:\\Windows\\System32",
      "D:/data",
    ];
    for (const p of cases) {
      it(`rejects ${JSON.stringify(p)}`, () => {
        expect(() => validateNotePath(p)).toThrow(InvalidPathError);
      });
    }
  });

  describe("normalizes leading slashes", () => {
    it("strips a single leading slash", () => {
      expect(validateNotePath("/note")).toBe("note");
    });
    it("strips multiple leading slashes", () => {
      expect(validateNotePath("///note")).toBe("note");
    });
  });

  describe("rejects backslashes", () => {
    it("rejects Windows-style separators", () => {
      expect(() => validateNotePath("folder\\note")).toThrow(InvalidPathError);
    });
  });

  describe("rejects control characters", () => {
    it("rejects null byte", () => {
      expect(() => validateNotePath("note\u0000")).toThrow(InvalidPathError);
    });
    it("rejects newline", () => {
      expect(() => validateNotePath("note\nname")).toThrow(InvalidPathError);
    });
    it("rejects DEL", () => {
      expect(() => validateNotePath("note\u007f")).toThrow(InvalidPathError);
    });
  });

  describe("rejects empty segments", () => {
    it("rejects double slash", () => {
      expect(() => validateNotePath("folder//note")).toThrow(InvalidPathError);
    });
  });

  describe("rejects hidden segments", () => {
    it("rejects .trash targeting", () => {
      expect(() => validateNotePath(".trash/note")).toThrow(InvalidPathError);
    });
    it("rejects .history targeting", () => {
      expect(() => validateNotePath(".history/note")).toThrow(InvalidPathError);
    });
    it("rejects dotfile leaf", () => {
      expect(() => validateNotePath("folder/.hidden")).toThrow(InvalidPathError);
    });
  });

  describe("rejects Windows-reserved endings", () => {
    it("rejects trailing dot", () => {
      expect(() => validateNotePath("note.")).toThrow(InvalidPathError);
    });
    it("rejects trailing space", () => {
      expect(() => validateNotePath("note ")).toThrow(InvalidPathError);
    });
  });

  describe("rejects over-length", () => {
    it("rejects segment over 255 chars", () => {
      const long = "a".repeat(256);
      expect(() => validateNotePath(long)).toThrow(InvalidPathError);
    });
    it("rejects path over 1024 chars", () => {
      const longPath = Array(50).fill("a".repeat(25)).join("/");
      expect(() => validateNotePath(longPath)).toThrow(InvalidPathError);
    });
  });

  describe("rejects non-strings", () => {
    it("rejects null", () => {
      expect(() => validateNotePath(null)).toThrow(InvalidPathError);
    });
    it("rejects number", () => {
      expect(() => validateNotePath(42)).toThrow(InvalidPathError);
    });
    it("rejects object", () => {
      expect(() => validateNotePath({})).toThrow(InvalidPathError);
    });
  });
});

describe("tryValidateNotePath", () => {
  it("returns the path on valid input", () => {
    expect(tryValidateNotePath("note")).toBe("note");
  });
  it("returns null on invalid input instead of throwing", () => {
    expect(tryValidateNotePath("../escape")).toBe(null);
    expect(tryValidateNotePath("\u0000")).toBe(null);
  });
});
