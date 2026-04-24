import { describe, expect, it } from "vitest";
import {
  buildCaptureNoteContent,
  buildCaptureNotePath,
  getCaptureLabel,
  slugifyCaptureTitle,
} from "@/lib/capture";

describe("capture note contract", () => {
  const capturedAt = new Date(2026, 3, 24, 13, 45, 6);
  const capturedAtIso = capturedAt.toISOString();

  it("builds stable capture paths under the daily Captures folder", () => {
    expect(buildCaptureNotePath("quick", "Ship the vault mode cleanup", capturedAt)).toBe(
      "Captures/2026-04-24/134506-quick-ship-the-vault-mode-cleanup.md",
    );
    expect(buildCaptureNotePath("brain-dump", "Messy: idea / notes?", capturedAt)).toBe(
      "Captures/2026-04-24/134506-dump-messy-idea-notes.md",
    );
  });

  it("normalizes empty or punctuation-only titles", () => {
    expect(slugifyCaptureTitle("/// ???")).toBe("untitled");
  });

  it("writes capture metadata into markdown frontmatter", () => {
    const content = buildCaptureNoteContent({
      kind: "clip",
      title: "Interesting Article",
      content: "A remixed note.",
      capturedAt,
      sourceUrl: "https://example.com/article",
    });

    expect(content).toContain('capture_type: "clip"');
    expect(content).toContain('capture_source: "Clip & Remix"');
    expect(content).toContain(`captured_at: "${capturedAtIso}"`);
    expect(content).toContain('source_url: "https://example.com/article"');
    expect(content).toContain("# Interesting Article\n\nA remixed note.");
  });

  it("exposes user-facing labels for capture surfaces", () => {
    expect(getCaptureLabel("voice")).toBe("Voice Capture");
  });
});
