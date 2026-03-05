import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://vault.novyxlabs.com", lastModified: new Date(), priority: 1 },
    { url: "https://vault.novyxlabs.com/login", lastModified: new Date(), priority: 0.8 },
    { url: "https://vault.novyxlabs.com/terms", lastModified: new Date(), priority: 0.3 },
    { url: "https://vault.novyxlabs.com/privacy", lastModified: new Date(), priority: 0.3 },
  ];
}
