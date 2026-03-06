import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";

function verifyCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // No secret configured = allow
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

// GET — called by Vercel Cron (sends digests to all opted-in users)
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return sendDigests();
}

// POST — send digest for a specific user (manual trigger)
export async function POST(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await req.json().catch(() => ({ userId: undefined }));
  return sendDigests(userId);
}

async function sendDigests(targetUserId?: string) {
  try {
    const supabase = createServiceSupabase();

    let users: { id: string; email: string }[];

    if (targetUserId) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .single();
      if (!data) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
      if (!authUser.user?.email) return NextResponse.json({ error: "No email" }, { status: 400 });
      users = [{ id: data.id, email: authUser.user.email }];
    } else {
      const { data } = await supabase
        .from("profiles")
        .select("id, settings")
        .contains("settings", { digestEnabled: true });

      if (!data || data.length === 0) return NextResponse.json({ sent: 0 });

      const resolved = await Promise.all(
        data.map(async (p) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(p.id);
          return authUser.user?.email ? { id: p.id, email: authUser.user.email } : null;
        })
      );
      users = resolved.filter(Boolean) as typeof users;
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    let sent = 0;

    for (const user of users) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];

      const { data: dailyNote } = await supabase
        .from("notes")
        .select("name, content")
        .eq("user_id", user.id)
        .eq("is_trashed", false)
        .like("name", `%${dateStr}%`)
        .limit(1)
        .single();

      const { data: recentNotes } = await supabase
        .from("notes")
        .select("name, content")
        .eq("user_id", user.id)
        .eq("is_trashed", false)
        .eq("is_folder", false)
        .order("modified_at", { ascending: false })
        .limit(3);

      const html = buildDigestEmail({
        dailyNote: dailyNote ? { name: dailyNote.name, content: dailyNote.content || "" } : null,
        recentNotes: recentNotes?.map((n) => ({ name: n.name, content: (n.content || "").slice(0, 200) })) || [],
        deepLink: "https://vault.novyxlabs.com",
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Novyx Vault <digest@novyxlabs.com>",
          to: user.email,
          subject: `Your Vault Digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
          html,
        }),
      });

      if (res.ok) sent++;
    }

    return NextResponse.json({ sent });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildDigestEmail({
  dailyNote,
  recentNotes,
  deepLink,
}: {
  dailyNote: { name: string; content: string } | null;
  recentNotes: { name: string; content: string }[];
  deepLink: string;
}) {
  const noteSection = dailyNote
    ? `<div style="background:#1c1c1f;border-radius:8px;padding:16px;margin:16px 0">
        <h3 style="color:#e4e4e7;margin:0 0 8px;font-size:14px">${esc(dailyNote.name)}</h3>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0;white-space:pre-wrap">${esc(dailyNote.content.slice(0, 500))}</p>
      </div>`
    : `<p style="color:#71717a;font-size:13px;margin:16px 0">No daily note from yesterday. <a href="${deepLink}" style="color:#8b5cf6">Write today&apos;s note</a></p>`;

  const recentSection =
    recentNotes.length > 0
      ? recentNotes
          .map(
            (n) =>
              `<div style="padding:8px 0;border-bottom:1px solid #27272a">
                <span style="color:#e4e4e7;font-size:13px;font-weight:500">${esc(n.name)}</span>
                <p style="color:#71717a;font-size:12px;margin:4px 0 0;line-height:1.5">${esc(n.content.slice(0, 120))}...</p>
              </div>`
          )
          .join("")
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;width:36px;height:36px;border-radius:8px;background:#8b5cf6;line-height:36px;text-align:center;color:white;font-weight:700;font-size:18px">N</div>
      <h1 style="color:#e4e4e7;font-size:18px;margin:8px 0 0">Your Vault Digest</h1>
      <p style="color:#71717a;font-size:12px;margin:4px 0 0">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
    <h2 style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:24px 0 8px">Yesterday&apos;s Note</h2>
    ${noteSection}
    ${recentSection ? `<h2 style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:24px 0 8px">Recent Notes</h2>${recentSection}` : ""}
    <div style="text-align:center;margin-top:32px">
      <a href="${deepLink}" style="display:inline-block;padding:10px 24px;background:#8b5cf6;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">Write today&apos;s note</a>
    </div>
    <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #27272a">
      <p style="color:#52525b;font-size:11px">Sent by <a href="https://vault.novyxlabs.com" style="color:#8b5cf6;text-decoration:none">Novyx Vault</a></p>
    </div>
  </div>
</body>
</html>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
