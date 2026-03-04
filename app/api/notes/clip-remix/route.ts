import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getStorage } from "@/lib/storage";
import { rememberExchange } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";
import { validateProviderBaseURL } from "@/lib/providers";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

interface ClipRemixRequest {
  clipText: string;
  sourceUrl: string | null;
  provider: {
    baseURL: string;
    apiKey: string;
    model: string;
  };
  sampleNotePaths: string[];
}

function buildSystemPrompt(voiceSamples: string[], sourceUrl: string | null): string {
  let prompt =
    "You are a voice-matching writing assistant for a markdown knowledge base called Noctivault. " +
    "Your job is to take externally clipped text and rewrite it in the user's personal voice.\n\n";

  if (voiceSamples.length > 0) {
    prompt +=
      "## Voice Samples\n\n" +
      "Here are excerpts from the user's own notes. Analyze their writing style carefully — " +
      "pay attention to tone, vocabulary, sentence structure, formatting habits, and personality:\n\n";
    for (let i = 0; i < voiceSamples.length; i++) {
      prompt += `### Sample ${i + 1}\n${voiceSamples[i]}\n\n`;
    }
  } else {
    prompt +=
      "No voice samples are available. Rewrite the content in a clear, conversational tone.\n\n";
  }

  prompt +=
    "## Instructions\n\n" +
    "1. Rewrite the clipped text so it reads as if the user wrote it naturally, not like a rewrite.\n" +
    "2. Preserve the core meaning, key facts, and important details — do not omit information.\n" +
    "3. Match the user's voice: their typical sentence length, level of formality, use of emphasis, " +
    "and formatting patterns from the samples above.\n" +
    "4. Add relevant #tags (lowercase, hyphenated, e.g. #machine-learning, #startup-advice). " +
    "Place tags naturally or at the end.\n" +
    "5. Create a concise, descriptive title.\n" +
    "6. Include a source attribution at the very end of the content.\n" +
    "7. Return ONLY valid JSON with exactly this structure:\n" +
    '   { "title": "string", "content": "markdown string", "tags": ["tag1", "tag2"] }\n' +
    "8. The content should NOT include the title as an H1 heading — the app handles that separately.\n" +
    "9. Do not wrap the JSON in markdown code fences. Return raw JSON only.\n";

  const source = sourceUrl || "clipboard";
  prompt += `\nThe source of the clipped text is: ${source}\n`;
  prompt += `Include this at the bottom of the content: "\\n\\n---\\n*Remixed from: ${source}*"\n`;

  return prompt;
}

export async function POST(req: NextRequest) {
  let body: ClipRemixRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { clipText, sourceUrl, provider, sampleNotePaths = [] } = body;

  if (!clipText || clipText.trim().length < 20) {
    return new Response(
      JSON.stringify({ error: "Clipped text is too short (minimum 20 characters)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!provider?.model) {
    return new Response(
      JSON.stringify({ error: "No model configured" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const isLocal =
    provider.baseURL.includes("localhost") ||
    provider.baseURL.includes("127.0.0.1");
  if (!isLocal && !provider.apiKey) {
    return new Response(
      JSON.stringify({ error: "No API key configured for this provider" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const urlError = validateProviderBaseURL(provider.baseURL);
  if (urlError) {
    return new Response(
      JSON.stringify({ error: urlError }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Read voice samples from note files
  let ctx;
  try { ctx = await getStorageContext(); } catch (e) { if (e instanceof Response) return e; throw e; }
  const rl = await checkRateLimit(getRateLimitKey("clip-remix", ctx.userId, req), RATE_LIMITS.ai);
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);
  const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
  const storage = getStorage(ctx.userId, ctx.cookieHeader);
  const samples: string[] = [];
  for (const notePath of sampleNotePaths.slice(0, 5)) {
    try {
      const content = await storage.readNote(notePath);
      samples.push(content.slice(0, 500));
    } catch {
      // skip unreadable notes
    }
  }

  const isAnthropic = provider.baseURL?.includes("anthropic");
  const defaultHeaders: Record<string, string> = {};
  if (isAnthropic) {
    defaultHeaders["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const client = new OpenAI({
    apiKey: provider.apiKey || "not-needed",
    baseURL: provider.baseURL,
    defaultHeaders,
  });

  const systemPrompt = buildSystemPrompt(samples, sourceUrl);

  try {
    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: provider.model,
      max_tokens: 4096,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: clipText },
      ],
    };

    // Use JSON response format for providers that support it
    const skipJsonFormat =
      isAnthropic ||
      provider.model.includes("deepseek-reasoner") ||
      isLocal;
    if (!skipJsonFormat) {
      requestParams.response_format = { type: "json_object" };
    }

    const completion = await client.chat.completions.create(requestParams);
    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI provider" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response, handling potential markdown fences
    let parsed: { title: string; content: string; tags: string[] };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try extracting JSON from markdown code fences
      const jsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          return new Response(
            JSON.stringify({ error: "Failed to parse structured response from AI" }),
            { status: 502, headers: { "Content-Type": "application/json" } }
          );
        }
      } else {
        // Last resort: try to find JSON object in the response
        const braceMatch = responseText.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try {
            parsed = JSON.parse(braceMatch[0]);
          } catch {
            return new Response(
              JSON.stringify({ error: "Failed to parse structured response from AI" }),
              { status: 502, headers: { "Content-Type": "application/json" } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: "AI response was not valid JSON" }),
            { status: 502, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (!parsed.title || !parsed.content) {
      return new Response(
        JSON.stringify({ error: "AI response missing required title or content fields" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure tags is always an array
    if (!Array.isArray(parsed.tags)) {
      parsed.tags = [];
    }

    // Save to memory (fire-and-forget)
    rememberExchange(
      clipText.slice(0, 300),
      `Remixed content: ${parsed.title}`,
      ctx.userId,
      apiKey ?? undefined
    ).catch(() => {});

    return Response.json(parsed);
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      console.error(
        `[Clip & Remix API] ${err.status} from ${provider.baseURL}:`,
        err.message,
        err.error
      );
      return new Response(
        JSON.stringify({ error: `AI provider error (${err.status})` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error(`[Clip & Remix API] Error:`, err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: "AI request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
