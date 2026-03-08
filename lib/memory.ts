import { Novyx } from "novyx";
import { getNovyxForKey } from "./novyx";

/** Resolve a Novyx client from an explicit apiKey or fall back to env var */
function resolveClient(apiKey?: string): Novyx | null {
  if (apiKey) return getNovyxForKey(apiKey);
  // Desktop fallback
  const envKey = process.env.NOVYX_MEMORY_API_KEY;
  return envKey ? getNovyxForKey(envKey) : null;
}

/** Build the user-scoping tag for multi-user memory isolation */
function userTag(userId?: string): string[] {
  return userId ? [`user:${userId}`] : [];
}

/** Merge user tag with any additional tags */
function withUserTag(userId?: string, extraTags?: string[]): string[] {
  const tags = userTag(userId);
  if (extraTags) tags.push(...extraTags);
  return tags;
}

export async function recallMemories(query: string, userId?: string, apiKey?: string): Promise<string[]> {
  const nx = resolveClient(apiKey);
  if (!nx) return [];
  try {
    const tags = userTag(userId);
    const results = await nx.recall(query, tags.length > 0 ? { tags } : undefined);
    return results.memories.map((m) => m.observation);
  } catch (e) {
    console.warn("[novyx] recallMemories failed:", e);
    return [];
  }
}

export async function rememberExchange(
  userMessage: string,
  aiResponse?: string,
  userId?: string,
  apiKey?: string
): Promise<void> {
  const nx = resolveClient(apiKey);
  if (!nx) return;
  try {
    const tags = userTag(userId);
    await nx.remember(userMessage, {
      auto_link: true,
      context: aiResponse ? aiResponse.slice(0, 1000) : undefined,
      ...(tags.length > 0 && { tags }),
    });
  } catch (e) {
    console.warn("[novyx] rememberExchange failed:", e);
  }
}

export interface MemoryItem {
  uuid: string;
  observation: string;
  tags: string[];
  importance: number;
  confidence: number;
  created_at: string;
  score?: number;
}

export async function listMemories(
  query?: string,
  limit = 50,
  offset = 0,
  userId?: string,
  apiKey?: string
): Promise<{ memories: MemoryItem[]; total: number }> {
  const nx = resolveClient(apiKey);
  if (!nx) return { memories: [], total: 0 };
  try {
    const tags = userTag(userId);
    if (query && query.trim()) {
      const results = await nx.recall(query, { limit, ...(tags.length > 0 && { tags }) });
      return {
        memories: results.memories.map((m) => ({
          uuid: m.uuid,
          observation: m.observation,
          tags: m.tags,
          importance: m.importance,
          confidence: m.confidence,
          created_at: m.created_at,
          score: m.score,
        })),
        total: results.total_results,
      };
    }
    const results = await nx.list({ limit, offset, ...(tags.length > 0 && { tags }) });
    return {
      memories: results.memories.map((m) => ({
        uuid: m.uuid,
        observation: m.observation,
        tags: m.tags,
        importance: m.importance,
        confidence: m.confidence,
        created_at: m.created_at,
      })),
      total: results.total_count,
    };
  } catch (e) {
    console.warn("[novyx] listMemories failed:", e);
    return { memories: [], total: 0 };
  }
}

export async function forgetMemory(id: string, apiKey?: string): Promise<boolean> {
  const nx = resolveClient(apiKey);
  if (!nx) return false;
  try {
    return await nx.forget(id);
  } catch (e) {
    console.warn("[novyx] forgetMemory failed:", e);
    return false;
  }
}

export interface InsightItem {
  uuid: string;
  observation: string;
  tags: string[];
  importance: number;
  created_at: string;
}

export async function getCortexInsights(
  limit = 20,
  apiKey?: string
): Promise<{ insights: InsightItem[]; total: number }> {
  const nx = resolveClient(apiKey);
  if (!nx) return { insights: [], total: 0 };
  try {
    const results = await nx.cortexInsights({ limit });
    return {
      insights: results.insights.map((i) => ({
        uuid: i.uuid,
        observation: i.observation,
        tags: i.tags,
        importance: i.importance,
        created_at: i.created_at,
      })),
      total: results.total,
    };
  } catch (e) {
    console.warn("[novyx] getCortexInsights failed:", e);
    return { insights: [], total: 0 };
  }
}

export async function runCortex(apiKey?: string): Promise<{
  consolidated: number;
  boosted: number;
  decayed: number;
  insights_generated: number;
} | null> {
  const nx = resolveClient(apiKey);
  if (!nx) return null;
  try {
    return await nx.cortexRun();
  } catch (e) {
    console.warn("[novyx] runCortex failed:", e);
    return null;
  }
}

export interface ContextNow {
  recent: MemoryItem[];
  recentCount: number;
  upcoming: MemoryItem[];
  upcomingCount: number;
  lastSessionAt: string | null;
}

export interface KGNode {
  id: string;
  name: string;
  type?: string;
  tripleCount: number;
}

export interface KGEdge {
  source: string;
  target: string;
  predicate: string;
  confidence: number;
}

