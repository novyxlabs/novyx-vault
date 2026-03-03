import { NextResponse } from "next/server";
import { buildGraph } from "@/lib/graph";
import { getStorageContext } from "@/lib/auth";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const graph = await buildGraph(ctx);
    return NextResponse.json(graph);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Graph error:", e);
    return NextResponse.json({ nodes: [], links: [] }, { status: 500 });
  }
}
