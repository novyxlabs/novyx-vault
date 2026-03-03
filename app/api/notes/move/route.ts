import { NextRequest, NextResponse } from "next/server";
import { renameNote } from "@/lib/notes";
import { getStorageContext } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { oldPath, newPath } = await req.json();
    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "oldPath and newPath are required" },
        { status: 400 }
      );
    }

    await renameNote(oldPath, newPath, ctx);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
