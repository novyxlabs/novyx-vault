import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://novyx-ram-api.fly.dev/healthz", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return NextResponse.json({ status: "ok" });
    }
    return NextResponse.json({ status: "unreachable" });
  } catch {
    return NextResponse.json({ status: "unreachable" });
  }
}
