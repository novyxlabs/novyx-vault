import { NextRequest } from "next/server";
import OpenAI from "openai";
import { searchNotes } from "@/lib/search";
import { readNote, listNotes, type StorageContext } from "@/lib/notes";
import type { NoteEntry } from "@/lib/notes";
import { recallMemories, rememberExchange } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";
import { validateProviderBaseURL } from "@/lib/providers";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  noteContext?: { path: string; content: string };
  provider: {
    baseURL: string;
    apiKey: string;
    model: string;
  };
}

interface NoteSnippet {
  name: string;
  path: string;
  excerpt: string;
}

const STOP_WORDS = new Set([
  "i", "me", "my", "the", "a", "an", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "can",
  "what", "which", "who", "whom", "this", "that", "these", "those",
  "am", "it", "its", "of", "in", "on", "at", "to", "for", "with",
  "about", "from", "up", "out", "how", "all", "each", "every",
  "both", "few", "more", "most", "other", "some", "such", "no",
  "not", "only", "same", "so", "than", "too", "very", "just",
  "because", "as", "until", "while", "there", "here", "when",
  "where", "why", "again", "further", "then", "once", "any",
  "tell", "know", "think", "find", "get", "make", "go", "see",
  "look", "also", "and", "but", "or", "if",
]);

function extractSearchTerms(message: string): string[] {
  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return [...new Set(words)];
}

function flattenNoteNames(entries: NoteEntry[]): string[] {
  const names: string[] = [];
  for (const entry of entries) {
    if (entry.isFolder && entry.children) {
      names.push(...flattenNoteNames(entry.children));
    } else if (!entry.isFolder) {
      names.push(entry.name);
    }
  }
  return names;
}

async function gatherRelatedNotes(
  userMessage: string,
  currentNotePath?: string,
  ctx?: StorageContext
): Promise<NoteSnippet[]> {
  const terms = extractSearchTerms(userMessage);
  if (terms.length === 0) return [];

  const seenPaths = new Set<string>();
  const allResults: Array<{ path: string; name: string; hitCount: number }> = [];

  for (const term of terms.slice(0, 5)) {
    try {
      const results = await searchNotes(term, 5, undefined, ctx);
      for (const result of results) {
        if (currentNotePath && result.path === currentNotePath) continue;
        if (seenPaths.has(result.path)) {
          const existing = allResults.find((r) => r.path === result.path);
          if (existing) existing.hitCount++;
          continue;
        }
        seenPaths.add(result.path);
        allResults.push({ path: result.path, name: result.name, hitCount: 1 });
      }
    } catch {
      // skip search errors
    }
  }

  allResults.sort((a, b) => b.hitCount - a.hitCount);
  const topResults = allResults.slice(0, 3);

  const snippets: NoteSnippet[] = [];
  for (const result of topResults) {
    try {
      const content = await readNote(result.path, ctx);
      const excerpt = content.substring(0, 500) + (content.length > 500 ? "..." : "");
      snippets.push({ path: result.path, name: result.name, excerpt });
    } catch {
      // skip unreadable notes
    }
  }

  return snippets;
}

function buildSystemPrompt(
  noteContext?: { path: string; content: string },
  relatedNotes?: NoteSnippet[],
  allNoteNames?: string[],
  memories?: string[]
): string {
  let prompt =
    "You are a helpful AI assistant integrated into a markdown note-taking app called Novyx Vault. " +
    "Help the user understand, summarize, and connect their notes. Respond in markdown format. " +
    "You can reference other notes using [[note name]] wiki-link syntax. " +
    "The user can insert your responses directly into their notes or create new notes from them, so format your responses as clean, useful markdown content when appropriate.";

  if (noteContext?.content) {
    prompt += `\n\nThe user currently has this note open:\n\nFile: ${noteContext.path}\n\n---\n${noteContext.content}\n---`;
  }

  if (relatedNotes && relatedNotes.length > 0) {
    prompt += "\n\n## Related notes from the knowledge base\n\n";
    prompt += "These notes may be relevant. Reference them using [[note name]] if appropriate.\n\n";
    for (const note of relatedNotes) {
      prompt += `### [[${note.name}]] (${note.path})\n${note.excerpt}\n\n`;
    }
  }

  if (memories && memories.length > 0) {
    prompt += "\n\n## Memories from past conversations\n\n";
    prompt += "These are relevant memories from previous interactions with this user:\n";
    for (const memory of memories) {
      prompt += `- ${memory}\n`;
    }
  }

  if (allNoteNames && allNoteNames.length > 0 && allNoteNames.length <= 200) {
    prompt += `\n\nAll notes in the knowledge base: ${allNoteNames.join(", ")}`;
  }

  return prompt;
}

