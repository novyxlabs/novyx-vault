import { NextRequest, NextResponse } from "next/server";
import { fetchUrlMetadata, formatAsMarkdown, summarizeWithAI } from "@/lib/ingest";

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
    if (summarize && provider?.apiKey && provider?.model) {
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
}
