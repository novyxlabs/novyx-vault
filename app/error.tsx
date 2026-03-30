"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0b",
        color: "#e4e4e7",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 8, color: "#ef4444" }}>
          Oops
        </h1>
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Something went wrong
        </p>
        <p style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 24 }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            background: "#6366f1",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
