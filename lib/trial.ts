/**
 * Free trial AI — gives new users 25 free AI calls before requiring BYOK setup.
 * Uses a server-side shared API key (TRIAL_AI_API_KEY env var).
 */

import { createServiceSupabase } from "./supabase";

const TRIAL_LIMIT = 25;
const TRIAL_MODEL = "gpt-4o-mini";
const TRIAL_BASE_URL = "https://api.openai.com/v1";

export interface TrialStatus {
  eligible: boolean;
  remaining: number;
  limit: number;
  used: number;
}

/**
 * Check if a user is eligible for free trial AI calls.
 * Returns eligibility status and remaining calls.
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const supabase = createServiceSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("trial_ai_calls_used")
    .eq("id", userId)
    .single();

  const used = data?.trial_ai_calls_used ?? 0;
  return {
    eligible: used < TRIAL_LIMIT,
    remaining: Math.max(0, TRIAL_LIMIT - used),
    limit: TRIAL_LIMIT,
    used,
  };
}

/**
 * Increment the trial usage counter for a user.
 * Called after each successful trial AI call.
 */
export async function incrementTrialUsage(userId: string): Promise<void> {
  const supabase = createServiceSupabase();
  try {
    // Use RPC for atomic increment
    const { error } = await supabase.rpc("increment_trial_calls", { user_id_param: userId });
    if (error) throw error;
  } catch {
    // Fallback: read-then-write (slightly racy but acceptable for a counter)
    const { data } = await supabase
      .from("profiles")
      .select("trial_ai_calls_used")
      .eq("id", userId)
      .single();
    const current = data?.trial_ai_calls_used ?? 0;
    await supabase
      .from("profiles")
      .update({ trial_ai_calls_used: current + 1 })
      .eq("id", userId);
  }
}

/**
 * Get the trial provider config for server-side use.
 * Returns null if TRIAL_AI_API_KEY is not configured.
 */
export function getTrialProviderConfig(): {
  baseURL: string;
  apiKey: string;
  model: string;
} | null {
  const apiKey = process.env.TRIAL_AI_API_KEY;
  if (!apiKey) return null;
  return {
    baseURL: TRIAL_BASE_URL,
    apiKey,
    model: TRIAL_MODEL,
  };
}
