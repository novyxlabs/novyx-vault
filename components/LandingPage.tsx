"use client";

import { Brain, FileText, Wifi, WifiOff, Network, GitBranch, Github, ArrowRight, Sparkles, History, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary,#0a0a0b)] text-[var(--text-primary,#e4e4e7)] font-[var(--font-geist-sans),system-ui,sans-serif]">
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <span className="text-xl font-bold tracking-tight">Noctivault</span>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/novyxlabs/noctivault"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#e4e4e7)] transition-colors"
          >
            <Github size={20} />
          </a>
          <a
            href="/login"
            className="px-4 py-2 rounded-lg bg-[var(--accent,#6366f1)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          The only note app where AI gets{" "}
          <span className="text-[var(--accent,#6366f1)]">smarter</span> the longer you use it
        </h1>
        <p className="text-lg sm:text-xl text-[var(--text-secondary,#a1a1aa)] max-w-2xl mx-auto mb-10">
          Noctivault is an open-source, local-first knowledge base with persistent AI memory.
          Your notes stay on your machine. Your AI remembers everything.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent,#6366f1)] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started Free
            <ArrowRight size={18} />
          </a>
          <a
            href="https://github.com/novyxlabs/noctivault"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--border,#27272a)] text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#e4e4e7)] hover:border-[var(--text-secondary,#a1a1aa)] transition-colors font-medium"
          >
            <Github size={18} />
            View Source
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">
          Everything you need, nothing you don&apos;t
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Brain size={24} />}
            title="Persistent Memory"
            description="AI remembers your preferences, projects, and patterns across every conversation."
          />
          <FeatureCard
            icon={<WifiOff size={24} />}
            title="Local-First"
            description="Your notes live as plain markdown files on your machine. No vendor lock-in, ever."
          />
          <FeatureCard
            icon={<FileText size={24} />}
            title="Markdown Native"
            description="Full markdown support with wiki-links, backlinks, and a powerful editor."
          />
          <FeatureCard
            icon={<Network size={24} />}
            title="Ghost Connections"
            description="AI discovers hidden connections between your notes you never knew existed."
          />
          <FeatureCard
            icon={<GitBranch size={24} />}
            title="Knowledge Graph"
            description="Visualize your entire vault as an interactive force-directed graph."
          />
          <FeatureCard
            icon={<Wifi size={24} />}
            title="Cloud Sync"
            description="Optional Supabase-powered cloud storage for access from any device."
          />
        </div>
      </section>

      {/* Novyx Differentiators */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-4">
          Powered by Novyx
        </h2>
        <p className="text-center text-[var(--text-secondary,#a1a1aa)] mb-12 max-w-2xl mx-auto">
          AI memory that actually persists. Noctivault uses the Novyx SDK to give your AI assistant a real, evolving memory.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <DiffCard
            icon={<History size={24} />}
            title="Memory Rollback"
            description="Travel back through your AI's memory timeline. Undo accidental context and restore previous states."
          />
          <DiffCard
            icon={<Sparkles size={24} />}
            title="Cortex Insights"
            description="AI generates emerging themes and patterns from your accumulated knowledge over time."
          />
          <DiffCard
            icon={<BarChart3 size={24} />}
            title="Entity Extraction"
            description="Entities and relationships extracted from your notes build a growing semantic graph."
          />
        </div>
      </section>

      {/* Open Source CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="p-8 rounded-2xl border border-[var(--border,#27272a)] bg-[var(--bg-secondary,#141417)]">
          <Github size={32} className="mx-auto mb-4 text-[var(--text-secondary,#a1a1aa)]" />
          <h2 className="text-2xl font-bold mb-3">Open Source</h2>
          <p className="text-[var(--text-secondary,#a1a1aa)] mb-6 max-w-lg mx-auto">
            Noctivault is fully open source. Inspect the code, contribute features, or self-host your own instance.
          </p>
          <a
            href="https://github.com/novyxlabs/noctivault"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent,#6366f1)] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Github size={18} />
            Star on GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border,#27272a)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-secondary,#a1a1aa)]">
            Built by{" "}
            <a
              href="https://novyxlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-primary,#e4e4e7)] hover:text-[var(--accent,#6366f1)] transition-colors"
            >
              Novyx Labs
            </a>
          </p>
          <div className="flex items-center gap-6 text-sm text-[var(--text-secondary,#a1a1aa)]">
            <a
              href="/terms"
              className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors"
            >
              Terms
            </a>
            <a
              href="/privacy"
              className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors"
            >
              Privacy
            </a>
            <a
              href="https://github.com/novyxlabs/noctivault"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://novyxlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors"
            >
              Novyx Labs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-[var(--border,#27272a)] bg-[var(--bg-secondary,#141417)] hover:border-[var(--text-secondary,#a1a1aa)] transition-colors">
      <div className="text-[var(--accent,#6366f1)] mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">{description}</p>
    </div>
  );
}

function DiffCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-[var(--border,#27272a)] bg-[var(--bg-secondary,#141417)]">
      <div className="text-[var(--accent,#6366f1)] mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">{description}</p>
    </div>
  );
}
