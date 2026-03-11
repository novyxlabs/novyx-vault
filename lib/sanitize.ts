/**
 * Sanitize a URL for use in an href attribute.
 * Allows http, https, mailto, relative paths, and anchors.
 * Blocks javascript:, data:, vbscript:, protocol-relative (//), and anything else.
 */
export function sanitizeHref(url: string): string {
  const decoded = url.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const trimmed = decoded.trim().toLowerCase();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:")) {
    return url;
  }
  // Allow relative paths and anchors, but block protocol-relative URLs (//evil.example)
  if ((trimmed.startsWith("/") || trimmed.startsWith("#")) && !trimmed.startsWith("//")) {
    return url;
  }
  return "";
}

/** HTML-escape a string for safe insertion into HTML */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Format inline markdown (bold, italic, code, links) with sanitized hrefs */
export function formatInlineMarkdown(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match: string, text: string, href: string) => {
      const safe = sanitizeHref(href);
      if (!safe) return text;
      return `<a href="${safe}" target="_blank" rel="noopener">${text}</a>`;
    });
}
