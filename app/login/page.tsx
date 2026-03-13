"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 6, label: "At least 6 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });

  function getSupabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error");
    if (urlError === "verification_failed") {
      setError("Email verification failed or link expired. Please try again.");
    }
    const errorDesc = params.get("error_description");
    if (errorDesc) {
      setError(errorDesc);
    }
  }, []);

  const emailError = touched.email
    ? !email.trim()
      ? "Email is required"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Please enter a valid email"
        : ""
    : "";
  const passwordError = touched.password && !password ? "Password is required" : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validate
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
      setTouched({ email: true, password: true });
      return;
    }

    if (mode === "signup" && !PASSWORD_RULES.every((rule) => rule.test(password))) {
      setTouched({ email: true, password: true });
      setError("Password does not meet requirements");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await getSupabase().auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Provision Novyx key (fire-and-forget, idempotent)
        fetch("/api/auth/provision", { method: "POST" }).catch(() => {});
        window.location.href = "/";
      } else {
        const { error } = await getSupabase().auth.signUp({
          email,
          password,
        });
        if (error) {
          if (error.message?.includes("already registered")) {
            throw new Error(
              "An account with this email already exists. Try signing in, or use the OAuth provider you originally signed up with."
            );
          }
          throw error;
        }
        // Provision Novyx key (fire-and-forget, idempotent)
        fetch("/api/auth/provision", { method: "POST" }).catch(() => {});
        setMessage("Check your email to confirm your account.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setError("");
    setLoading(true);
    try {
      const { data, error } = await getSupabase().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // If no redirect URL was returned, the provider may not be configured
      if (!data?.url) {
        setError(
          `${provider === "github" ? "GitHub" : "Google"} login is not configured. Please contact support.`
        );
        setLoading(false);
      }
    } catch {
      setError("OAuth sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="bg-background text-foreground font-sans"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="bg-card-bg border border-sidebar-border"
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 32,
          borderRadius: 12,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            textAlign: "center",
          }}
        >
          Novyx Vault
        </h1>
        <p
          className="text-muted"
          style={{
            fontSize: 14,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          {mode === "login" ? "Sign in to your vault" : "Create your vault"}
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="text-foreground border border-sidebar-border"
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              background: "transparent",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <GoogleIcon />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            disabled={loading}
            className="text-foreground border border-sidebar-border"
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              background: "transparent",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <GitHubIcon />
            GitHub
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            className="bg-sidebar-border"
            style={{
              flex: 1,
              height: 1,
            }}
          />
          <span
            className="text-muted"
            style={{ fontSize: 12 }}
          >
            or
          </span>
          <div
            className="bg-sidebar-border"
            style={{
              flex: 1,
              height: 1,
            }}
          />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 12 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className="bg-background text-foreground"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${emailError ? "#ef4444" : "var(--sidebar-border, #27272a)"}`,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {emailError && (
              <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                {emailError}
              </p>
            )}
          </div>
          <div style={{ marginBottom: mode === "signup" ? 4 : 16, position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              className="bg-background text-foreground"
              style={{
                width: "100%",
                padding: "10px 40px 10px 12px",
                borderRadius: 8,
                border: `1px solid ${passwordError ? "#ef4444" : "var(--sidebar-border, #27272a)"}`,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-muted"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                fontSize: 12,
                lineHeight: 1,
              }}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
            {passwordError && (
              <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                {passwordError}
              </p>
            )}
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 12, marginTop: 8 }}>
              {PASSWORD_RULES.map((rule) => {
                const passed = password.length > 0 && rule.test(password);
                return (
                  <div
                    key={rule.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: passed ? "#22c55e" : touched.password && password.length > 0 && !rule.test(password) ? "#ef4444" : "var(--muted, #a1a1aa)",
                      marginBottom: 2,
                      transition: "color 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{passed ? "\u2713" : "\u2022"}</span>
                    {rule.label}
                  </div>
                );
              })}
            </div>
          )}

          {mode === "login" && (
            <div style={{ textAlign: "right", marginBottom: 12, marginTop: -8 }}>
              <a
                href="/forgot-password"
                className="text-accent"
                style={{
                  fontSize: 12,
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </a>
            </div>
          )}

          {error && (
            <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>
              {error}
            </p>
          )}
          {message && (
            <p style={{ color: "#22c55e", fontSize: 13, marginBottom: 12 }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-accent"
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <p
          className="text-muted"
          style={{
            marginTop: 16,
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {mode === "login" ? "No account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setMessage("");
              setTouched({ email: false, password: false });
            }}
            className="text-accent"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 13,
            }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>

        <div
          className="border-t border-sidebar-border text-muted"
          style={{
            marginTop: 20,
            paddingTop: 16,
            display: "flex",
            justifyContent: "center",
            gap: 16,
            fontSize: 12,
          }}
        >
          <a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>
            Terms
          </a>
          <a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
}
