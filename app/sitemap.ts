import type { MetadataRoute } from "next";

const lastModified = new Date("2026-03-23");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://vault.novyxlabs.com", lastModified, priority: 1 },
    { url: "https://vault.novyxlabs.com/features", lastModified, priority: 0.9 },
    { url: "https://vault.novyxlabs.com/login", lastModified, priority: 0.5 },
    { url: "https://vault.novyxlabs.com/terms", lastModified, priority: 0.3 },
    { url: "https://vault.novyxlabs.com/privacy", lastModified, priority: 0.3 },
  ];
}
