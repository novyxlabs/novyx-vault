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
  title: "Noctivault",
  description: "The only note app where AI gets smarter the longer you use it. Open-source, local-first knowledge base with persistent AI memory.",
  metadataBase: new URL("https://noctivault.vercel.app"),
  openGraph: {
    title: "Noctivault",
    description: "The only note app where AI gets smarter the longer you use it.",
    siteName: "Noctivault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noctivault",
    description: "The only note app where AI gets smarter the longer you use it.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* External script to prevent theme flash — allows removing 'unsafe-inline' from CSP script-src */}
        <script src="/theme-init.js" />
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
