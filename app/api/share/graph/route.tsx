import { ImageResponse } from "next/og";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";
import { getKnowledgeGraph } from "@/lib/memory";

export const runtime = "edge";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const { nodes, edges } = await getKnowledgeGraph(apiKey ?? undefined);

    // Aggregate stats
    const typeCount: Record<string, number> = {};
    for (const node of nodes) {
      const t = node.type || "other";
      typeCount[t] = (typeCount[t] || 0) + 1;
    }
    const topTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topNodes = [...nodes]
      .sort((a, b) => b.tripleCount - a.tripleCount)
      .slice(0, 6);

    const typeColors: Record<string, string> = {
      person: "#8b5cf6",
      preference: "#f59e0b",
      topic: "#3b82f6",
      location: "#10b981",
      event: "#ef4444",
      concept: "#6366f1",
    };

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#0a0a0b",
            color: "#e4e4e7",
            fontFamily: "system-ui, sans-serif",
            padding: 48,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              V
            </div>
            <span style={{ fontSize: 24, fontWeight: 700 }}>My Knowledge Graph</span>
            <span style={{ fontSize: 16, color: "#71717a", marginLeft: "auto" }}>vault.novyxlabs.com</span>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 32, marginBottom: 40 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 48, fontWeight: 700, color: "#6366f1" }}>{nodes.length}</span>
              <span style={{ fontSize: 16, color: "#71717a" }}>entities</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 48, fontWeight: 700, color: "#3b82f6" }}>{edges.length}</span>
              <span style={{ fontSize: 16, color: "#71717a" }}>connections</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 48, fontWeight: 700, color: "#10b981" }}>{topTypes.length}</span>
              <span style={{ fontSize: 16, color: "#71717a" }}>categories</span>
            </div>
          </div>

          {/* Top entities */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <span style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: 1 }}>
              Top Entities
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {topNodes.map((node) => (
                <div
                  key={node.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "#18181b",
                    border: "1px solid #27272a",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: typeColors[node.type?.toLowerCase() || ""] || "#8b5cf6",
                    }}
                  />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{node.name}</span>
                  <span style={{ fontSize: 12, color: "#71717a" }}>{node.tripleCount} links</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
            <span style={{ fontSize: 14, color: "#52525b" }}>
              Powered by Novyx Core — AI memory that learns
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response("Failed to generate graph image", { status: 500 });
  }
}
