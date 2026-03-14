import { getStorageContext, getUser } from "@/lib/auth";
import { getUserNovyxKey, ensureNovyxKey } from "@/lib/novyx";
import { mergeBranch } from "@/lib/drafts";

async function resolveApiKey() {
  const ctx = await getStorageContext();
  let apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
  if (!apiKey && ctx.userId) {
    const user = await getUser();
    if (user?.email) apiKey = await ensureNovyxKey(ctx.userId, user.email, ctx.cookieHeader);
  }
  return apiKey;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const apiKey = await resolveApiKey();
    if (!apiKey) return Response.json({ error: "No API key" }, { status: 401 });
    const { id } = await params;
    const result = await mergeBranch(apiKey, id);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to merge branch" }, { status: 500 });
  }
}
