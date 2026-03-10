import { NextResponse } from "next/server";
import { Novyx } from "novyx";

export async function GET() {
  try {
    // Health check doesn't need auth — use a throwaway client
    const nx = new Novyx({ apiKey: "health-check" });
    const data = await nx.health();
    if (data && (data.status === "ok" || data.status === "healthy")) {
      return NextResponse.json({ status: "ok" });
    }
    return NextResponse.json({ status: "unreachable" });
  } catch {
    return NextResponse.json({ status: "unreachable" });
  }
}
