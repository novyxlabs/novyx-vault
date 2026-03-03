import { NextRequest, NextResponse } from "next/server";
import {
  getCortexInsights,
  getMemoryDrift,
  listMemories,
} from "@/lib/memory";
import { getStorage } from "@/lib/storage";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";
import OpenAI from "openai";

const TASK_REGEX = /^(\s*)-\s*\[([ xX])\]\s+(.+)$/;
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

export async function GET() {
  try {
  const ctx = await getStorageContext();
  const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
  const nk = apiKey ?? undefined;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekAgoISO = weekAgo.toISOString();
  const nowISO = now.toISOString();

  // Fetch all data in parallel
  const storage = getStorage(ctx.userId, ctx.cookieHeader);
  const [rawNotes, insights, drift, memData] = await Promise.all([
    storage.walkAllNotes(),
    getCortexInsights(5, nk),
    getMemoryDrift(weekAgoISO, nowISO, nk),
    listMemories(undefined, 10, 0, ctx.userId, nk),
  ]);

  // Add wordCount to notes
  const allNotes = rawNotes.map((n) => {
    const trimmed = n.content.trim();
    return { ...n, wordCount: trimmed ? trimmed.split(/\s+/).length : 0 };
  });

  // Notes modified this week
  const modifiedThisWeek = allNotes.filter(
    (n) => n.modifiedAt >= weekAgo
  );

  // Sort by most recently modified
  modifiedThisWeek.sort(
    (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()
  );

  // Word count for modified notes
  const weekWords = modifiedThisWeek.reduce((sum, n) => sum + n.wordCount, 0);
  const totalWords = allNotes.reduce((sum, n) => sum + n.wordCount, 0);

  // Tags from modified notes
  const weekTags = new Map<string, number>();
  for (const note of modifiedThisWeek) {
    const tagMatches = note.content.match(/#[a-zA-Z][\w-]*/g);
    if (tagMatches) {
      for (const tag of tagMatches) {
        const t = tag.slice(1);
        weekTags.set(t, (weekTags.get(t) || 0) + 1);
      }
    }
  }
  const topWeekTags = [...weekTags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  // Pending tasks across entire vault
  let pendingCount = 0;
  let completedThisWeek = 0;
  const sampleTasks: { text: string; note: string }[] = [];
  for (const note of allNotes) {
    const lines = note.content.split("\n");
    for (const line of lines) {
      const match = line.match(TASK_REGEX);
      if (match) {
        if (match[2] === " ") {
          pendingCount++;
          if (sampleTasks.length < 5) {
            sampleTasks.push({ text: match[3].trim(), note: note.relPath });
          }
        } else if (note.modifiedAt >= weekAgo) {
          completedThisWeek++;
        }
      }
    }
  }

  // Links created this week (new connections)
  let newLinksThisWeek = 0;
  for (const note of modifiedThisWeek) {
    WIKILINK_RE.lastIndex = 0;
    let match;
    while ((match = WIKILINK_RE.exec(note.content)) !== null) {
      newLinksThisWeek++;
    }
  }

  return NextResponse.json({
    period: {
      from: weekAgoISO,
      to: nowISO,
    },
    vault: {
      totalNotes: allNotes.length,
      totalWords,
      notesModified: modifiedThisWeek.length,
      wordsInModified: weekWords,
    },
    activity: {
      recentNotes: modifiedThisWeek.slice(0, 10).map((n) => ({
        name: n.name,
        path: n.relPath,
        wordCount: n.wordCount,
        modifiedAt: n.modifiedAt.toISOString(),
      })),
      topTags: topWeekTags,
      linksInModified: newLinksThisWeek,
    },
    tasks: {
      pending: pendingCount,
      completedThisWeek,
      sample: sampleTasks,
    },
    memory: {
      totalMemories: memData.total,
      insights: (insights.insights || []).slice(0, 5).map((i) => ({
        observation: i.observation,
        tags: i.tags,
        importance: i.importance,
      })),
      drift: drift
        ? {
            memoryDelta: drift.memoryCountDelta,
            importanceDelta: drift.avgImportanceDelta,
            newTopics: drift.topNewTopics.slice(0, 5),
            lostTopics: drift.topLostTopics.slice(0, 3),
            tagShifts: drift.tagShifts.slice(0, 5),
          }
        : null,
    },
  });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Generate AI-written weekly digest
export async function POST(req: NextRequest) {
  const { reviewData, provider } = await req.json();

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
    `You are a thoughtful writing assistant creating a weekly review for a personal knowledge base. ` +
    `Analyze the data and write a concise, encouraging weekly summary. ` +
    `Use markdown formatting. Include sections: Highlights, Patterns & Themes, and Suggestions. ` +
    `Keep it to 200-300 words. Be specific — reference actual note names and tags from the data. ` +
    `Output ONLY the review — no preamble or meta-commentary.`;

  const userContent = JSON.stringify(reviewData, null, 2);

  try {
    const stream = await client.chat.completions.create({
      model: provider.model,
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is my vault activity for the past week:\n\n${userContent}` },
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
