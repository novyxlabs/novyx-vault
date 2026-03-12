"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function getSupabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
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
          Set a new password
        </p>

        {success ? (
          <div
            className="bg-background border border-sidebar-border"
            style={{
              textAlign: "center",
              padding: "20px 16px",
              borderRadius: 8,
            }}
          >
            <p style={{ color: "#22c55e", fontSize: 14, marginBottom: 8 }}>
              Password updated successfully.
            </p>
            <p className="text-muted" style={{ fontSize: 13 }}>
              Redirecting to your vault...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-background text-foreground border border-sidebar-border"
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 12,
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
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
              }}
            >
              {loading ? "..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
