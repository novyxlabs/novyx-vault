import { NextRequest } from "next/server";
import { getAuditLog } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await getStorageContext();
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const entries = await getAuditLog(limit);
    return Response.json({ entries });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
