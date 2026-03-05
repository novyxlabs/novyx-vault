import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights on AI-powered knowledge management, personal productivity, and building a second brain.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary,#0a0a0b)] text-[var(--text-primary,#e4e4e7)] font-[var(--font-geist-sans),system-ui,sans-serif]">
      <nav aria-label="Main navigation" className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
          Novyx Vault
        </Link>
        <a
          href="/login"
          className="px-4 py-2 rounded-lg bg-[var(--accent,#6366f1)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Get Started
        </a>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Blog</h1>
        <p className="text-lg text-[var(--text-secondary,#a1a1aa)] mb-8">
          We&apos;re working on articles about AI-powered knowledge management, personal
          productivity, and building a second brain. Check back soon.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--accent,#6366f1)] hover:opacity-80 transition-opacity"
        >
          &larr; Back to home
        </Link>
      </main>

      <footer className="border-t border-[var(--border,#27272a)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-secondary,#a1a1aa)]">
            Built by{" "}
            <a href="https://novyxlabs.com" target="_blank" rel="noopener noreferrer"
              className="text-[var(--text-primary,#e4e4e7)] hover:text-[var(--accent,#6366f1)] transition-colors">
              Novyx Labs
            </a>
          </p>
          <nav aria-label="Footer" className="flex items-center gap-6 text-sm text-[var(--text-secondary,#a1a1aa)]">
            <Link href="/features" className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors">Features</Link>
            <Link href="/terms" className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
