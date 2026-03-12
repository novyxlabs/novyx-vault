"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  function getSupabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async function handleResend() {
    setResending(true);
    setMessage("");
    try {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (user?.email) {
        const { error } = await getSupabase().auth.resend({
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
    await getSupabase().auth.signOut();
    window.location.href = "/login";
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
          Novyx Vault
        </h1>
        <p
          className="text-muted"
          style={{
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          Verify your email
        </p>

        <div
          className="bg-background border border-sidebar-border"
          style={{
            padding: "20px 16px",
            borderRadius: 8,
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
          className="bg-accent"
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
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
          className="text-muted"
          style={{
            background: "none",
            border: "none",
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
