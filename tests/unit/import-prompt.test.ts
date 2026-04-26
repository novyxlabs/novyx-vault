import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildImportResult, ImportResultView } from "@/components/ImportPrompt";

describe("ImportPrompt partial import result", () => {
  it("classifies the partial API response as non-success so it is not auto-dismissed", () => {
    const result = buildImportResult({
      imported: 7,
      failed: 2,
      total: 9,
      completed: false,
      failures: [
        { path: "bad-one.md", error: "Invalid path" },
        { path: "bad-two.md", error: "Write failed" },
      ],
    });

    expect(result.kind).toBe("partial");
    expect(result.message).toBe("Partially imported 7 of 9 notes. 2 failed.");
  });

  it("renders partial counts, failure details, and retry without success copy", () => {
    const html = renderToStaticMarkup(
      React.createElement(ImportResultView, {
        result: {
          kind: "partial",
          message: "Partially imported 7 of 9 notes. 2 failed.",
          failures: [
            { path: "bad-one.md", error: "Invalid path" },
            { path: "bad-two.md", error: "Write failed" },
          ],
        },
        importing: false,
        onRetry: vi.fn(),
      })
    );

    expect(html).toContain("Partially imported 7 of 9 notes. 2 failed.");
    expect(html).toContain("bad-one.md");
    expect(html).toContain("Invalid path");
    expect(html).toContain("bad-two.md");
    expect(html).toContain("Retry");
    expect(html).not.toContain("successfully");
  });
});
