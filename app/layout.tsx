import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Novyx Vault — AI-Powered Notes with Memory That Learns",
    template: "%s | Novyx Vault",
  },
  description:
    "The only note app where AI gets smarter the longer you use it. Open-source, local-first knowledge base with persistent AI memory.",
  metadataBase: new URL("https://vault.novyxlabs.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Novyx Vault — AI-Powered Notes with Memory That Learns",
    description:
      "The only note app where AI gets smarter the longer you use it.",
    siteName: "Novyx Vault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Novyx Vault — AI-Powered Notes with Memory That Learns",
    description:
      "The only note app where AI gets smarter the longer you use it.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Novyx Vault",
      description:
        "AI-powered personal knowledge base with persistent memory that learns your thinking patterns.",
      url: "https://vault.novyxlabs.com",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web, macOS, Windows, Linux",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: {
        "@type": "Organization",
        name: "Novyx Labs",
        url: "https://novyxlabs.com",
      },
      featureList: [
        "Persistent AI memory across sessions",
        "Wiki-style note linking with backlinks",
        "Interactive knowledge graph",
        "Multi-provider AI (OpenAI, Anthropic, Ollama, 10+)",
        "Local-first with optional cloud sync",
        "Memory rollback and timeline",
        "Ghost Connections — AI-discovered note relationships",
      ],
    },
    {
      "@type": "Organization",
      name: "Novyx Labs",
      url: "https://novyxlabs.com",
      logo: "https://vault.novyxlabs.com/icon-512.png",
      sameAs: ["https://github.com/novyxlabs"],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* External script to prevent theme flash */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
