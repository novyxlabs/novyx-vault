import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Novyx Vault",
    short_name: "Vault",
    description:
      "AI-powered personal knowledge base with persistent memory that learns your thinking patterns.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#8b5cf6",
    icons: [
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "128x128", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
