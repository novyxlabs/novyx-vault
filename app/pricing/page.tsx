import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free markdown notes, AI memory, and knowledge graph. Upgrade to Pro for persistent memory, Ghost Connections, cortex insights, and more.",
  alternates: { canonical: "/pricing" },
};

const free = [
  "Markdown notes with live preview",
  "Wiki-links & backlinks",
  "Knowledge graph",
  "20+ AI providers (BYOK)",
  "Desktop app (offline, local files)",
  "Community support",
];

const pro = [
  "Everything in Free",
  "Persistent AI Memory (unlimited)",
  "Ghost Connections (AI-discovered links)",
  "Memory Timeline & Rollback",
  "Cortex Insights & Entity Extraction",
  "Audit Trail with chain verification",
  "Voice Capture & Transcription",
  "Daily Digest Emails",
  "Cloud Sync & Sharing",
  "Priority support",
];

const enterprise = [
  "Everything in Pro",
  "Self-hosted deployment",
  "SSO / SAML",
  "Custom memory retention",
  "Dedicated support",
  "SLA",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav aria-label="Main navigation" className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
          Novyx Vault
        </Link>
        <a
          href="/login"
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Get Started
        </a>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Pricing
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Free to start. Upgrade when your vault needs a memory.
          </p>
        </section>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Free */}
          <div className="rounded-xl border border-sidebar-border bg-card-bg p-6 flex flex-col">
            <h2 className="text-lg font-bold mb-1">Free</h2>
            <p className="text-3xl font-bold mb-1">$0</p>
            <p className="text-sm text-muted mb-6">Forever</p>
            <ul className="space-y-3 mb-8 flex-1">
              {free.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted">
                  <Check size={16} className="text-accent mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="/login"
              className="block text-center px-4 py-2.5 rounded-lg border border-sidebar-border text-sm font-semibold hover:bg-sidebar-border/20 transition-colors"
            >
              Get Started Free
            </a>
          </div>

          {/* Pro — featured */}
          <div className="rounded-xl border-2 border-accent bg-card-bg p-6 flex flex-col md:scale-105 md:shadow-lg md:shadow-accent/10 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-accent text-white px-3 py-0.5 rounded-full">
              Most Popular
            </span>
            <h2 className="text-lg font-bold mb-1">Pro</h2>
            <p className="text-3xl font-bold mb-1">
              $9<span className="text-base font-normal text-muted">/mo</span>
            </p>
            <p className="text-sm text-muted mb-6">Billed monthly</p>
            <ul className="space-y-3 mb-8 flex-1">
              {pro.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted">
                  <Check size={16} className="text-accent mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="/login"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </a>
          </div>

          {/* Enterprise */}
          <div className="rounded-xl border border-sidebar-border bg-card-bg p-6 flex flex-col">
            <h2 className="text-lg font-bold mb-1">Enterprise</h2>
            <p className="text-3xl font-bold mb-1">Custom</p>
            <p className="text-sm text-muted mb-6">Contact us</p>
            <ul className="space-y-3 mb-8 flex-1">
              {enterprise.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted">
                  <Check size={16} className="text-accent mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="mailto:blake@novyxlabs.com"
              className="block text-center px-4 py-2.5 rounded-lg border border-sidebar-border text-sm font-semibold hover:bg-sidebar-border/20 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-sidebar-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            Built by{" "}
            <a href="https://novyxlabs.com" target="_blank" rel="noopener noreferrer"
              className="text-foreground hover:text-accent transition-colors">
              Novyx Labs
            </a>
          </p>
          <nav aria-label="Footer" className="flex items-center gap-6 text-sm text-muted flex-wrap">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link href="/compare/obsidian" className="hover:text-foreground transition-colors">vs Obsidian</Link>
            <Link href="/compare/notion" className="hover:text-foreground transition-colors">vs Notion</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
