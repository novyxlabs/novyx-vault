import { NextResponse } from "next/server";

const CLOUD_REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PROVIDER_KEY_SECRET",
  "NOVYX_ADMIN_KEY",
] as const;

const PRODUCTION_REQUIRED_ENV = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const mode = process.env.STORAGE_MODE === "supabase" ? "cloud" : "local";
  const isProduction = process.env.NODE_ENV === "production";
  const required = [
    ...(mode === "cloud" ? CLOUD_REQUIRED_ENV : []),
    ...(isProduction ? PRODUCTION_REQUIRED_ENV : []),
  ];
  const missing = required.filter((name) => !hasEnv(name));
  const ready = missing.length === 0;

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      mode,
      checks: {
        requiredConfigPresent: ready,
      },
      missing,
    },
    { status: ready ? 200 : 503 }
  );
}
