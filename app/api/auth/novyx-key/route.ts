import { NextRequest } from "next/server";
import { getStorageContext, isCloudMode } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import { storeNovyxKey } from "@/lib/novyx";

/** GET — return masked Novyx key for current user */
export async function GET() {
  if (!isCloudMode()) {
    return Response.json({ key: null, masked: null });
  }

  try {
    const ctx = await getStorageContext();
    const supabase = createServerSupabase(ctx.cookieHeader);
    const { data } = await supabase
      .from("profiles")
      .select("novyx_api_key")
      .eq("id", ctx.userId)
      .single();

    const key = data?.novyx_api_key || null;
    const masked = key
      ? key.slice(0, 8) + "..." + key.slice(-4)
      : null;

    return Response.json({ hasKey: !!key, masked });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ hasKey: false, masked: null }, { status: 500 });
  }
}

/** PUT — update Novyx key for current user */
export async function PUT(req: NextRequest) {
  if (!isCloudMode()) {
    return Response.json({ success: true });
  }

  try {
    const ctx = await getStorageContext();
    const { key } = await req.json();

    if (!key || typeof key !== "string" || key.trim().length < 8) {
      return Response.json({ error: "Invalid API key" }, { status: 400 });
    }

    await storeNovyxKey(ctx.userId!, key.trim());
    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to save key" }, { status: 500 });
  }
}
