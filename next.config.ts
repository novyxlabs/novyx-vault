import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  ...(process.env.TAURI === "1" && { output: "standalone" }),
};

export default nextConfig;
