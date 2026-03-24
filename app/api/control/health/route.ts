import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey, getNovyxForKey } from "@/lib/novyx";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) return Response.json({ error: "No API key" }, { status: 401 });

    const nx = getNovyxForKey(apiKey);
    if (!nx) return Response.json({ error: "No Novyx client" }, { status: 500 });

    // evalGate returns { score, status, checks, ... } which the UI expects
    const data = await nx.evalGate(0);
    return Response.json(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch health" }, { status: 500 });
  }
}
