import { notFound } from "next/navigation";
import { createServiceSupabase } from "@/lib/supabase";
import { escapeHtml, formatInlineMarkdown } from "@/lib/sanitize";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPublishedNote(slug: string) {
  const supabase = createServiceSupabase();
  const { data } = await supabase
    .from("notes")
    .select("name, content, published_at, slug")
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("is_trashed", false)
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const note = await getPublishedNote(slug);
  if (!note) return { title: "Not Found" };

  const description = note.content
    ?.replace(/^---\n[\s\S]*?\n---\n?/, "")
    .replace(/[#*`\[\]]/g, "")
    .trim()
    .slice(0, 160);

  return {
    title: note.name,
    description,
    openGraph: {
      title: note.name,
      description,
      type: "article",
      publishedTime: note.published_at,
    },
  };
}

function renderMarkdown(content: string): string {
  // Strip frontmatter
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
  const lines = body.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let inList = false;
  let inOl = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push("</code></pre>");
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        html.push("<pre><code>");
      }
      continue;
    }
    if (inCodeBlock) {
      html.push(esc(line));
      continue;
    }
    if (inList && !line.match(/^[-*]\s/)) { html.push("</ul>"); inList = false; }
    if (inOl && !line.match(/^\d+\.\s/)) { html.push("</ol>"); inOl = false; }

    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) {
      html.push(`<h${hm[1].length}>${fmt(hm[2])}</h${hm[1].length}>`);
    } else if (line.match(/^[-*]\s\[[ xX]\]\s/)) {
      const checked = !line.match(/^[-*]\s\[ \]/);
      const text = line.replace(/^[-*]\s\[[ xX]\]\s*/, "");
      html.push(`<p class="cb"><input type="checkbox" ${checked ? "checked" : ""} disabled> ${fmt(text)}</p>`);
    } else if (line.match(/^[-*]\s/)) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${fmt(line.replace(/^[-*]\s/, ""))}</li>`);
    } else if (line.match(/^\d+\.\s/)) {
      if (!inOl) { html.push("<ol>"); inOl = true; }
      html.push(`<li>${fmt(line.replace(/^\d+\.\s/, ""))}</li>`);
    } else if (line.startsWith("> ")) {
      html.push(`<blockquote>${fmt(line.slice(2))}</blockquote>`);
    } else if (line.match(/^---+$/)) {
      html.push("<hr>");
    } else if (line.trim()) {
      html.push(`<p>${fmt(line)}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  if (inOl) html.push("</ol>");
  if (inCodeBlock) html.push("</code></pre>");
  return html.join("\n");
}

const esc = escapeHtml;
const fmt = formatInlineMarkdown;

export default async function PublishedNotePage({ params }: Props) {
  const { slug } = await params;
  const note = await getPublishedNote(slug);
  if (!note) notFound();

  const htmlContent = renderMarkdown(note.content || "");

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root { color-scheme: light dark; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            max-width: 720px;
            margin: 0 auto;
            padding: 48px 24px 80px;
            line-height: 1.75;
            color: #1a1a1a;
            background: #fafafa;
          }
          @media (prefers-color-scheme: dark) {
            body { color: #e4e4e7; background: #0f0f0f; }
            pre { background: #1c1c1f; }
            code { background: #1c1c1f; }
            blockquote { border-color: #8b5cf6; background: rgba(139,92,246,0.05); color: #a1a1aa; }
            hr { border-color: #27272a; }
            a { color: #a78bfa; }
            .footer a { color: #8b5cf6; }
          }
          h1 { font-size: 2em; font-weight: 700; margin: 0 0 8px; line-height: 1.2; }
          h2 { font-size: 1.5em; font-weight: 600; margin: 32px 0 12px; }
          h3 { font-size: 1.25em; font-weight: 600; margin: 24px 0 8px; }
          h4, h5, h6 { font-size: 1.1em; font-weight: 600; margin: 20px 0 8px; }
          p { margin: 12px 0; }
          pre { background: #f0f0f0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
          code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
          pre code { background: none; padding: 0; }
          blockquote { border-left: 3px solid #8b5cf6; margin: 16px 0; padding: 8px 16px; color: #666; background: #f8f7ff; border-radius: 0 8px 8px 0; }
          a { color: #8b5cf6; text-decoration: none; }
          a:hover { text-decoration: underline; }
          hr { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
          ul, ol { padding-left: 24px; margin: 12px 0; }
          li { margin: 4px 0; }
          strong { font-weight: 600; }
          .cb { margin: 4px 0; }
          .cb input { margin-right: 6px; }
          .footer {
            margin-top: 64px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            font-size: 13px;
            color: #999;
          }
          .footer a { color: #8b5cf6; font-weight: 500; }
          .date { font-size: 13px; color: #999; margin-bottom: 24px; }
        `}} />
      </head>
      <body>
        <article>
          <h1>{note.name}</h1>
          {note.published_at && (
            <p className="date">
              {new Date(note.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </article>
        <div className="footer">
          Written in{" "}
          <a href="https://vault.novyxlabs.com" target="_blank" rel="noopener">
            Novyx Vault
          </a>
        </div>
      </body>
    </html>
  );
}
