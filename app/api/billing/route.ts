import { NextRequest, NextResponse } from "next/server";
import { getUser, isCloudMode } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const NOVYX_API_URL = process.env.NOVYX_API_URL || "https://novyx-ram-api.fly.dev";
const VALID_TIERS = new Set(["pro"]);

/**
 * POST /api/billing — Create a Stripe checkout session via Novyx Core
 * Body: { tier: "pro" }
 * Returns: { checkout_url: string }
 */
export async function POST(req: NextRequest) {
  if (!isCloudMode()) {
    return NextResponse.json({ error: "Billing is only available in cloud mode" }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rlKey = getRateLimitKey("billing", user.id, req);
  const rl = await checkRateLimit(rlKey, RATE_LIMITS.billing);
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const cookie = req.headers.get("cookie") ?? "";
  const apiKey = await getUserNovyxKey(user.id, cookie);
  if (!apiKey) {
    return NextResponse.json({ error: "No Novyx API key found" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const tier = body.tier === undefined ? "pro" : body.tier;
  if (typeof tier !== "string" || !VALID_TIERS.has(tier)) {
    return NextResponse.json({ error: "Unsupported billing tier" }, { status: 400 });
  }

  const res = await fetch(`${NOVYX_API_URL}/v1/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      tier,
      email: user.email,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Checkout failed");
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ checkout_url: data.checkout_url });
}

/**
 * GET /api/billing — Get Stripe Customer Portal URL for managing subscription
 */
export async function GET(req: NextRequest) {
  if (!isCloudMode()) {
    return NextResponse.json({ error: "Billing is only available in cloud mode" }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const cookie = req.headers.get("cookie") ?? "";
  const apiKey = await getUserNovyxKey(user.id, cookie);
  if (!apiKey) {
    return NextResponse.json({ error: "No Novyx API key found" }, { status: 400 });
  }

  const res = await fetch(`${NOVYX_API_URL}/v1/billing`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Failed to get billing portal");
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ portal_url: data.portal_url || data.url });
}
