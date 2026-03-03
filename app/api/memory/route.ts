import { NextRequest } from "next/server";
import { listMemories, forgetMemory, rememberExchange } from "@/lib/memory";
import { getStorageContext, getUser } from "@/lib/auth";
import { getUserNovyxKey, ensureNovyxKey } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    let apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);

    // Fallback: if cloud user has no Novyx key, attempt provisioning now
    if (!apiKey && ctx.userId) {
      const user = await getUser();
      if (user?.email) {
        apiKey = await ensureNovyxKey(ctx.userId, user.email, ctx.cookieHeader);
      }
    }

    const { searchParams } = req.nextUrl;
    const query = searchParams.get("q") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await listMemories(query, limit, offset, ctx.userId, apiKey ?? undefined);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to list memories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const { observation } = await req.json();
    if (!observation || typeof observation !== "string" || !observation.trim()) {
      return Response.json({ error: "Missing observation text" }, { status: 400 });
    }

    await rememberExchange(observation.trim(), undefined, ctx.userId, apiKey ?? undefined);
    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to save memory" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const { id } = await req.json();
    if (!id) {
      return Response.json({ error: "Missing memory id" }, { status: 400 });
    }

    const success = await forgetMemory(id, apiKey ?? undefined);
    if (!success) {
      return Response.json({ error: "Failed to delete memory" }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
