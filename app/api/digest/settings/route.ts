import { NextRequest, NextResponse } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";

// GET — get digest settings
export async function GET() {
  try {
    const ctx = await getStorageContext();
    const supabase = createServerSupabase(ctx.cookieHeader);
    const { data } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", ctx.userId)
      .single();

    const settings = (data?.settings || {}) as Record<string, unknown>;
    return NextResponse.json({
      digestEnabled: settings.digestEnabled ?? false,
      digestTime: settings.digestTime ?? "08:00",
      digestTimezone: settings.digestTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

// PUT — update digest settings
export async function PUT(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { digestEnabled, digestTime, digestTimezone } = await req.json();
    const supabase = createServerSupabase(ctx.cookieHeader);

    // Merge with existing settings
    const { data: existing } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", ctx.userId)
      .single();

    const currentSettings = (existing?.settings || {}) as Record<string, unknown>;
    const updated = {
      ...currentSettings,
      digestEnabled: digestEnabled ?? currentSettings.digestEnabled ?? false,
      digestTime: digestTime ?? currentSettings.digestTime ?? "08:00",
      digestTimezone: digestTimezone ?? currentSettings.digestTimezone,
    };

    const { error } = await supabase
      .from("profiles")
      .update({ settings: updated })
      .eq("id", ctx.userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
