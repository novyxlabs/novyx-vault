import { NextRequest, NextResponse } from "next/server";
import { fetchUrlMetadata, formatAsMarkdown, summarizeWithAI } from "@/lib/ingest";
import { getStorageContext } from "@/lib/auth";
import { validateProviderBaseURL } from "@/lib/providers";
import { resolveAndValidateHost } from "@/lib/providers.server";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

interface IngestRequest {
  url: string;
  summarize?: boolean;
  provider?: {
    baseURL: string;
    apiKey: string;
    model: string;
  };
}

export async function POST(req: NextRequest) {
  try {
  const ctx = await getStorageContext();
  const rl = await checkRateLimit(getRateLimitKey("ingest", ctx.userId, req), RATE_LIMITS.ai);
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);
  const body = (await req.json()) as IngestRequest;
  const { url, summarize, provider } = body;

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const result = await fetchUrlMetadata(url);

    let summary: string | undefined;
    if (summarize && provider?.apiKey && provider?.model && !validateProviderBaseURL(provider.baseURL) && !(await resolveAndValidateHost(provider.baseURL))) {
      const textToSummarize = result.articleText || result.description || "";
      if (textToSummarize.length > 50) {
        try {
          summary = await summarizeWithAI(textToSummarize, provider);
        } catch (err) {
          console.error("[Ingest] AI summary failed:", err);
          summary = "*AI summary unavailable*";
        }
      }
    }

    const markdown = formatAsMarkdown(result, summary);

    return NextResponse.json({
      title: result.title,
      markdown,
      metadata: {
        type: result.type,
        author: result.author,
        date: result.date,
        description: result.description,
        image: result.image,
        siteName: result.siteName,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch URL";
    console.error("[Ingest] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
