import { NextResponse } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import { provisionNovyxKey, storeNovyxKey } from "@/lib/novyx";

export async function POST() {
  try {
    const ctx = await getStorageContext();
    if (!ctx.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user already has a key
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

    // Store in profile
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
