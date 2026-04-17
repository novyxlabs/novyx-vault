import { NextRequest } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

// INVARIANT: Vault maps 1 Supabase user → 1 Novyx tenant via profiles.novyx_api_key.
// Novyx enforces hard tenant isolation on streams (event.tenant_id filter), so
// forwarding a client-supplied space_id cannot leak cross-tenant data today.
// If this ever becomes many-to-one (teams, shared workspaces, etc.), add a
// nx.getSpace(spaceId) ownership check here before forwarding to upstream.
const BASE_URL = process.env.NOVYX_API_URL || "https://novyx-ram-api.fly.dev";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) return Response.json({ error: "No API key" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const url = new URL(`${BASE_URL}/v1/streams/subscribe`);
    const spaceId = searchParams.get("space_id");
    const types = searchParams.get("types");
    if (spaceId) url.searchParams.set("space_id", spaceId);
    if (types) url.searchParams.set("types", types);

    const upstream = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/event-stream",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: `Stream error: ${upstream.status}` }, { status: upstream.status });
    }

    // Pipe the SSE stream through to the client
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to connect to stream" }, { status: 500 });
  }
}
