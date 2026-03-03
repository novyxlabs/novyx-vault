"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Provision Novyx key (fire-and-forget, idempotent)
        fetch("/api/auth/provision", { method: "POST" }).catch(() => {});
        window.location.href = "/";
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError(error.message);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary, #0a0a0b)",
        color: "var(--text-primary, #e4e4e7)",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 32,
          borderRadius: 12,
          background: "var(--bg-secondary, #141417)",
          border: "1px solid var(--border, #27272a)",
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
          Noctivault
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary, #a1a1aa)",
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
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              border: "1px solid var(--border, #27272a)",
              background: "transparent",
              color: "var(--text-primary, #e4e4e7)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              border: "1px solid var(--border, #27272a)",
              background: "transparent",
              color: "var(--text-primary, #e4e4e7)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
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
            style={{
              flex: 1,
              height: 1,
              background: "var(--border, #27272a)",
            }}
          />
          <span
            style={{ fontSize: 12, color: "var(--text-secondary, #a1a1aa)" }}
          >
            or
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--border, #27272a)",
            }}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: 12,
              borderRadius: 8,
              border: "1px solid var(--border, #27272a)",
              background: "var(--bg-primary, #0a0a0b)",
              color: "var(--text-primary, #e4e4e7)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: 16,
              borderRadius: 8,
              border: "1px solid var(--border, #27272a)",
              background: "var(--bg-primary, #0a0a0b)",
              color: "var(--text-primary, #e4e4e7)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

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
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: "var(--accent, #6366f1)",
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
          style={{
            marginTop: 16,
            fontSize: 13,
            textAlign: "center",
            color: "var(--text-secondary, #a1a1aa)",
          }}
        >
          {mode === "login" ? "No account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setMessage("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent, #6366f1)",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 13,
            }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
