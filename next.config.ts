import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const scriptSrc = [
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "",
  "https://plausible.io",
]
  .filter(Boolean)
  .join(" ");

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  ...(process.env.TAURI === "1" && { output: "standalone" }),
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(self), display-capture=(self), geolocation=()",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          scriptSrc,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://avatars.githubusercontent.com",
          "font-src 'self'",
          "connect-src 'self' https://*.supabase.co https://api.novyx.ai https://*.vercel-insights.com https://*.vercel-analytics.com https://plausible.io https://*.ingest.sentry.io https://huggingface.co https://*.huggingface.co https://cdn-lfs.huggingface.co https://*.hf.co",
          "worker-src 'self' blob:",
          "model-src 'self' https://huggingface.co https://*.huggingface.co https://cdn-lfs.huggingface.co https://*.hf.co",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self' https://*.supabase.co",
        ].join("; "),
      },
    ];

    return [
      {
        // Auth callback needs relaxed headers for OAuth redirects
        source: "/api/auth/callback",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
