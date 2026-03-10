import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://novyx-ram-api.fly.dev/health", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data && (data.status === "ok" || data.status === "healthy")) {
      return NextResponse.json({ status: "ok" });
    }
    return NextResponse.json({ status: "unreachable" });
  } catch {
    return NextResponse.json({ status: "unreachable" });
  }
}
