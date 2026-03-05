"use client";

import {
  Brain, FileText, Wifi, WifiOff, Network, GitBranch, Github, ArrowRight,
  Sparkles, History, BarChart3, Key, Shield, Layers, Zap, BookOpen,
} from "lucide-react";
import HeroDemo from "./HeroDemo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary,#0a0a0b)] text-[var(--text-primary,#e4e4e7)] font-[var(--font-geist-sans),system-ui,sans-serif]">
      {/* Nav */}
      <nav aria-label="Main navigation" className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <span className="text-xl font-bold tracking-tight">Novyx Vault</span>
        <div className="flex items-center gap-4">
          <a href="/features" className="text-sm text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#e4e4e7)] transition-colors hidden sm:inline">
            Features
          </a>
          <a
            href="https://github.com/novyxlabs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
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

      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            The only note app where AI gets{" "}
            <span className="text-[var(--accent,#6366f1)]">smarter</span> the longer you use it
          </h1>
          <p className="text-lg sm:text-xl text-[var(--text-secondary,#a1a1aa)] max-w-2xl mx-auto mb-4">
            Novyx Vault is an open-source, local-first personal knowledge base with AI memory that
            evolves alongside your thinking. Write in markdown, link ideas with wiki-style connections,
            and let AI surface relationships you never knew existed.
          </p>
          <p className="text-base text-[var(--text-secondary,#a1a1aa)] max-w-2xl mx-auto mb-10">
            Your notes stay on your machine. Your AI remembers everything &mdash; across every
            conversation, every session, every idea.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent,#6366f1)] text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started Free
              <ArrowRight size={18} />
            </a>
            <a
              href="https://github.com/novyxlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--border,#27272a)] text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#e4e4e7)] hover:border-[var(--text-secondary,#a1a1aa)] transition-colors font-medium"
            >
              <Github size={18} />
              View on GitHub
            </a>
          </div>
          <div className="mt-16 px-2">
            <HeroDemo />
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            Everything you need to build a second brain
          </h2>
          <p className="text-center text-[var(--text-secondary,#a1a1aa)] mb-12 max-w-2xl mx-auto">
            Novyx Vault combines the power of AI with the simplicity of plain markdown files.
            No bloat, no lock-in &mdash; just the tools that matter.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Brain size={24} />}
              title="Persistent AI Memory"
              description="Unlike other AI note apps, Novyx Vault remembers your preferences, projects, and thinking patterns across every conversation. The more you use it, the more useful it becomes."
            />
            <FeatureCard
              icon={<WifiOff size={24} />}
              title="Local-First Privacy"
              description="Your notes live as plain markdown files on your machine. No data leaves your device unless you choose cloud sync. No vendor lock-in, no proprietary formats, ever."
            />
            <FeatureCard
              icon={<FileText size={24} />}
              title="Markdown Native"
              description="A powerful CodeMirror-based editor with live preview, wiki-links, backlinks, syntax highlighting, and a full toolbar. Write naturally in markdown with real-time rendering."
            />
            <FeatureCard
              icon={<Network size={24} />}
              title="Ghost Connections"
              description="AI automatically discovers hidden relationships between your notes &mdash; even without shared keywords or explicit links. Surface connections you never knew existed."
            />
            <FeatureCard
              icon={<GitBranch size={24} />}
              title="Knowledge Graph"
              description="Visualize your entire vault as an interactive, force-directed graph. See how your ideas connect and navigate your knowledge visually."
            />
            <FeatureCard
              icon={<Wifi size={24} />}
              title="Cloud Sync"
              description="Optionally sync with Supabase-powered cloud storage for cross-device access. Row-level security ensures only you can see your notes."
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--accent,#6366f1)]/10 text-[var(--accent,#6366f1)] flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Write and link</h3>
              <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
                Create notes in markdown. Use [[wiki-links]] to connect ideas. Organize with folders,
                tags, and daily notes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--accent,#6366f1)]/10 text-[var(--accent,#6366f1)] flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">AI connects the dots</h3>
              <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
                Ghost Connections surfaces related notes automatically. AI chat helps you summarize, brainstorm,
                and explore your knowledge with full vault context.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--accent,#6366f1)]/10 text-[var(--accent,#6366f1)] flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Memory grows with you</h3>
              <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
                Every note you save to memory makes your AI smarter. Cortex Insights reveals emerging
                themes. Entity extraction builds a semantic knowledge graph over time.
              </p>
            </div>
          </div>
        </section>

        {/* Novyx Differentiators */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            AI memory that actually persists
          </h2>
          <p className="text-center text-[var(--text-secondary,#a1a1aa)] mb-12 max-w-2xl mx-auto">
            Most AI assistants forget everything between sessions. Novyx Vault is built on the Novyx
            SDK, giving your AI a real, evolving memory that grows with your knowledge base.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <DiffCard
              icon={<History size={24} />}
              title="Memory Rollback"
              description="Made a mistake? Travel back through your AI's memory timeline. Undo accidental context, restore previous states, and see exactly how your AI's understanding has evolved."
            />
            <DiffCard
              icon={<Sparkles size={24} />}
              title="Cortex Insights"
              description="As your vault grows, AI generates emerging themes and patterns from your accumulated knowledge. Discover connections between projects, ideas, and research you hadn't noticed."
            />
            <DiffCard
              icon={<BarChart3 size={24} />}
              title="Entity Extraction"
              description="People, projects, concepts, and relationships are automatically extracted from your notes to build a growing semantic graph &mdash; a structured map of everything you know."
            />
          </div>
        </section>

        {/* Bring Your Own AI */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="p-8 rounded-2xl border border-[var(--border,#27272a)] bg-[var(--bg-secondary,#141417)]">
            <div className="flex items-center gap-3 mb-4">
              <Key size={24} className="text-[var(--accent,#6366f1)]" />
              <h2 className="text-2xl font-bold">Bring your own AI</h2>
            </div>
            <p className="text-[var(--text-secondary,#a1a1aa)] mb-6 max-w-xl">
              Novyx Vault works with the AI provider you already use. Connect your own API key and
              choose from over a dozen providers. Your keys stay in your browser &mdash; they never
              touch our servers.
            </p>
            <div className="flex flex-wrap gap-2">
              {["OpenAI", "Anthropic", "DeepSeek", "Ollama", "LM Studio", "Groq", "Together", "Mistral", "Gemini", "Cerebras", "Moonshot"].map((provider) => (
                <span
                  key={provider}
                  className="px-3 py-1 text-xs rounded-full border border-[var(--border,#27272a)] text-[var(--text-secondary,#a1a1aa)]"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Why Novyx Vault */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">
            Why Novyx Vault?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <Shield size={20} className="text-[var(--accent,#6366f1)] shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Privacy by default</h3>
                <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
                  Local-first means your data never leaves your machine unless you opt into cloud sync.
                  API keys are stored in your browser only. We never see your notes or AI conversations.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Layers size={20} className="text-[var(--accent,#6366f1)] shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">No vendor lock-in</h3>
                <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
                  Notes are plain markdown files. Export everything as a zip anytime. Switch AI providers
                  freely. Self-host the entire stack if you want.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Zap size={20} className="text-[var(--accent,#6366f1)] shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Fast and focused</h3>
                <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
                  No electron bloat. Built on Next.js with a native-feeling editor, keyboard shortcuts,
                  split view, focus mode, and a command palette for everything.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <BookOpen size={20} className="text-[var(--accent,#6366f1)] shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">AI that writes like you</h3>
                <p className="text-sm text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
                  Brain Dump converts raw thoughts into structured notes. Clip Remix rewrites content in
                  your personal voice. AI chat responds with full context of your vault.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Open Source CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="p-8 rounded-2xl border border-[var(--border,#27272a)] bg-[var(--bg-secondary,#141417)]">
            <Github size={32} className="mx-auto mb-4 text-[var(--text-secondary,#a1a1aa)]" />
            <h2 className="text-2xl font-bold mb-3">Open Source</h2>
            <p className="text-[var(--text-secondary,#a1a1aa)] mb-6 max-w-lg mx-auto">
              Novyx Vault is fully open source. Inspect every line of code, contribute features,
              report issues, or self-host your own instance. Built transparently by Novyx Labs.
            </p>
            <a
              href="https://github.com/novyxlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent,#6366f1)] text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Github size={18} />
              View on GitHub
            </a>
          </div>
        </section>
      </main>

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
          <nav aria-label="Footer" className="flex items-center gap-6 text-sm text-[var(--text-secondary,#a1a1aa)]">
            <a href="/features" className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors">
              Features
            </a>
            <a href="/terms" className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors">
              Privacy
            </a>
            <a
              href="https://github.com/novyxlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary,#e4e4e7)] transition-colors"
            >
              GitHub
            </a>
          </nav>
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
