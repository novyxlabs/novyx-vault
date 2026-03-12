import { describe, it, expect } from "vitest";
import { sanitizeHref, formatInlineMarkdown } from "@/lib/sanitize";

describe("published note link sanitization", () => {
  it("allows https links", () => {
    const result = formatInlineMarkdown("[click](https://example.com)");
    expect(result).toContain('href="https://example.com"');
  });

  it("allows http links", () => {
    const result = formatInlineMarkdown("[click](http://example.com)");
    expect(result).toContain('href="http://example.com"');
  });

  it("allows mailto links", () => {
    const result = formatInlineMarkdown("[email](mailto:user@example.com)");
    expect(result).toContain('href="mailto:user@example.com"');
  });

  it("allows relative paths", () => {
    const result = formatInlineMarkdown("[page](/about)");
    expect(result).toContain('href="/about"');
  });

  it("allows anchor links", () => {
    const result = formatInlineMarkdown("[section](#heading)");
    expect(result).toContain('href="#heading"');
  });

  it("blocks javascript: URLs", () => {
    const result = formatInlineMarkdown("[xss](javascript:alert(1))");
    expect(result).not.toContain("href");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("xss"); // text preserved
  });

  it("blocks data: URLs", () => {
    const result = formatInlineMarkdown("[xss](data:text/html,<script>alert(1)</script>)");
    expect(result).not.toContain("href");
    expect(result).not.toContain("data:");
  });

  it("blocks protocol-relative URLs (//evil.example)", () => {
    const result = formatInlineMarkdown("[phish](//evil.example.com/steal)");
    expect(result).not.toContain("href");
    expect(result).not.toContain("//evil");
    expect(result).toContain("phish"); // text preserved
  });

  it("blocks vbscript: URLs", () => {
    const result = formatInlineMarkdown("[xss](vbscript:MsgBox)");
    expect(result).not.toContain("href");
  });

  it("blocks case-variant javascript: URLs", () => {
    const result = sanitizeHref("JaVaScRiPt:alert(1)");
    expect(result).toBe("");
  });

  it("escapes double quotes in href to prevent attribute breakout", () => {
    const payload = 'https://example.com" onmouseover="alert(1)';
    const result = sanitizeHref(payload);
    expect(result).not.toContain('"');
    expect(result).toContain("&quot;");
  });

  it("escapes single quotes in href", () => {
    const payload = "https://example.com' onmouseover='alert(1)";
    const result = sanitizeHref(payload);
    expect(result).not.toContain("'");
    expect(result).toContain("&#39;");
  });

  it("produces safe HTML when link has quote injection payload", () => {
    const md = '[click](https://example.com" onmouseover="alert(1))';
    const html = formatInlineMarkdown(md);
    // The " should be escaped so onmouseover stays inside the href value, not a real attribute
    expect(html).not.toMatch(/" onmouseover="/);
    expect(html).toContain("&quot;");
  });
});
