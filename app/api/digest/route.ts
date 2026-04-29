import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";

type DigestSettings = {
  digestEnabled?: boolean;
  digestTime?: string;
  digestTimezone?: string;
  digestLastSentAt?: string;
  digestClaimDay?: string;
};

type DigestUser = {
  id: string;
  email: string;
  settings: DigestSettings;
};

function verifyCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false; // No secret configured = deny (prevent unauthenticated access)
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
    const now = new Date();

    let users: DigestUser[];

    if (targetUserId) {
      const { data } = await supabase
        .from("profiles")
        .select("id, settings")
        .eq("id", targetUserId)
        .single();
      if (!data) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
      if (!authUser.user?.email) return NextResponse.json({ error: "No email" }, { status: 400 });
      users = [{
        id: data.id,
        email: authUser.user.email,
        settings: toDigestSettings(data.settings),
      }];
    } else {
      const { data } = await supabase
        .from("profiles")
        .select("id, settings")
        .contains("settings", { digestEnabled: true });

      if (!data || data.length === 0) return NextResponse.json({ sent: 0 });

      const resolved = await Promise.all(
        data.map(async (p) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(p.id);
          return authUser.user?.email
            ? { id: p.id, email: authUser.user.email, settings: toDigestSettings(p.settings) }
            : null;
        })
      );
      users = resolved.filter(Boolean).filter((user) => isDigestDue(user.settings, now, false)) as typeof users;
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    let sent = 0;

    for (const user of users) {
      if (!isDigestDue(user.settings, now, !targetUserId)) continue;

      const timeZone = normalizeTimeZone(user.settings.digestTimezone);
      if (!timeZone) continue;
      const dateStr = previousLocalDate(now, timeZone);
      const digestDay = localDate(now, timeZone);
      const claimedSettings = await claimDigestSend(supabase, user, digestDay);
      if (!claimedSettings) continue;

      const { data: dailyNote } = await supabase
        .from("notes")
        .select("name, content")
        .eq("user_id", user.id)
        .eq("is_trashed", false)
        .like("name", `%${dateStr}%`)
        .limit(1)
        .maybeSingle();

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
      if (res.ok) {
        await supabase
          .from("profiles")
          .update({ settings: { ...claimedSettings, digestLastSentAt: now.toISOString() } })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({ sent });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function claimDigestSend(
  supabase: ReturnType<typeof createServiceSupabase>,
  user: DigestUser,
  digestDay: string
): Promise<DigestSettings | null> {
  const settings = { ...user.settings, digestClaimDay: digestDay };
  const { count, error } = await supabase
    .from("profiles")
    .update({ settings }, { count: "exact" })
    .eq("id", user.id)
    .filter("settings", "eq", JSON.stringify(user.settings));

  if (error || count !== 1) return null;
  return settings;
}

function toDigestSettings(settings: unknown): DigestSettings {
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? settings as DigestSettings
    : {};
}

function isDigestDue(settings: DigestSettings, now: Date, requireEnabledAndSchedule: boolean): boolean {
  const timeZone = normalizeTimeZone(settings.digestTimezone);
  if (!timeZone) return false;
  const digestTime = settings.digestTime ?? "08:00";
  if (!/^\d{2}:\d{2}$/.test(digestTime)) return false;

  const today = localDate(now, timeZone);
  if (settings.digestLastSentAt) {
    const lastSentAt = new Date(settings.digestLastSentAt);
    if (!Number.isNaN(lastSentAt.getTime()) && localDate(lastSentAt, timeZone) === today) {
      return false;
    }
  }
  if (settings.digestClaimDay === today) return false;

  if (!requireEnabledAndSchedule) return true;
  if (settings.digestEnabled !== true) return false;

  const localTime = localHourMinute(now, timeZone);
  return localTime >= digestTime;
}

function normalizeTimeZone(timeZone: unknown): string | null {
  if (typeof timeZone !== "string" || !timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return null;
  }
}

function localDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localHourMinute(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

function previousLocalDate(date: Date, timeZone: string): string {
  const [year, month, day] = localDate(date, timeZone).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 86_400_000).toISOString().slice(0, 10);
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
