import { NextRequest } from "next/server";
import { updatePolicy, deletePolicy, type PolicyInput } from "@/lib/control";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) {
      return Response.json({ error: "No Novyx API key configured" }, { status: 400 });
    }

    const body = (await req.json()) as Partial<PolicyInput>;
    const result = await updatePolicy(id, body, apiKey);
    return Response.json({ policy: result });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to update policy" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) {
      return Response.json({ error: "No Novyx API key configured" }, { status: 400 });
    }

    const result = await deletePolicy(id, apiKey);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to delete policy" }, { status: 500 });
  }
}
