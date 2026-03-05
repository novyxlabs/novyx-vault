import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Novyx Vault — AI-powered knowledge base with persistent memory";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#e4e4e7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            V
          </div>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Novyx Vault
          </h1>
          <p
            style={{
              fontSize: 28,
              color: "#a1a1aa",
              margin: 0,
              maxWidth: 700,
              textAlign: "center",
            }}
          >
            The only note app where AI gets smarter the longer you use it
          </p>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 18,
            color: "#71717a",
          }}
        >
          <span>Built by Novyx Labs</span>
          <span style={{ color: "#3f3f46" }}>|</span>
          <span>Open Source</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
