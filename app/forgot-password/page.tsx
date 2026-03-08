"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?type=recovery`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
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
          Reset your password
        </p>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div
              className="bg-background border border-sidebar-border"
              style={{
                padding: "20px 16px",
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 0 }}>
                Check your email for a password reset link.
              </p>
            </div>
            <a
              href="/login"
              className="text-accent"
              style={{
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background text-foreground border border-sidebar-border"
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 16,
                borderRadius: 8,
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
                marginBottom: 16,
              }}
            >
              {loading ? "..." : "Send Reset Link"}
            </button>

            <p
              className="text-muted"
              style={{
                textAlign: "center",
                fontSize: 13,
              }}
            >
              <a
                href="/login"
                className="text-accent"
                style={{
                  textDecoration: "none",
                }}
              >
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
