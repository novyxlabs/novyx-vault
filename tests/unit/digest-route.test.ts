import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const createServiceSupabaseMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createServiceSupabase: (...args: unknown[]) => createServiceSupabaseMock(...args),
}));

function cronReq(): NextRequest {
  return new NextRequest("http://localhost:3000/api/digest", {
    headers: { authorization: "Bearer cron-secret" },
  });
}

function profileQuery(profiles: Array<Record<string, unknown>>) {
  return {
    select: vi.fn().mockReturnThis(),
    contains: vi.fn().mockResolvedValue({ data: profiles }),
  };
}

function dailyNoteQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  };
}

function recentNotesQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] }),
  };
}

function profileClaimQuery(updateSpy: ReturnType<typeof vi.fn>, count = 1) {
  return {
    update: updateSpy.mockImplementation(() => ({
      eq: vi.fn().mockReturnValue({
        filter: vi.fn().mockResolvedValue({ count, error: null }),
      }),
    })),
  };
}

function profileFinalUpdateQuery(updateSpy: ReturnType<typeof vi.fn>) {
  return {
    update: updateSpy.mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-29T08:05:00Z"));
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-secret";
  process.env.RESEND_API_KEY = "resend-secret";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.CRON_SECRET;
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/digest scheduling", () => {
  it("sends only users whose local digest time has arrived and records digestLastSentAt", async () => {
    const claimSpy = vi.fn();
    const updateSpy = vi.fn();
    const profiles = [
      {
        id: "due-user",
        settings: {
          digestEnabled: true,
          digestTime: "08:00",
          digestTimezone: "UTC",
          digestLastSentAt: "2026-04-28T08:05:00Z",
        },
      },
      {
        id: "later-user",
        settings: {
          digestEnabled: true,
          digestTime: "09:00",
          digestTimezone: "UTC",
        },
      },
    ];
    const profileQueries = [profileQuery(profiles), profileClaimQuery(claimSpy), profileFinalUpdateQuery(updateSpy)];
    const noteQueries = [dailyNoteQuery(), recentNotesQuery()];
    const supabase = {
      from: vi.fn((table: string) => table === "profiles" ? profileQueries.shift() : noteQueries.shift()),
      auth: {
        admin: {
          getUserById: vi.fn((id: string) => Promise.resolve({
            data: { user: { email: `${id}@example.com` } },
          })),
        },
      },
    };
    createServiceSupabaseMock.mockReturnValue(supabase);

    const { GET } = await import("@/app/api/digest/route");
    const res = await GET(cronReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(1);
    expect(fetch).toHaveBeenCalledOnce();
    expect(claimSpy).toHaveBeenCalledWith(
      { settings: expect.objectContaining({ digestClaimDay: "2026-04-29" }) },
      { count: "exact" }
    );
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      settings: expect.objectContaining({ digestLastSentAt: "2026-04-29T08:05:00.000Z" }),
    }));
  });

  it("does not send a duplicate digest for the same local digest day", async () => {
    const profiles = [{
      id: "already-sent",
      settings: {
        digestEnabled: true,
        digestTime: "08:00",
        digestTimezone: "UTC",
        digestLastSentAt: "2026-04-29T08:01:00Z",
      },
    }];
    const supabase = {
      from: vi.fn(() => profileQuery(profiles)),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "already-sent@example.com" } },
          }),
        },
      },
    };
    createServiceSupabaseMock.mockReturnValue(supabase);

    const { GET } = await import("@/app/api/digest/route");
    const res = await GET(cronReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not send when another cron run already claimed the digest day", async () => {
    const claimSpy = vi.fn();
    const profiles = [{
      id: "racing-user",
      settings: {
        digestEnabled: true,
        digestTime: "08:00",
        digestTimezone: "UTC",
      },
    }];
    const profileQueries = [profileQuery(profiles), profileClaimQuery(claimSpy, 0)];
    const supabase = {
      from: vi.fn((table: string) => table === "profiles" ? profileQueries.shift() : dailyNoteQuery()),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "racing-user@example.com" } },
          }),
        },
      },
    };
    createServiceSupabaseMock.mockReturnValue(supabase);

    const { GET } = await import("@/app/api/digest/route");
    const res = await GET(cronReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(claimSpy).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses digestTime in the user's non-UTC timezone", async () => {
    const claimSpy = vi.fn();
    const updateSpy = vi.fn();
    const profiles = [
      {
        id: "new-york-due",
        settings: {
          digestEnabled: true,
          digestTime: "04:00",
          digestTimezone: "America/New_York",
        },
      },
      {
        id: "new-york-later",
        settings: {
          digestEnabled: true,
          digestTime: "05:00",
          digestTimezone: "America/New_York",
        },
      },
    ];
    const profileQueries = [profileQuery(profiles), profileClaimQuery(claimSpy), profileFinalUpdateQuery(updateSpy)];
    const noteQueries = [dailyNoteQuery(), recentNotesQuery()];
    const supabase = {
      from: vi.fn((table: string) => table === "profiles" ? profileQueries.shift() : noteQueries.shift()),
      auth: {
        admin: {
          getUserById: vi.fn((id: string) => Promise.resolve({
            data: { user: { email: `${id}@example.com` } },
          })),
        },
      },
    };
    createServiceSupabaseMock.mockReturnValue(supabase);

    const { GET } = await import("@/app/api/digest/route");
    const res = await GET(cronReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(1);
    expect(fetch).toHaveBeenCalledOnce();
    expect(claimSpy).toHaveBeenCalledWith(
      { settings: expect.objectContaining({ digestClaimDay: "2026-04-29" }) },
      { count: "exact" }
    );
  });
});
