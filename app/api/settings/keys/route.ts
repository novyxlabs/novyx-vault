import { NextRequest } from "next/server";
import { getStorageContext, isCloudMode } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import { encrypt, decrypt } from "@/lib/crypto";

/** GET — return decrypted provider API keys */
export async function GET() {
  if (!isCloudMode()) {
    return Response.json({ keys: null });
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
      return Response.json({ keys: null });
    }

    const keys = JSON.parse(decrypt(data.settings.encryptedProviderKeys));
    return Response.json({ keys });
  } catch {
    return Response.json({ keys: null });
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
