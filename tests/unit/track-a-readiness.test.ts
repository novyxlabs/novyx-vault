import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function sourceFor(filePath: string): string {
  return fs.readFileSync(path.join(root, filePath), "utf-8");
}

describe("Phase 7 Track A save failure guardrails", () => {
  it("blocks note navigation when flushSave fails and offers retry/discard actions", () => {
    const source = sourceFor("components/AppShell.tsx");

    expect(source).toContain("async (): Promise<boolean>");
    expect(source).toContain("return false;");
    expect(source).toContain("const saved = await flushSave();");
    expect(source).toContain("if (!saved) {");
    expect(source).toContain("setBlockedNavigationPath(path);");
    expect(source).toContain("Retry save");
    expect(source).toContain("Discard changes");
  });

  it("does not overwrite a pending save for another note", () => {
    const source = sourceFor("components/AppShell.tsx");

    expect(source).toContain("pendingSave.current && pendingSave.current.path !== path");
    expect(source).toContain("pendingSave.current && pendingSave.current.path !== activeNote");
    expect(source).toContain("pendingSave.current?.path === path");
    expect(source).toContain("pendingSave.current.content === newContent");
  });
});

describe("Phase 7 Track A Voice Capture headers", () => {
  it("allows microphone and display capture without enabling camera or geolocation", async () => {
    const config = (await import("../../next.config")).default as {
      headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
    };

    const headers = await config.headers?.();
    const appHeaders = headers?.find((entry) => entry.source === "/:path*")?.headers ?? [];
    const permissions = appHeaders.find((header) => header.key === "Permissions-Policy")?.value ?? "";

    expect(permissions).toContain("microphone=(self)");
    expect(permissions).toContain("display-capture=(self)");
    expect(permissions).toContain("camera=()");
    expect(permissions).toContain("geolocation=()");
  });

  it("allows the local transcription model fetch/runtime endpoints narrowly", async () => {
    const config = (await import("../../next.config")).default as {
      headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
    };

    const headers = await config.headers?.();
    const appHeaders = headers?.find((entry) => entry.source === "/:path*")?.headers ?? [];
    const csp = appHeaders.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

    expect(csp).toContain("https://huggingface.co");
    expect(csp).toContain("https://cdn-lfs.huggingface.co");
    expect(csp).toContain("https://*.hf.co");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("model-src 'self'");
    expect(csp).toContain("'wasm-unsafe-eval'");
  });
});

describe("Phase 7 Track A core accessibility", () => {
  it("adds accessible names and toggle state to core editor and capture controls", () => {
    const appShell = sourceFor("components/AppShell.tsx");
    const noteEditor = sourceFor("components/NoteEditor.tsx");
    const voiceCapture = sourceFor("components/VoiceCapture.tsx");
    const newNoteModal = sourceFor("components/NewNoteModal.tsx");

    expect(appShell).toContain('aria-label="Open command palette"');
    expect(appShell).toContain('aria-label={isChatOpen ? "Close chat" : "Open chat"}');
    expect(noteEditor).toContain('aria-label="Editor only"');
    expect(noteEditor).toContain('aria-pressed={viewMode === "editor"}');
    expect(noteEditor).toContain('aria-pressed={viewMode === "split"}');
    expect(noteEditor).toContain('aria-pressed={viewMode === "preview"}');
    expect(voiceCapture).toContain('aria-label="Close Voice Capture"');
    expect(voiceCapture).toContain("Start ${audioSource === \"system\" ? \"system audio\" : \"microphone\"} recording");
    expect(newNoteModal).toContain('role="dialog"');
    expect(newNoteModal).toContain('aria-modal="true"');
    expect(newNoteModal).toContain('htmlFor="new-note-name"');
  });
});
