import { NextRequest } from "next/server";
import { listTrash, restoreFromTrash, purgeFromTrash, emptyTrash } from "@/lib/notes";
import { getStorageContext } from "@/lib/auth";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const entries = await listTrash(ctx);
    return Response.json({ entries });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { action, id } = await req.json();

    if (action === "restore") {
      if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
      const restoredPath = await restoreFromTrash(id, ctx);
      return Response.json({ success: true, restoredPath });
    }

    if (action === "purge") {
      if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
      await purgeFromTrash(id, ctx);
      return Response.json({ success: true });
    }

    if (action === "empty") {
      await emptyTrash(ctx);
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
