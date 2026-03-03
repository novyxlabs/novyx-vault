import { NextRequest } from "next/server";
import OpenAI from "openai";

interface SlashAIRequest {
  command: string;
  context: string;
  noteTitle: string;
  provider: {
    baseURL: string;
    apiKey: string;
    model: string;
  };
}

const COMMAND_PROMPTS: Record<string, string> = {
  expand:
    "You are a writing assistant. Expand and flesh out the following text into more detail. " +
    "Add depth, examples, and elaboration while maintaining the original voice and tone. " +
    "Output ONLY the expanded text — no preamble, no meta-commentary, no markdown code fences wrapping it. " +
    "Preserve the existing markdown formatting and extend it naturally.",

  summarize:
    "You are a writing assistant. Condense the following text into a concise summary. " +
    "Capture the key points and essential information. " +
    "Output ONLY the summary — no preamble, no labels like 'Summary:'. " +
    "Use clean markdown formatting.",

  brainstorm:
    "You are a creative thinking partner. Generate 3-5 ideas related to the following text. " +
    "Present them as a markdown bullet list. Each idea should be a distinct, actionable suggestion. " +
    "Output ONLY the bullet list — no preamble, no heading.",

  continue:
    "You are a writing assistant. Continue writing from where the text below ends. " +
    "Match the user's voice, tone, and writing style precisely. " +
    "Continue the thought naturally as if the user kept writing. " +
    "Output ONLY the continuation — no preamble. Do not repeat any of the existing text.",

  rewrite:
    "You are a writing assistant. Rewrite and polish the following text to improve clarity, flow, and impact. " +
    "Preserve the original meaning and the user's voice. " +
    "Output ONLY the rewritten text — no preamble, no meta-commentary.",

  fix:
    "You are a proofreading assistant. Fix all grammar, spelling, and punctuation errors in the following text. " +
    "Do not change the meaning, tone, or style. Make only necessary corrections. " +
    "Output ONLY the corrected text — no preamble, no explanation of changes.",
};

const VALID_COMMANDS = Object.keys(COMMAND_PROMPTS);

export async function POST(req: NextRequest) {
  const { command, context, noteTitle, provider } = (await req.json()) as SlashAIRequest;

  if (!command || !VALID_COMMANDS.includes(command)) {
    return new Response(
      JSON.stringify({ error: `Invalid command: ${command}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!context || context.trim().length < 5) {
    return new Response(
      JSON.stringify({ error: "Not enough context to work with" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!provider?.model) {
    return new Response(
      JSON.stringify({ error: "No model configured" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const isLocal = provider.baseURL.includes("localhost") || provider.baseURL.includes("127.0.0.1");
  if (!isLocal && !provider.apiKey) {
    return new Response(
      JSON.stringify({ error: "No API key configured" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
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
  });

  const systemPrompt =
    COMMAND_PROMPTS[command] +
    (noteTitle ? `\n\nThe user is working on a note titled: "${noteTitle}".` : "");

  try {
    const stream = await client.chat.completions.create({
      model: provider.model,
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ],
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let inThinkBlock = false;
          let buffer = "";

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (!delta) continue;

            // Filter out <think>...</think> blocks (DeepSeek, MiniMax, etc.)
            buffer += delta;
            while (buffer.length > 0) {
              if (inThinkBlock) {
                const closeIdx = buffer.indexOf("</think>");
                if (closeIdx === -1) {
                  buffer = "";
                  break;
                }
                buffer = buffer.substring(closeIdx + 8);
                inThinkBlock = false;
              } else {
                const openIdx = buffer.indexOf("<think>");
                if (openIdx === -1) {
                  const partialIdx = buffer.lastIndexOf("<");
                  if (partialIdx !== -1 && buffer.substring(partialIdx).length < 7) {
                    const safe = buffer.substring(0, partialIdx);
                    if (safe) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text: safe })}\n\n`)
                      );
                    }
                    buffer = buffer.substring(partialIdx);
                  } else {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: buffer })}\n\n`)
                    );
                    buffer = "";
                  }
                  break;
                } else {
                  if (openIdx > 0) {
                    const before = buffer.substring(0, openIdx);
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
          // Flush remaining buffer
          if (buffer && !inThinkBlock) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: buffer })}\n\n`)
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
    const message = err instanceof Error ? err.message : "AI request failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
