import { getKnowledgeGraph } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";

export async function GET() {
  try {
    await getStorageContext();
    const result = await getKnowledgeGraph();
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch knowledge graph" }, { status: 500 });
  }
}
