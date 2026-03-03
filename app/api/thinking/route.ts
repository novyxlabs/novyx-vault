import { NextRequest } from "next/server";
import {
  listMemories,
  getReplayTimeline,
  getMemoryDrift,
} from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const nk = apiKey ?? undefined;
    const { searchParams } = req.nextUrl;
    const topic = searchParams.get("topic");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!topic || !topic.trim()) {
      return Response.json(
        { error: "Missing topic query parameter" },
        { status: 400 }
      );
    }

    const now = new Date();
    const from = new Date(now.getTime() - days * 86400000);
    const toISO = now.toISOString();
    const fromISO = from.toISOString();

    const [memoriesResult, timelineResult, driftResult] = await Promise.all([
      listMemories(topic.trim(), 50, 0, ctx.userId, nk),
      getReplayTimeline(100, nk),
      getMemoryDrift(fromISO, toISO, nk),
    ]);

    // Filter memories to those within the requested timeframe
    // and with a meaningful relevance score (skip low-relevance noise)
    const filtered = memoriesResult.memories.filter((m) => {
      const created = new Date(m.created_at).getTime();
      const inTimeframe = created >= from.getTime() && created <= now.getTime();
      const hasRelevance = m.score === undefined || m.score >= 0.3;
      return inTimeframe && hasRelevance;
    });

    // Sort by date ascending for timeline display
    filtered.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return Response.json({
      topic: topic.trim(),
      timeframe: { from: fromISO, to: toISO },
      memories: filtered.map((m) => ({
        observation: m.observation,
        importance: m.importance,
        created_at: m.created_at,
        tags: m.tags,
        score: m.score,
      })),
      drift: driftResult
        ? {
            newTopics: driftResult.topNewTopics,
            lostTopics: driftResult.topLostTopics,
            memoryDelta: driftResult.memoryCountDelta,
            importanceDelta: driftResult.avgImportanceDelta,
            tagShifts: driftResult.tagShifts,
          }
        : null,
      timeline: timelineResult.entries.map((e) => ({
        timestamp: e.timestamp,
        operation: e.operation,
        preview: e.observation_preview || null,
        importance: e.importance ?? null,
      })),
      totalMemories: memoriesResult.total,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json(
      { error: "Failed to fetch thinking evolution data" },
      { status: 500 }
    );
  }
}
