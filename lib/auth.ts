import { headers } from "next/headers";
import { createServerSupabase } from "./supabase";
import type { StorageContext } from "./notes";

export function isCloudMode(): boolean {
  return process.env.STORAGE_MODE === "supabase";
}

export interface AppUser {
  id: string;
  email?: string;
}

/**
 * Get the current user from Supabase auth.
 * Returns null in desktop mode or if not authenticated.
 */
export async function getUser(): Promise<AppUser | null> {
  if (!isCloudMode()) return null;

  const headerStore = await headers();
  const cookie = headerStore.get("cookie") ?? "";
  const supabase = createServerSupabase(cookie);
  const { data } = await supabase.auth.getUser();

  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email };
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
  const supabase = createServerSupabase(cookie);
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { userId: data.user.id, cookieHeader: cookie };
}
