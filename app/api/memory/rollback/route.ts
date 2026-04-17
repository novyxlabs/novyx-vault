import { NextRequest } from "next/server";
import { getStorageContext, isCloudMode } from "@/lib/auth";
import { getUserNovyxKey, getNovyxForKey, requireFeature } from "@/lib/novyx";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const RELATIVE_TARGET_RE = /^(\d+)\s+(second|minute|hour|day|week|month)s?\s+ago$/i;
const INVALID_TARGET_MESSAGE =
  'Invalid rollback target. Expected ISO 8601 timestamp (e.g. 2026-04-15T12:00:00Z) or relative string (e.g. "2 hours ago").';

function isValidRollbackTarget(target: unknown): target is string {
  if (typeof target !== "string") return false;
  const trimmed = target.trim();
  if (trimmed === "") return false;
  if (RELATIVE_TARGET_RE.test(trimmed)) return true;
  // Match Novyx's parser: ISO strings need a "T" or length > 20.
  // This rejects epoch numerics and bare YYYY-MM-DD dates, which the
  // backend would otherwise reject as an opaque 500.
  if (!trimmed.includes("T") && trimmed.length <= 20) return false;
  const parsed = new Date(trimmed);
  return !Number.isNaN(parsed.getTime());
}

function resolveClient(apiKey?: string) {
  if (apiKey) return getNovyxForKey(apiKey);
  // SECURITY: Refuse shared-key fallback in cloud mode. Novyx enforces tenant
  // isolation by API key but has no per-user-within-tenant ACL, so sharing
  // NOVYX_MEMORY_API_KEY would let any authenticated caller rollback any
  // memory under that tenant. Desktop mode is single-user so the fallback
  // is acceptable there.
  if (isCloudMode()) return null;
  const envKey = process.env.NOVYX_MEMORY_API_KEY;
  return envKey ? getNovyxForKey(envKey) : null;
}

const ROLLBACK_QUOTA_CODE = "novyx_ram.v1.rollback_limit_reached";

// The SDK throws NovyxRateLimitError for 429s with the full parsed body on err.data.
// Match by name rather than instanceof so we don't import the error class directly
// (keeps this resilient to SDK internal restructuring).
function extractQuotaResponse(err: unknown): Record<string, unknown> | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { name?: string; data?: unknown };
  if (e.name !== "NovyxRateLimitError") return null;
  if (!e.data || typeof e.data !== "object") return null;
  const data = e.data as Record<string, unknown>;
  if (data.code !== ROLLBACK_QUOTA_CODE) return null;
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const gated = await requireFeature(apiKey, "replay");
    if (gated) return gated;

    const target = req.nextUrl.searchParams.get("target");
    if (!target) {
      return Response.json({ error: "Missing rollback target timestamp" }, { status: 400 });
    }
    if (!isValidRollbackTarget(target)) {
      return Response.json({ error: INVALID_TARGET_MESSAGE }, { status: 400 });
    }

    const nx = resolveClient(apiKey ?? undefined);
    if (!nx) {
      return Response.json({ error: "Novyx not configured" }, { status: 500 });
    }

    const preview = await nx.rollbackPreview(target);
    return Response.json({ mode: "preview", target, rollback_target: target, ...preview });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to preview rollback" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const rlKey = getRateLimitKey("memory-rollback", ctx.userId, req);
    const rl = await checkRateLimit(rlKey, RATE_LIMITS.destructive);
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const gated = await requireFeature(apiKey, "replay");
    if (gated) return gated;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const target = (body as { target?: unknown } | null)?.target;
    if (!target) {
      return Response.json({ error: "Missing rollback target timestamp" }, { status: 400 });
    }
    if (!isValidRollbackTarget(target)) {
      return Response.json({ error: INVALID_TARGET_MESSAGE }, { status: 400 });
    }

    const nx = resolveClient(apiKey ?? undefined);
    if (!nx) {
      return Response.json({ error: "Novyx not configured" }, { status: 500 });
    }

    try {
      const result = await nx.rollback(target, false, true);
      // Preserve backend status ("success" | "partial_success" | "failed") and
      // errors[] verbatim so the UI can distinguish clean vs partial outcomes.
      return Response.json({ mode: "rollback", target, rollback_target: target, ...result });
    } catch (err) {
      const quotaBody = extractQuotaResponse(err);
      if (quotaBody) return Response.json(quotaBody, { status: 429 });
      throw err;
    }
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to perform rollback" }, { status: 500 });
  }
}
