import { describe, expect, it } from "vitest";
import { safeJsonLd } from "@/app/p/[slug]/page";

describe("published page JSON-LD", () => {
  it("escapes user-controlled script terminators in note titles", () => {
    const html = safeJsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "</script><script>alert(1)</script>",
    });

    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c/script>");
    expect(html).toContain("\\u003cscript>alert(1)\\u003c/script>");
  });
});
