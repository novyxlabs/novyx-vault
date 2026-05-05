import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = path.resolve(__dirname, "../..");
const originalEnv = { ...process.env };

function readText(filePath: string): string {
  return fs.readFileSync(path.join(root, filePath), "utf-8");
}

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  vi.unstubAllEnvs();
}

describe("Phase 8 deployment readiness config", () => {
  it("runs the digest cron frequently enough for user-local digest schedules", () => {
    const config = JSON.parse(readText("vercel.json")) as {
      crons?: Array<{ path: string; schedule: string }>;
    };
    const digestCron = config.crons?.find((cron) => cron.path === "/api/digest");

    expect(digestCron?.schedule).toBe("0 * * * *");
  });

  it("runs production build in CI before the existing E2E gate", () => {
    const workflow = readText(".github/workflows/ci.yml");

    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npx tsc --noEmit");
    expect(workflow).toContain("npm run build");
    expect(workflow.indexOf("npm run build")).toBeGreaterThan(workflow.indexOf("npx tsc --noEmit"));
    expect(workflow).toContain("npm test");
  });

  it("documents the runtime Node version required by Next", () => {
    const pkg = JSON.parse(readText("package.json")) as { engines?: { node?: string } };
    const readme = readText("README.md");

    expect(pkg.engines?.node).toBe(">=20.9.0");
    expect(readme).toContain("Requires Node.js 20.9.0 or newer.");
  });

  it("documents Sentry runtime and source map env vars", () => {
    const envExample = readText(".env.example");
    const readme = readText("README.md");

    for (const key of ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_ORG", "SENTRY_PROJECT", "SENTRY_AUTH_TOKEN"]) {
      expect(envExample).toContain(key);
      expect(readme).toContain(key);
    }
  });
});

describe("Phase 8 health and readiness endpoints", () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it("/api/health is cheap and public-safe", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: "ok", service: "novyx-vault" });
  });

  it("/api/ready reports ready for local development without requiring cloud secrets", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.STORAGE_MODE;
    const { GET } = await import("@/app/api/ready/route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.mode).toBe("local");
    expect(body.missing).toEqual([]);
  });

  it("/api/ready reports missing production cloud config without exposing values", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.STORAGE_MODE = "supabase";
    for (const key of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "PROVIDER_KEY_SECRET",
      "NOVYX_ADMIN_KEY",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]) {
      delete process.env[key];
    }
    const { GET } = await import("@/app/api/ready/route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("not_ready");
    expect(body.mode).toBe("cloud");
    expect(body.missing).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "PROVIDER_KEY_SECRET",
      "NOVYX_ADMIN_KEY",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]);
    expect(JSON.stringify(body)).not.toContain("secret-value");
  });

  it("proxy allows health and readiness routes through cloud auth", () => {
    const proxySource = readText("proxy.ts");

    expect(proxySource).toContain('pathname.startsWith("/api/health")');
    expect(proxySource).toContain('pathname.startsWith("/api/ready")');
  });
});
