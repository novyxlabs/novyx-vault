import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getStorageContext } from "@/lib/auth";
import { isLocalProviderBaseURL, validateProviderBaseURL } from "@/lib/providers";
import { createSafeProviderFetch, resolveAndValidateHost } from "@/lib/providers.server";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

interface ExplainRequest {
  sourceNote: string;
  sourceSnippet: string;
  targetNote: string;
  targetSnippet: string;
  connectionType: string;
  provider: {
    baseURL: string;
    apiKey: string;
    model: string;
  };
}

export async function POST(req: NextRequest) {
  try {
  const ctx = await getStorageContext();
  const rl = await checkRateLimit(getRateLimitKey("explain", ctx.userId, req), RATE_LIMITS.ai);
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);
  const { sourceNote, sourceSnippet, targetNote, targetSnippet, connectionType, provider } =
    (await req.json()) as ExplainRequest;

  if (!provider?.model) {
    return NextResponse.json({ explanation: "" });
  }

  const isLocal = isLocalProviderBaseURL(provider.baseURL);
  if (!isLocal && !provider.apiKey) {
    return NextResponse.json({ explanation: "" });
  }

  const urlError = validateProviderBaseURL(provider.baseURL);
  if (urlError) {
    return NextResponse.json({ explanation: "" });
  }

  const dnsError = await resolveAndValidateHost(provider.baseURL);
  if (dnsError) {
    return NextResponse.json({ explanation: "" });
  }

  const isAnthropic = provider.baseURL.includes("anthropic.com");
  const defaultHeaders: Record<string, string> = {};
  if (isAnthropic) {
    defaultHeaders["anthropic-version"] = "2023-06-01";
  }

  const client = new OpenAI({
    apiKey: provider.apiKey || "not-needed",
    baseURL: provider.baseURL,
    defaultHeaders,
    fetch: createSafeProviderFetch(),
  });

  try {
    const response = await client.chat.completions.create({
      model: provider.model,
      max_tokens: 80,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You explain connections between notes in exactly one concise sentence (under 15 words). No preamble, no quotes, just the sentence.",
        },
        {
          role: "user",
          content: `Why are these two notes connected (${connectionType} match)?

Note A: "${sourceNote}"
${sourceSnippet}

Note B: "${targetNote}"
${targetSnippet}`,
        },
      ],
    });

    const explanation = response.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({ explanation });
  } catch (err) {
    console.error("Explain connection error:", err);
    return NextResponse.json({ explanation: "" });
  }
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ explanation: "" });
  }
}
