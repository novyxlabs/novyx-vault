import { Novyx } from "novyx";
import { createHmac } from "crypto";
import { isCloudMode } from "./auth";
import { createServiceSupabase, createServerSupabase } from "./supabase";

// --- Client cache (keyed by API key) ---
const clientCache = new Map<string, Novyx>();

function getOrCreateClient(apiKey: string): Novyx {
  let client = clientCache.get(apiKey);
  if (!client) {
    client = new Novyx({ apiKey });
    clientCache.set(apiKey, client);
  }
  return client;
}

// --- Resolve a user's Novyx API key ---

/**
 * Get the Novyx API key for a user.
 * Cloud mode: reads from profiles.novyx_api_key
 * Desktop mode: falls back to NOVYX_MEMORY_API_KEY env var
 */
export async function getUserNovyxKey(
  userId?: string,
  cookieHeader?: string
): Promise<string | null> {
  // Desktop mode — use env var
  if (!isCloudMode()) {
    return process.env.NOVYX_MEMORY_API_KEY || null;
  }

  // Cloud mode — look up user's key from profiles
  if (!userId) return null;

  try {
    const supabase = createServerSupabase(cookieHeader);
    const { data } = await supabase
      .from("profiles")
      .select("novyx_api_key")
      .eq("id", userId)
      .single();
    if (data?.novyx_api_key) return data.novyx_api_key;
  } catch {
    // fall through
  }

  // No fallback in cloud mode — each user must have their own key
  return null;
}

/**
 * Get a Novyx client instance for a given API key.
 * Returns null if no key provided.
 */
export function getNovyxForKey(apiKey: string | null | undefined): Novyx | null {
  if (!apiKey) return null;
  return getOrCreateClient(apiKey);
}

// --- Provisioning ---

const PROVISION_URL = "https://novyx-ram-api.fly.dev/v1/provision";

/**
 * Generate a time-bound HMAC-signed admin token for Novyx provisioning.
 * Tokens expire after 5 minutes on the server side.
 */
function generateAdminToken(adminKey: string): string {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", adminKey).update(ts).digest("hex");
  return `admin_${ts}_${sig}`;
}

export async function provisionNovyxKey(
  email: string
): Promise<{ api_key: string; tenant_id: string; tier: string }> {
  const adminKey = process.env.NOVYX_ADMIN_KEY;
  if (!adminKey) {
    throw new Error("NOVYX_ADMIN_KEY not configured");
  }

  const token = generateAdminToken(adminKey);

  const res = await fetch(PROVISION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
    },
    body: JSON.stringify({ email, source: "noctivault" }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Provisioning failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Provision a Novyx key with one retry on failure.
 * Returns the provisioned key result, or throws on both attempts failing.
 */
export async function provisionNovyxKeyWithRetry(
  email: string
): Promise<{ api_key: string; tenant_id: string; tier: string }> {
  try {
    return await provisionNovyxKey(email);
  } catch (firstError) {
    // Wait 1 second, then retry once
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      return await provisionNovyxKey(email);
    } catch (retryError) {
      throw retryError;
    }
  }
}

/**
 * Ensure a user has a Novyx key. If not, attempt provisioning.
 * Returns the API key (existing or newly provisioned), or null on failure.
 */
export async function ensureNovyxKey(
  userId: string,
  email: string,
  cookieHeader?: string
): Promise<string | null> {
  // Check if key already exists
  const existing = await getUserNovyxKey(userId, cookieHeader);
  if (existing) return existing;

  // Attempt provisioning
  try {
    const result = await provisionNovyxKeyWithRetry(email);
    await storeNovyxKey(userId, result.api_key);
    return result.api_key;
  } catch (err) {
    console.error("Fallback Novyx provisioning failed:", err);
    return null;
  }
}

/**
 * Store a Novyx API key in the user's profile.
 * Uses service role client to bypass RLS.
 */
export async function storeNovyxKey(
  userId: string,
  apiKey: string
): Promise<void> {
  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ novyx_api_key: apiKey })
    .eq("id", userId);
  if (error) {
    throw new Error(`Failed to store Novyx key: ${error.message}`);
  }
}

/**
 * Server-side feature gate check. Returns a 403 Response if the feature
 * is locked for this user's tier, or null if access is allowed.
 */
export async function requireFeature(
  apiKey: string | null | undefined,
  feature: keyof FeatureGating["features"]
): Promise<Response | null> {
  if (!apiKey) return null; // No key = desktop mode, allow everything
  const gating = await getFeatureGating(apiKey);
  if (gating.features[feature]) return null; // Feature enabled
  return new Response(
    JSON.stringify({ error: `This feature requires a Pro plan (${feature})` }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

// --- Feature gating ---

export interface FeatureGating {
  tier: string;
  features: {
    graph: boolean;
    cortex: boolean;
    replay: boolean;
    insights: boolean;
  };
  usage: {
    memories_count?: number;
    memories_limit?: number;
  };
}

// Cache gating results for 5 minutes
const gatingCache = new Map<string, { data: FeatureGating; expiresAt: number }>();
const GATING_CACHE_TTL = 5 * 60 * 1000;

/**
 * Get feature gating info for a user's Novyx key.
 * Calls GET /v1/usage and maps tier to feature flags.
 */
export async function getFeatureGating(
  apiKey: string
): Promise<FeatureGating> {
  // Check cache
  const cached = gatingCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const nx = getOrCreateClient(apiKey);
    const usage = await nx.usage();
    const tier = (usage as Record<string, unknown>).tier as string || "free";

    const isPro = tier === "pro" || tier === "enterprise";

    const gating: FeatureGating = {
      tier,
      features: {
        graph: isPro,
        cortex: isPro,
        replay: isPro,
        insights: isPro,
      },
      usage: {
        memories_count: (usage as Record<string, unknown>).memories_count as number | undefined,
        memories_limit: (usage as Record<string, unknown>).memories_limit as number | undefined,
      },
    };

    gatingCache.set(apiKey, { data: gating, expiresAt: Date.now() + GATING_CACHE_TTL });
    return gating;
  } catch {
    // Default to free tier on error
    const fallback: FeatureGating = {
      tier: "free",
      features: { graph: false, cortex: false, replay: false, insights: false },
      usage: {},
    };
    return fallback;
  }
}
