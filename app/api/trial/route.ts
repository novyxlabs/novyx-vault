import { NextResponse } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { getTrialStatus } from "@/lib/trial";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    if (!ctx.userId) {
      return NextResponse.json({ eligible: false, remaining: 0, limit: 0, used: 0 });
    }
    const status = await getTrialStatus(ctx.userId);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ eligible: false, remaining: 0, limit: 0, used: 0 });
  }
}
