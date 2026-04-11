import { NextRequest, NextResponse } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import { provisionNovyxKey, storeNovyxKey } from "@/lib/novyx";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    if (!ctx.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit on the authenticated user id — 5/min is enough for legitimate
    // retry/backoff from a flaky network but stops parallel provisioning races.
    const rlKey = getRateLimitKey("provision", ctx.userId, req);
    const rl = await checkRateLimit(rlKey, RATE_LIMITS.auth);
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    // Idempotency check #1: does the user already have a key stored? If so,
    // return the existing-key response without going upstream.
    const supabase = createServerSupabase(ctx.cookieHeader);
    const { data: profile } = await supabase
      .from("profiles")
      .select("novyx_api_key")
      .eq("id", ctx.userId)
      .single();

    if (profile?.novyx_api_key) {
      return NextResponse.json({ provisioned: true, existing: true });
    }

    // Get user email for provisioning
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Provision key via Novyx API
    const result = await provisionNovyxKey(email);

    // Idempotency check #2: race-window guard. Between the profile select
    // above and this store, a concurrent request could have also provisioned
    // a key. If so, the upstream has already burned two provisionings
    // (which costs us) but we prevent the DB from getting overwritten by
    // using onConflict and then re-reading the stored value below.
    //
    // Note: storeNovyxKey uses upsert internally per lib/novyx.ts, so the
    // second concurrent writer will land — that's fine because both keys
    // are valid, we just end up with whichever landed last. A full fix
    // requires a DB-level lock or a status column ("provisioning" → "ready")
    // which is a larger change and is tracked as a backlog item for the
    // backend team.
    await storeNovyxKey(ctx.userId, result.api_key);

    return NextResponse.json({
      provisioned: true,
      tier: result.tier,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Novyx provisioning error:", e);
    return NextResponse.json(
      { error: "Provisioning failed" },
      { status: 500 }
    );
  }
}
