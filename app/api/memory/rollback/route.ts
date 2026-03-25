import { NextRequest } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey, getNovyxForKey, requireFeature } from "@/lib/novyx";

function resolveClient(apiKey?: string) {
  if (apiKey) return getNovyxForKey(apiKey);
  const envKey = process.env.NOVYX_MEMORY_API_KEY;
  return envKey ? getNovyxForKey(envKey) : null;
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
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const gated = await requireFeature(apiKey, "replay");
    if (gated) return gated;

    const body = await req.json();
    const { target } = body;
    if (!target) {
      return Response.json({ error: "Missing rollback target timestamp" }, { status: 400 });
    }

    const nx = resolveClient(apiKey ?? undefined);
    if (!nx) {
      return Response.json({ error: "Novyx not configured" }, { status: 500 });
    }

    const result = await nx.rollback(target, false, true);
    return Response.json({ mode: "rollback", target, rollback_target: target, ...result });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to perform rollback" }, { status: 500 });
  }
}
