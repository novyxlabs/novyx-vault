import { NextRequest } from "next/server";
import OpenAI from "openai";
import { rememberExchange } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { isLocalProviderBaseURL, validateProviderBaseURL } from "@/lib/providers";
import { createSafeProviderFetch, resolveAndValidateHost } from "@/lib/providers.server";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { getUserNovyxKey } from "@/lib/novyx";

interface BrainDumpRequest {
  rawText: string;
  provider: {
    baseURL: string;
    apiKey: string;
    model: string;
  };
  existingNotes: string[];
}

function buildSystemPrompt(existingNotes: string[]): string {
  let prompt =
    "You are a note-structuring assistant for a markdown knowledge base called Novyx Vault. " +
    "Your job is to take a raw, unstructured brain dump and transform it into a well-organized markdown note.\n\n" +
    "Instructions:\n" +
    "1. Analyze the raw brain dump carefully.\n" +
    "2. Create a concise but descriptive title that captures the core topic. Do NOT include 'Brain Dump' in the title.\n" +
    "3. Organize the content into logical sections using ## headings.\n" +
    "4. Extract key concepts as #tags (lowercase, hyphenated, e.g. #machine-learning, #project-idea). " +
    "Place tags naturally within the text or in a tags section at the end.\n" +
    "5. Keep the user's voice and tone — do not over-formalize or sanitize their ideas. " +
    "Restructure for clarity, but preserve their personality and phrasing.\n" +
    "6. Use clean markdown formatting: bullet points, bold for emphasis, code blocks if relevant.\n" +
    "7. Return ONLY valid JSON with exactly this structure: { \"title\": \"string\", \"content\": \"markdown string\" }\n" +
    "8. The content should NOT include the title as an H1 heading — the app handles that separately.\n" +
    "9. Do not wrap the JSON in markdown code fences. Return raw JSON only.";

  if (existingNotes.length > 0) {
    const noteList = existingNotes.slice(0, 200).join(", ");
    prompt +=
      "\n\n" +
      "The user's knowledge base contains these existing notes: " +
      noteList +
      "\n\n" +
      "If any concepts in the brain dump relate to these existing notes, suggest wiki-links " +
      "using the [[Note Name]] syntax. ONLY link to notes from this list — never invent note names. " +
      "Use wiki-links naturally within sentences where the connection makes sense.";
  }

  return prompt;
}

export async function POST(req: NextRequest) {
  let ctx;
  try { ctx = await getStorageContext(); } catch (e) { if (e instanceof Response) return e; throw e; }
  const rl = await checkRateLimit(getRateLimitKey("brain-dump", ctx.userId, req), RATE_LIMITS.ai);
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);
  const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);

  let body: BrainDumpRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { rawText, provider, existingNotes = [] } = body;

  if (!rawText || rawText.trim().length < 10) {
    return new Response(
      JSON.stringify({ error: "Brain dump text is too short" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!provider?.model) {
    return new Response(
      JSON.stringify({ error: "No model configured" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const isLocal = isLocalProviderBaseURL(provider.baseURL);
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

  const dnsError = await resolveAndValidateHost(provider.baseURL);
  if (dnsError) {
    return new Response(
      JSON.stringify({ error: dnsError }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
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
    fetch: createSafeProviderFetch(),
  });

  const systemPrompt = buildSystemPrompt(existingNotes);

  try {
    // Build the request parameters
    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: provider.model,
      max_tokens: 4096,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText },
      ],
    };

    // Use JSON response format for providers that support it
    // Anthropic via OpenAI SDK, some local models, and DeepSeek reasoner don't support it
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

    // Parse the JSON from the response, handling potential markdown fences
    let parsed: { title: string; content: string };
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
            JSON.stringify({
              error: "Failed to parse structured response from AI",
            }),
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
              JSON.stringify({
                error: "Failed to parse structured response from AI",
              }),
              { status: 502, headers: { "Content-Type": "application/json" } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              error: "AI response was not valid JSON",
            }),
            { status: 502, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (!parsed.title || !parsed.content) {
      return new Response(
        JSON.stringify({
          error: "AI response missing required title or content fields",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save a memory of this brain dump (fire-and-forget)
    rememberExchange(rawText.slice(0, 500), parsed.title, ctx.userId, apiKey ?? undefined).catch(() => {});

    return Response.json(parsed);
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      console.error(
        `[Brain Dump API] ${err.status} from ${provider.baseURL}:`,
        err.message,
        err.error
      );
      return new Response(
        JSON.stringify({ error: `AI provider error (${err.status})` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error(`[Brain Dump API] Error:`, err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: "AI request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
