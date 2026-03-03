import { getKnowledgeGraph } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const result = await getKnowledgeGraph(apiKey ?? undefined);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch knowledge graph" }, { status: 500 });
  }
}
