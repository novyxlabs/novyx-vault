import { headers } from "next/headers";
import { createServerSupabase } from "./supabase";
import type { StorageContext } from "./notes";

const AUTH_TIMEOUT_MS = 5000;

export function isCloudMode(): boolean {
  return process.env.STORAGE_MODE === "supabase";
}

export interface AppUser {
  id: string;
  email?: string;
}

/** Race a promise against a timeout. Returns null on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Core auth call — shared by getUser and getStorageContext to avoid duplication.
 * Wraps supabase.auth.getUser() with a timeout to prevent hanging on cold starts.
 */
async function resolveAuth(cookie: string): Promise<AppUser | null> {
  const supabase = createServerSupabase(cookie);
  const result = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS);
  if (!result || !result.data.user) return null;
  return { id: result.data.user.id, email: result.data.user.email };
}

/**
 * Get the current user from Supabase auth.
 * Returns null in desktop mode, if not authenticated, or on timeout.
 */
export async function getUser(): Promise<AppUser | null> {
  if (!isCloudMode()) return null;

  const headerStore = await headers();
  const cookie = headerStore.get("cookie") ?? "";
  return resolveAuth(cookie);
}

/**
 * Require an authenticated user in cloud mode.
 * In desktop mode, returns null (no auth needed).
 * In cloud mode, throws a Response with 401 if not authenticated.
 */
export async function requireUser(): Promise<AppUser | null> {
  if (!isCloudMode()) return null;

  const user = await getUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Get storage context for the current request.
 * In desktop mode, returns empty context (FsAdapter needs no auth).
 * In cloud mode, returns userId + cookie for SupabaseAdapter.
 */
export async function getStorageContext(): Promise<StorageContext> {
  if (!isCloudMode()) return {};

  const headerStore = await headers();
  const cookie = headerStore.get("cookie") ?? "";
  const user = await resolveAuth(cookie);

  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { userId: user.id, cookieHeader: cookie };
}