export async function getKnowledgeGraph(apiKey?: string): Promise<{
  nodes: KGNode[];
  edges: KGEdge[];
}> {
  const nx = resolveClient(apiKey);
  if (!nx) return { nodes: [], edges: [] };
  try {
    const [entityResult, tripleResult] = await Promise.all([
      nx.entities({ limit: 200 }),
      nx.triples({ limit: 500 }),
    ]);

    const nodes: KGNode[] = entityResult.entities.map((e) => ({
      id: e.entity_id,
      name: e.name,
      type: e.entity_type,
      tripleCount: e.triple_count,
    }));

    const edges: KGEdge[] = tripleResult.triples.map((t) => ({
      source: t.subject.entity_id,
      target: t.object.entity_id,
      predicate: t.predicate,
      confidence: t.confidence,
    }));

    return { nodes, edges };
  } catch (e) {
    console.warn("[novyx] getKnowledgeGraph failed:", e);
    return { nodes: [], edges: [] };
  }
}

export interface ReplayTimelineEntry {
  timestamp: string;
  operation: string;
  memory_id?: string;
  observation_preview?: string;
  importance?: number;
}

export async function getReplayTimeline(
  limit = 100,
  apiKey?: string
): Promise<{ entries: ReplayTimelineEntry[]; total: number }> {
  const nx = resolveClient(apiKey);
  if (!nx) return { entries: [], total: 0 };
  try {
    const result = await nx.replayTimeline({ limit });
    return {
      entries: result.entries.map((e) => ({
        timestamp: e.timestamp,
        operation: e.operation,
        memory_id: e.memory_id,
        observation_preview: e.observation_preview,
        importance: e.importance,
      })),
      total: result.total_count,
    };
  } catch (e) {
    console.warn("[novyx] getReplayTimeline failed:", e);
    return { entries: [], total: 0 };
  }
}

export interface DriftAnalysis {
  memoryCountFrom: number;
  memoryCountTo: number;
  memoryCountDelta: number;
  avgImportanceFrom: number;
  avgImportanceTo: number;
  avgImportanceDelta: number;
  tagShifts: { tag: string; countFrom: number; countTo: number; delta: number }[];
  topNewTopics: string[];
  topLostTopics: string[];
}

export async function getMemoryDrift(
  from: string,
  to: string,
  apiKey?: string
): Promise<DriftAnalysis | null> {
  const nx = resolveClient(apiKey);
  if (!nx) return null;
  try {
    const result = await nx.replayDrift(from, to);
    return {
      memoryCountFrom: result.memory_count_from,
      memoryCountTo: result.memory_count_to,
      memoryCountDelta: result.memory_count_delta,
      avgImportanceFrom: result.avg_importance_from,
      avgImportanceTo: result.avg_importance_to,
      avgImportanceDelta: result.avg_importance_delta,
      tagShifts: result.tag_shifts.map((s) => ({
        tag: s.tag,
        countFrom: s.count_from,
        countTo: s.count_to,
        delta: s.delta,
      })),
      topNewTopics: result.top_new_topics,
      topLostTopics: result.top_lost_topics,
    };
  } catch (e) {
    console.warn("[novyx] getMemoryDrift failed:", e);
    return null;
  }
}

export interface AuditEntry {
  timestamp: string;
  operation: string;
  artifact_id?: string;
  details?: Record<string, unknown>;
}

export async function getAuditLog(
  limit = 50,
  apiKey?: string
): Promise<AuditEntry[]> {
  const nx = resolveClient(apiKey);
  if (!nx) return [];
  try {
    const entries = await nx.audit({ limit });
    if (entries.length > 0) {
      console.log("[novyx] audit entry sample keys:", Object.keys(entries[0]));
      console.log("[novyx] audit entry sample:", JSON.stringify(entries[0]).slice(0, 500));
    }
    return entries.map((e) => ({
      timestamp: (e.timestamp ?? e.created_at ?? e.time) as string,
      operation: (e.operation ?? e.action ?? e.event ?? e.type ?? e.op) as string,
      artifact_id: (e.artifact_id ?? e.memory_id ?? e.id) as string | undefined,
      details: e,
    }));
  } catch (e) {
    console.warn("[novyx] getAuditLog failed:", e);
    return [];
  }
}

export async function getMemoryUsage(apiKey?: string): Promise<Record<string, unknown> | null> {
  const nx = resolveClient(apiKey);
  if (!nx) return null;
  try {
    return await nx.usage();
  } catch (e) {
    console.warn("[novyx] getMemoryUsage failed:", e);
    return null;
  }
}

export async function getContextNow(apiKey?: string): Promise<ContextNow | null> {
  const nx = resolveClient(apiKey);
  if (!nx) return null;
  try {
    const result = await nx.contextNow();
    const mapMem = (m: { uuid: string; observation: string; tags: string[]; importance: number; confidence: number; created_at: string }) => ({
      uuid: m.uuid,
      observation: m.observation,
      tags: m.tags,
      importance: m.importance,
      confidence: m.confidence,
      created_at: m.created_at,
    });
    return {
      recent: result.recent_memories.map(mapMem),
      recentCount: result.recent_count,
      upcoming: result.upcoming.map(mapMem),
      upcomingCount: result.upcoming_count,
      lastSessionAt: result.last_session_at || null,
    };
  } catch (e) {
    console.warn("[novyx] getContextNow failed:", e);
    return null;
  }
}