export async function POST(req: NextRequest) {
  try {
  const ctx = await getStorageContext();
  const rl = await checkRateLimit(getRateLimitKey("chat", ctx.userId, req), RATE_LIMITS.ai);
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);
  const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
  const { messages, noteContext, provider } = (await req.json()) as ChatRequest;

  if (!provider?.model) {
    return new Response(
      JSON.stringify({ error: "No model configured" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Local providers (Ollama, LM Studio) don't require API keys
  const isLocal = provider.baseURL.includes("localhost") || provider.baseURL.includes("127.0.0.1");
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

  // Gather context: related notes + memories + full note index
  const latestUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const [relatedNotes, memories, noteTree] = await Promise.all([
    gatherRelatedNotes(latestUserMessage, noteContext?.path, ctx),
    recallMemories(latestUserMessage, ctx.userId, apiKey ?? undefined),
    listNotes(undefined, ctx),
  ]);
  const allNoteNames = flattenNoteNames(noteTree);

  const systemPrompt = buildSystemPrompt(noteContext, relatedNotes, allNoteNames, memories);

  // Determine if this is Anthropic (needs special headers)
  const isAnthropic = provider.baseURL.includes("anthropic.com");
  const defaultHeaders: Record<string, string> = {};
  if (isAnthropic) {
    defaultHeaders["anthropic-version"] = "2023-06-01";
  }

  const client = new OpenAI({
    apiKey: provider.apiKey || "not-needed",
    baseURL: provider.baseURL,
    defaultHeaders,
  });

  try {
    const stream = await client.chat.completions.create({
      model: provider.model,
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Emit memory recall metadata
          if (memories.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ meta: { memoriesRecalled: memories.length } })}\n\n`)
            );
          }

          let inThinkBlock = false;
          let buffer = "";
          let fullResponse = "";

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (!delta) continue;

            // Filter out <think>...</think> blocks (used by MiniMax, DeepSeek, etc.)
            buffer += delta;
            while (buffer.length > 0) {
              if (inThinkBlock) {
                const closeIdx = buffer.indexOf("</think>");
                if (closeIdx === -1) {
                  buffer = ""; // still inside think block, discard
                  break;
                }
                buffer = buffer.substring(closeIdx + 8);
                inThinkBlock = false;
              } else {
                const openIdx = buffer.indexOf("<think>");
                if (openIdx === -1) {
                  // No think tag — check for partial tag at the end
                  const partialIdx = buffer.lastIndexOf("<");
                  if (partialIdx !== -1 && buffer.substring(partialIdx).length < 7) {
                    // Could be start of <think>, hold it
                    const safe = buffer.substring(0, partialIdx);
                    if (safe) {
                      fullResponse += safe;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text: safe })}\n\n`)
                      );
                    }
                    buffer = buffer.substring(partialIdx);
                  } else {
                    fullResponse += buffer;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: buffer })}\n\n`)
                    );
                    buffer = "";
                  }
                  break;
                } else {
                  // Send text before <think>
                  if (openIdx > 0) {
                    const before = buffer.substring(0, openIdx);
                    fullResponse += before;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: before })}\n\n`)
                    );
                  }
                  buffer = buffer.substring(openIdx + 7);
                  inThinkBlock = true;
                }
              }
            }
          }
          // Flush any remaining buffer
          if (buffer && !inThinkBlock) {
            fullResponse += buffer;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: buffer })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          // Store user message in memory with AI response as context (fire-and-forget)
          rememberExchange(latestUserMessage, fullResponse, ctx.userId, apiKey ?? undefined).catch(() => {});
        } catch (err) {
          const message = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      console.error(`[Chat API] ${err.status} from ${provider.baseURL}:`, err.message, err.error);
      return new Response(
        JSON.stringify({ error: `AI provider error (${err.status})` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error(`[Chat API] Error:`, err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: "AI request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
