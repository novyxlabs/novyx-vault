import { NextRequest } from "next/server";
import { getStorageContext, getUser } from "@/lib/auth";
import { getUserNovyxKey, ensureNovyxKey } from "@/lib/novyx";
import { listDrafts } from "@/lib/drafts";

async function resolveApiKey() {
  const ctx = await getStorageContext();
  let apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
  if (!apiKey && ctx.userId) {
    const user = await getUser();
    if (user?.email) apiKey = await ensureNovyxKey(ctx.userId, user.email, ctx.cookieHeader);
  }
  return apiKey;
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = await resolveApiKey();
    if (!apiKey) return Response.json({ error: "No API key" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || undefined;
    const branch_id = searchParams.get("branch_id") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await listDrafts(apiKey, { status, branch_id, limit, offset });
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to list drafts" }, { status: 500 });
  }
}
