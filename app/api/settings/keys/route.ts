import { NextRequest } from "next/server";
import { getStorageContext, isCloudMode } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import { encrypt, decrypt } from "@/lib/crypto";
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET — return provider key metadata or revealed keys.
 *
 * Default (no query params):
 *   Returns { providers: ["openai", "anthropic", ...] } — which providers
 *   have keys stored, without the key values. Suitable for ambient
 *   settings-page loads and UI state (show "configured" badges).
 *
 * With ?reveal=true:
 *   Returns { keys: { openai: "sk-...", anthropic: "sk-..." } } — the
 *   full decrypted keys. Rate-limited. Used for:
 *   - First-time cloud restore to a new device (no local keys yet)
 *   - Explicit "Reveal key" action in the settings UI
 *
 * Why: the default GET no longer decrypts keys into the browser on every
 * page load. An XSS or malicious extension can only get provider names
 * (not values) from the ambient load. To get actual keys, the attacker
 * needs to trigger a reveal request, which is rate-limited and auditable.
 */
export async function GET(req: NextRequest) {
  if (!isCloudMode()) {
    return Response.json({ keys: null, providers: [] });
  }

  try {
    const ctx = await getStorageContext();
    const supabase = createServerSupabase(ctx.cookieHeader);
    const { data, error } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", ctx.userId)
      .single();

    if (error || !data?.settings?.encryptedProviderKeys) {
      return Response.json({ keys: null, providers: [] });
    }

    const reveal = req.nextUrl.searchParams.get("reveal") === "true";

    if (!reveal) {
      // Default: return provider names only (no decryption)
      try {
        const keys = JSON.parse(decrypt(data.settings.encryptedProviderKeys));
        const providers = Object.keys(keys).filter((k) => Boolean(keys[k]));
        return Response.json({ keys: null, providers });
      } catch {
        return Response.json({ keys: null, providers: [] });
      }
    }

    // Reveal mode: decrypt and return actual key values.
    // Rate-limited to reduce blast radius if the reveal endpoint is hit
    // by an attacker (XSS, malicious extension).
    const rlKey = getRateLimitKey("key-reveal", ctx.userId, req);
    const rl = await checkRateLimit(rlKey, RATE_LIMITS.auth); // 5/min
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    const keys = JSON.parse(decrypt(data.settings.encryptedProviderKeys));
    return Response.json({ keys });
  } catch {
    return Response.json({ keys: null, providers: [] });
  }
}

/** PUT — encrypt and store provider API keys */
export async function PUT(req: NextRequest) {
  if (!isCloudMode()) {
    return Response.json({ success: true });
  }

  if (!process.env.PROVIDER_KEY_SECRET) {
    return Response.json({ error: "Encryption not configured" }, { status: 501 });
  }

  try {
    const ctx = await getStorageContext();
    const { keys } = await req.json();

    if (!keys || typeof keys !== "object") {
      return Response.json({ error: "Invalid keys payload" }, { status: 400 });
    }

    const encrypted = encrypt(JSON.stringify(keys));
    const supabase = createServerSupabase(ctx.cookieHeader);

    // Read existing settings and merge the encrypted keys in
    const { data } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", ctx.userId)
      .single();

    const settings = (data?.settings as Record<string, unknown>) || {};
    settings.encryptedProviderKeys = encrypted;

    const { error } = await supabase
      .from("profiles")
      .update({ settings })
      .eq("id", ctx.userId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to save keys" }, { status: 500 });
  }
}
