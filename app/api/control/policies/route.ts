import { getPolicies } from "@/lib/control";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) {
      return Response.json({ error: "No Novyx API key configured" }, { status: 400 });
    }

    const result = await getPolicies(apiKey);
    return Response.json({ ...result, connected: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch policies" }, { status: 500 });
  }
}
