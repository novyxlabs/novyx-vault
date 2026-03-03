import { NextRequest } from "next/server";
import { getStorageContext, isCloudMode } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  if (!isCloudMode()) {
    return Response.json({ settings: null });
  }

  try {
    const ctx = await getStorageContext();
    const supabase = createServerSupabase(ctx.cookieHeader);
    const { data, error } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", ctx.userId)
      .single();

    if (error) {
      return Response.json({ settings: null });
    }

    return Response.json({ settings: data?.settings || null });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ settings: null }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isCloudMode()) {
    return Response.json({ success: true });
  }

  try {
    const ctx = await getStorageContext();
    const { settings } = await req.json();

    if (!settings || typeof settings !== "object") {
      return Response.json({ error: "Invalid settings" }, { status: 400 });
    }

    const supabase = createServerSupabase(ctx.cookieHeader);
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
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
