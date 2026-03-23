import { NextRequest, NextResponse } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { readNote } from "@/lib/notes";
import { escapeHtml, formatInlineMarkdown } from "@/lib/sanitize";

// POST — format note for sharing (X thread, LinkedIn, newsletter)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { path, format } = await req.json();
    if (!path || !format) {
      return NextResponse.json({ error: "path and format required" }, { status: 400 });
    }

    const content = await readNote(path, ctx);
    const title = path.split("/").pop()?.replace(/\.md$/, "") || "Untitled";

    // Strip frontmatter
    const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();

    if (format === "x-thread") {
      return NextResponse.json({ result: formatXThread(title, body) });
    }
    if (format === "linkedin") {
      return NextResponse.json({ result: formatLinkedIn(title, body) });
    }
    if (format === "newsletter") {
      return NextResponse.json({ result: formatNewsletter(title, body) });
    }

    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

function formatXThread(title: string, body: string): { tweets: string[] } {
  // Split into logical paragraphs, then fit into 280-char tweets
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const tweets: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    // Strip markdown formatting
    const clean = para
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^#+\s+/, "")
      .replace(/^[-*]\s+/, "• ");

    if (!current) {
      current = clean;
    } else if (current.length + 2 + clean.length <= 280) {
      current += "\n\n" + clean;
    } else {
      tweets.push(current);
      current = clean;
    }
  }
  if (current) tweets.push(current);

  // Ensure no tweet exceeds 280 chars
  const final: string[] = [];
  for (const tweet of tweets) {
    if (tweet.length <= 280) {
      final.push(tweet);
    } else {
      // Split long tweet at sentence boundaries
      const sentences = tweet.match(/[^.!?]+[.!?]+/g) || [tweet];
      let chunk = "";
      for (const s of sentences) {
        if (chunk.length + s.length <= 280) {
          chunk += s;
        } else {
          if (chunk) final.push(chunk.trim());
          chunk = s.length <= 280 ? s : s.slice(0, 277) + "...";
        }
      }
      if (chunk) final.push(chunk.trim());
    }
  }

  // Add numbering if multiple tweets
  if (final.length > 1) {
    return {
      tweets: final.map((t, i) => {
        const num = `${i + 1}/${final.length}`;
        const maxLen = 280 - num.length - 1;
        const trimmed = t.length > maxLen ? t.slice(0, maxLen - 3) + "..." : t;
        return `${trimmed} ${num}`;
      }),
    };
  }

  return { tweets: final.length ? final : [title] };
}

function formatLinkedIn(title: string, body: string): { post: string; hashtags: string[] } {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) =>
      p
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^#+\s+/, "")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  // Hook line: first paragraph or title
  const hook = paragraphs[0] || title;
  const rest = paragraphs.slice(1).join("\n\n");

  // Extract hashtags from content
  const words = body.toLowerCase().split(/\s+/);
  const tagCounts = new Map<string, number>();
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, "");
    if (clean.length > 3) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
  }
  const topWords = Array.from(tagCounts.entries())
    .filter(([w]) => !["this", "that", "with", "from", "have", "been", "will", "your", "more", "than", "they", "what", "when", "were"].includes(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => `#${w}`);

  const post = `${hook}\n\n${rest}`.trim();
  return { post, hashtags: topWords };
}

function formatNewsletter(
  title: string,
  body: string
): { title: string; subtitle: string; html: string } {
  // Convert markdown to clean HTML with escaping for safe export to external tools.
  const lines = body.split("\n");
  const htmlLines: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      htmlLines.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlLines.push("</ol>");
      inOl = false;
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      htmlLines.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
    } else if (line.match(/^[-*]\s/)) {
      if (!inUl) {
        closeLists();
        htmlLines.push("<ul>");
        inUl = true;
      }
      htmlLines.push(`<li>${formatInlineMarkdown(line.replace(/^[-*]\s/, ""))}</li>`);
    } else if (line.match(/^\d+\.\s/)) {
      if (!inOl) {
        closeLists();
        htmlLines.push("<ol>");
        inOl = true;
      }
      htmlLines.push(`<li>${formatInlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li>`);
    } else if (line.startsWith("> ")) {
      closeLists();
      htmlLines.push(`<blockquote>${formatInlineMarkdown(line.slice(2))}</blockquote>`);
    } else if (line.trim()) {
      closeLists();
      htmlLines.push(`<p>${formatInlineMarkdown(line)}</p>`);
    } else {
      closeLists();
    }
  }
  closeLists();

  // Generate subtitle from first paragraph
  const firstPara = body
    .split(/\n{2,}/)[0]
    ?.replace(/[#*`]/g, "")
    .trim()
    .slice(0, 120);
  const subtitle = firstPara || `Thoughts on ${title}`;

  return {
    title: escapeHtml(title),
    subtitle: escapeHtml(subtitle),
    html: htmlLines.join("\n"),
  };
}
