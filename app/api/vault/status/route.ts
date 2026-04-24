import { NextResponse } from "next/server";
import { getVaultStatus } from "@/lib/vault-status";

export async function GET() {
  return NextResponse.json(getVaultStatus());
}
