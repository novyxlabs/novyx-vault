import { NextRequest } from "next/server";
import { submitDecision } from "@/lib/control";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) {
      return Response.json({ error: "No Novyx API key configured" }, { status: 400 });
    }

    const { decision } = await req.json();
    if (decision !== "approved" && decision !== "denied") {
      return Response.json({ error: "Invalid decision" }, { status: 400 });
    }

    const result = await submitDecision(id, decision, apiKey);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Failed to submit decision";
    return Response.json({ error: message }, { status: 500 });
  }
}
