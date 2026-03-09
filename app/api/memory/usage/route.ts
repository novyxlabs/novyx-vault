import { getDashboard, getMemoryUsage } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey, getFeatureGating } from "@/lib/novyx";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);

    // Try the new single-call dashboard endpoint first
    const dashboard = await getDashboard(apiKey ?? undefined);
    if (dashboard) {
      return Response.json({
        usage: {
          tier: dashboard.tier,
          memories: { current: dashboard.memory_count, limit: dashboard.limits?.memories },
          api_calls: { today: dashboard.api_calls_today, limit: dashboard.limits?.api_calls },
          rollbacks: { limit: dashboard.limits?.rollbacks },
          pressure: dashboard.pressure,
          period: dashboard.period,
          usage_percent: dashboard.usage_percent,
        },
        gating: {
          tier: dashboard.tier,
          features: {
            graph: dashboard.features?.knowledge_graph ?? false,
            cortex: dashboard.features?.cortex ?? false,
            replay: dashboard.features?.replay ?? false,
            insights: dashboard.features?.cortex ?? false,
          },
          usage: {
            memories_count: dashboard.memory_count,
            memories_limit: dashboard.limits?.memories,
          },
        },
      });
    }

    // Fallback to old multi-call pattern if dashboard endpoint unavailable
    const [usage, gating] = await Promise.all([
      getMemoryUsage(apiKey ?? undefined),
      apiKey ? getFeatureGating(apiKey) : null,
    ]);
    return Response.json({ usage: usage || {}, gating });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
