"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleResend() {
    setResending(true);
    setMessage("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: user.email,
        });
        if (error) throw error;
        setMessage("Verification email resent. Check your inbox.");
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
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
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Noctivault
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary, #a1a1aa)",
            marginBottom: 24,
          }}
        >
          Verify your email
        </p>

        <div
          style={{
            padding: "20px 16px",
            borderRadius: 8,
            background: "var(--bg-primary, #0a0a0b)",
            border: "1px solid var(--border, #27272a)",
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 0 }}>
            We sent a confirmation link to your email.
            <br />
            Click it to activate your vault.
          </p>
        </div>

        {message && (
          <p
            style={{
              color: message.includes("resent") ? "#22c55e" : "#ef4444",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleResend}
          disabled={resending}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            background: "var(--accent, #6366f1)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: resending ? "not-allowed" : "pointer",
            opacity: resending ? 0.7 : 1,
            marginBottom: 12,
          }}
        >
          {resending ? "Sending..." : "Resend Verification Email"}
        </button>

        <button
          onClick={handleSignOut}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary, #a1a1aa)",
            cursor: "pointer",
            fontSize: 13,
            textDecoration: "underline",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
