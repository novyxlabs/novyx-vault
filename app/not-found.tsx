import Link from "next/link";

export default function NotFound() {
  return (
    <div
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
        <h1 style={{ fontSize: 72, fontWeight: 700, marginBottom: 8, color: "#6366f1" }}>
          404
        </h1>
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Page not found
        </p>
        <p style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 24 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            borderRadius: 8,
            background: "#6366f1",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to Noctivault
        </Link>
      </div>
    </div>
  );
}
