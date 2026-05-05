import { NextRequest } from "next/server";
import { submitAction } from "@/lib/control";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

interface SubmitBody {
  action?: string;
  params?: Record<string, unknown>;
  agent_id?: string;
}

const MAX_CONTENT_LENGTH = 16_384;
const MAX_ACTION_LENGTH = 200;
const MAX_AGENT_ID_LENGTH = 200;
const MAX_PARAMS_LENGTH = 12_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const rl = await checkRateLimit(
      getRateLimitKey("control-action-submit", ctx.userId, req),
      RATE_LIMITS.crud
    );
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) {
      return Response.json({ error: "No Novyx API key configured" }, { status: 400 });
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > MAX_CONTENT_LENGTH) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }

    const body = (await req.json()) as SubmitBody;
    if (!body.action || typeof body.action !== "string") {
      return Response.json(
        { error: "action (string) is required" },
        { status: 400 }
      );
    }
    if (body.action.length > MAX_ACTION_LENGTH) {
      return Response.json({ error: "action is too long" }, { status: 400 });
    }
    if (body.agent_id !== undefined && (
      typeof body.agent_id !== "string" || body.agent_id.length > MAX_AGENT_ID_LENGTH
    )) {
      return Response.json({ error: "agent_id must be a string" }, { status: 400 });
    }
    if (body.params !== undefined && !isPlainObject(body.params)) {
      return Response.json({ error: "params must be an object" }, { status: 400 });
    }
    if (JSON.stringify(body.params ?? {}).length > MAX_PARAMS_LENGTH) {
      return Response.json({ error: "params payload is too large" }, { status: 413 });
    }

    const result = await submitAction(
      body.action,
      body.params ?? {},
      apiKey,
      { agent_id: body.agent_id }
    );
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to submit action" }, { status: 500 });
  }
}
