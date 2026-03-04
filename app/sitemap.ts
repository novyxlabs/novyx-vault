import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://noctivault.vercel.app", lastModified: new Date(), priority: 1 },
    { url: "https://noctivault.vercel.app/login", lastModified: new Date(), priority: 0.8 },
    { url: "https://noctivault.vercel.app/terms", lastModified: new Date(), priority: 0.3 },
    { url: "https://noctivault.vercel.app/privacy", lastModified: new Date(), priority: 0.3 },
  ];
}
