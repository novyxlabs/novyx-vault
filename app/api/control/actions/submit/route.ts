import { NextRequest } from "next/server";
import { submitAction } from "@/lib/control";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

interface SubmitBody {
  action?: string;
  params?: Record<string, unknown>;
  agent_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) {
      return Response.json({ error: "No Novyx API key configured" }, { status: 400 });
    }

    const body = (await req.json()) as SubmitBody;
    if (!body.action || typeof body.action !== "string") {
      return Response.json(
        { error: "action (string) is required" },
        { status: 400 }
      );
    }

    const result = await submitAction(
      body.action,
      body.params ?? {},
      apiKey,
      { agent_id: body.agent_id }
    );
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to submit action" }, { status: 500 });
  }
}
