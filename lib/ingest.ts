import OpenAI from "openai";

export interface IngestResult {
  title: string;
  url: string;
  type: "youtube" | "twitter" | "article";
  author?: string;
  date?: string;
  description?: string;
  image?: string;
  siteName?: string;
  articleText?: string;
}

export function detectUrlType(url: string): "youtube" | "twitter" | "article" {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") return "youtube";
    if (host === "twitter.com" || host === "x.com" || host === "mobile.twitter.com") return "twitter";
  } catch {
    // invalid URL
  }
  return "article";
}

function parseMetaTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) tags["title"] = titleMatch[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');

  const metaRegex = /<meta\s+([^>]*?)>/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = match[1];
    const propMatch = attrs.match(/(?:property|name)=["']([^"']*)["']/i);
    const contentMatch = attrs.match(/content=["']([^"']*)["']/i);
    if (propMatch && contentMatch) {
      const value = contentMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      tags[propMatch[1].toLowerCase()] = value;
    }
  }

  return tags;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

function extractArticleText(html: string): string {
  // Try <article> tag first
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const source = articleMatch ? articleMatch[1] : html;

  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(source)) !== null) {
    const text = stripTags(m[1]).trim();
    if (text.length > 40) {
      paragraphs.push(text);
    }
  }

  return paragraphs.join("\n\n").substring(0, 3000);
}

const BLOCKED_HOST_RE =
  /^(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|localhost|\[?::1\]?)$/i;

const BLOCKED_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.google",
  "instance-data",
]);

function isBlockedUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname;
    if (BLOCKED_HOST_RE.test(host)) return true;
    if (BLOCKED_HOSTS.has(host)) return true;
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return true;
    return false;
  } catch {
    return true;
  }
}

async function fetchHtml(url: string): Promise<string> {
  if (isBlockedUrl(url)) {
    throw new Error("URL targets a blocked address");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NovyxVault/1.0)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(10000),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const text = await res.text();
  return text.substring(0, 100000);
}

async function extractYouTube(url: string): Promise<IngestResult> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });

    if (res.ok) {
      const data = await res.json();

      // Also try to fetch the page for description
      let description: string | undefined;
      try {
        const html = await fetchHtml(url);
        const meta = parseMetaTags(html);
        description = meta["og:description"] || meta["description"];
      } catch {
        // ok, description is optional
      }

      return {
        title: data.title || "YouTube Video",
        url,
        type: "youtube",
        author: data.author_name,
        image: data.thumbnail_url,
        siteName: "YouTube",
        description,
      };
    }
  } catch {
    // fall through to generic extraction
  }

  return extractGenericArticle(url);
}

async function extractTwitter(url: string): Promise<IngestResult> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });

    if (res.ok) {
      const data = await res.json();
      // Extract tweet text from the HTML response
      const tweetText = stripTags(data.html || "");
      const authorMatch = data.author_name;
      const authorUrl = data.author_url || "";
      const username = authorUrl.split("/").pop() || authorMatch;

      return {
        title: `Tweet by @${username}`,
        url,
        type: "twitter",
        author: `@${username}`,
        description: tweetText,
        siteName: "X / Twitter",
        articleText: tweetText,
      };
    }
  } catch {
    // fall through to generic extraction
  }

  return extractGenericArticle(url);
}

async function extractGenericArticle(url: string): Promise<IngestResult> {
  const html = await fetchHtml(url);
  const meta = parseMetaTags(html);

  const title = meta["og:title"] || meta["twitter:title"] || meta["title"] || new URL(url).hostname;
  const description = meta["og:description"] || meta["twitter:description"] || meta["description"];
  const image = meta["og:image"] || meta["twitter:image"];
  const author = meta["author"] || meta["article:author"] || meta["og:article:author"];
  const date = meta["article:published_time"] || meta["date"] || meta["pubdate"];
  const siteName = meta["og:site_name"] || new URL(url).hostname;

  const articleText = extractArticleText(html);

  return {
    title,
    url,
    type: "article",
    author,
    date: date ? formatDate(date) : undefined,
    description,
    image,
    siteName,
    articleText: articleText || description,
  };
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

export async function fetchUrlMetadata(url: string): Promise<IngestResult> {
  const type = detectUrlType(url);

  switch (type) {
    case "youtube":
      return extractYouTube(url);
    case "twitter":
      return extractTwitter(url);
    default:
      return extractGenericArticle(url);
  }
}

export function formatAsMarkdown(result: IngestResult, summary?: string): string {
  const lines: string[] = [];

  lines.push(`# ${result.title}`);
  lines.push("");

  const domain = (() => {
    try { return new URL(result.url).hostname.replace("www.", ""); } catch { return result.url; }
  })();
  lines.push(`**Source:** [${domain}](${result.url})`);

  if (result.author) lines.push(`**Author:** ${result.author}`);
  if (result.date) lines.push(`**Date:** ${result.date}`);
  lines.push(`**Type:** #${result.type}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  if (result.image && result.type === "youtube") {
    lines.push(`![Thumbnail](${result.image})`);
    lines.push("");
  }

  if (result.description) {
    lines.push(`> ${result.description.replace(/\n/g, "\n> ")}`);
    lines.push("");
  }

  if (summary) {
    lines.push("## Summary");
    lines.push("");
    lines.push(summary);
    lines.push("");
  }

  lines.push("---");
  const today = new Date().toISOString().split("T")[0];
  lines.push(`*Ingested on ${today}*`);

  return lines.join("\n");
}

export async function summarizeWithAI(
  text: string,
  provider: { baseURL: string; apiKey: string; model: string }
): Promise<string> {
  const isAnthropic = provider.baseURL.includes("anthropic.com");
  const defaultHeaders: Record<string, string> = {};
  if (isAnthropic) {
    defaultHeaders["anthropic-version"] = "2023-06-01";
  }

  const client = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    defaultHeaders,
  });

  const response = await client.chat.completions.create({
    model: provider.model,
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content:
          "Summarize the following web content in 2-3 concise paragraphs. Focus on the key points and main ideas. Write in plain language.",
      },
      { role: "user", content: text.substring(0, 4000) },
    ],
  });

  return response.choices[0]?.message?.content || "";
}
