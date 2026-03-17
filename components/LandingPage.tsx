"use client";

import {
  Brain, FileText, Network, Github, ArrowRight,
  Sparkles, History, Key, Search, PenTool, Link2, FolderTree,
  Download,
} from "lucide-react";
import HeroDemo from "./HeroDemo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav aria-label="Main navigation" className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <span className="text-xl font-bold tracking-tight">Novyx Vault</span>
        <div className="flex items-center gap-4">
          <a href="/features" className="text-sm text-muted hover:text-foreground transition-colors">Features</a>
          <a
            href="https://github.com/novyxlabs/novyx-vault"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-muted hover:text-foreground transition-colors"
          >
            <Github size={20} />
          </a>
          <a
            href="/login"
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In
          </a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            A notes app where your AI{" "}
            <span className="text-accent">actually remembers you</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10">
            Markdown notes, wiki-links, and a knowledge graph &mdash; like Obsidian.
            But with an AI assistant that learns your projects, your writing style, and your ideas over time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started Free
              <ArrowRight size={18} />
            </a>
            <a
              href="/features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-sidebar-border text-muted hover:text-foreground hover:border-[var(--text-secondary,#a1a1aa)] transition-colors font-medium"
            >
              See All Features
            </a>
          </div>
          <div className="mt-16 px-2">
            <HeroDemo />
          </div>
        </section>

        {/* The problem */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-lg text-muted leading-relaxed">
            Every AI assistant starts from zero. Every conversation.
            You explain your project again. You repeat your preferences.
            You lose context the moment you close the tab.
          </p>
          <p className="text-lg text-foreground font-medium mt-6">
            Novyx Vault fixes that.
          </p>
        </section>

        {/* Core experience — what you get */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            Everything you&apos;d expect from a great notes app
          </h2>
          <p className="text-center text-muted mb-12 max-w-2xl mx-auto">
            Plain markdown, wiki-links, backlinks, a knowledge graph, and a fast editor.
            If you&apos;ve used Obsidian, you&apos;ll feel at home.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileText size={24} />}
              title="Markdown Editor"
              description="A fast editor with live preview, syntax highlighting, and keyboard shortcuts. Your notes are plain markdown — no proprietary formats, no lock-in."
            />
            <FeatureCard
              icon={<Link2 size={24} />}
              title="Wiki-Links & Backlinks"
              description="Connect ideas with [[wiki-links]]. Every link is bidirectional — backlinks appear automatically. Build a web of knowledge as you write."
            />
            <FeatureCard
              icon={<Network size={24} />}
              title="Knowledge Graph"
              description="See your vault as an interactive graph. Zoom, pan, and click to explore how your notes connect. Spot clusters, orphans, and patterns at a glance."
            />
            <FeatureCard
              icon={<FolderTree size={24} />}
              title="Folders, Tags & Search"
              description="Organize however you think — nested folders, inline tags, or full-text search. Pin favorites, drag to reorder, and filter instantly."
            />
            <FeatureCard
              icon={<Key size={24} />}
              title="Bring Your Own AI"
              description="Works with 18+ providers — OpenAI, Anthropic, Gemini, Ollama, and more. Your API keys stay in your browser. Switch providers anytime."
            />
            <FeatureCard
              icon={<Download size={24} />}
              title="Local-First & Open Source"
              description="Desktop app stores files on your machine. Cloud mode syncs across devices. Export everything anytime. Fully open source — inspect every line."
            />
          </div>
        </section>

        {/* The differentiator — AI Memory */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            Now add AI that <span className="text-accent">never forgets</span>
          </h2>
          <p className="text-center text-muted mb-12 max-w-2xl mx-auto">
            This is what makes Novyx Vault different. Your AI builds persistent memory
            from your notes and conversations. The longer you use it, the more useful it becomes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <Brain size={24} className="text-accent mb-3" />
              <h3 className="text-lg font-semibold mb-2">Persistent Memory</h3>
              <p className="text-sm text-muted leading-relaxed">
                Your AI remembers your projects, preferences, and thinking patterns across every session.
                Ask about something from last month and it responds with full context.
                No more re-explaining yourself.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <Sparkles size={24} className="text-accent mb-3" />
              <h3 className="text-lg font-semibold mb-2">Ghost Connections</h3>
              <p className="text-sm text-muted leading-relaxed">
                AI discovers hidden relationships between your notes &mdash; even without shared keywords
                or explicit links. Surface connections you never knew existed and see your ideas from a new angle.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <History size={24} className="text-accent mb-3" />
              <h3 className="text-lg font-semibold mb-2">Memory Timeline & Rollback</h3>
              <p className="text-sm text-muted leading-relaxed">
                See exactly what your AI remembers and when it learned it. Made a mistake?
                Roll back to any point in time. You&apos;re always in control of what your AI knows.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <PenTool size={24} className="text-accent mb-3" />
              <h3 className="text-lg font-semibold mb-2">Writing Tools</h3>
              <p className="text-sm text-muted leading-relaxed">
                Brain Dump turns raw thoughts into structured notes. Clip Remix rewrites web content in
                your voice. Slash commands give you inline AI help. Weekly Review summarizes your writing activity.
              </p>
            </div>
          </div>
        </section>

        {/* How it compares */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">
            How it compares
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sidebar-border">
                  <th className="text-left py-3 pr-4 font-medium text-muted" />
                  <th className="text-center py-3 px-4 font-semibold text-accent">Novyx Vault</th>
                  <th className="text-center py-3 px-4 font-medium text-muted">Obsidian</th>
                  <th className="text-center py-3 px-4 font-medium text-muted">Notion</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr className="border-b border-sidebar-border/50">
                  <td className="py-3 pr-4">Markdown files</td>
                  <td className="text-center py-3 px-4 text-accent">Yes</td>
                  <td className="text-center py-3 px-4">Yes</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                </tr>
                <tr className="border-b border-sidebar-border/50">
                  <td className="py-3 pr-4">Wiki-links & backlinks</td>
                  <td className="text-center py-3 px-4 text-accent">Yes</td>
                  <td className="text-center py-3 px-4">Yes</td>
                  <td className="text-center py-3 px-4 text-muted/50">Limited</td>
                </tr>
                <tr className="border-b border-sidebar-border/50">
                  <td className="py-3 pr-4">Knowledge graph</td>
                  <td className="text-center py-3 px-4 text-accent">Yes</td>
                  <td className="text-center py-3 px-4">Plugin</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                </tr>
                <tr className="border-b border-sidebar-border/50">
                  <td className="py-3 pr-4">AI with persistent memory</td>
                  <td className="text-center py-3 px-4 text-accent">Built in</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                </tr>
                <tr className="border-b border-sidebar-border/50">
                  <td className="py-3 pr-4">AI-discovered connections</td>
                  <td className="text-center py-3 px-4 text-accent">Built in</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                </tr>
                <tr className="border-b border-sidebar-border/50">
                  <td className="py-3 pr-4">Memory rollback & audit</td>
                  <td className="text-center py-3 px-4 text-accent">Built in</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                </tr>
                <tr className="border-b border-sidebar-border/50">
                  <td className="py-3 pr-4">Bring your own AI provider</td>
                  <td className="text-center py-3 px-4 text-accent">18+</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Open source</td>
                  <td className="text-center py-3 px-4 text-accent">Yes</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                  <td className="text-center py-3 px-4 text-muted/50">No</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Providers */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="p-8 rounded-2xl border border-sidebar-border bg-card-bg">
            <div className="flex items-center gap-3 mb-4">
              <Key size={24} className="text-accent" />
              <h2 className="text-2xl font-bold">Works with the AI you already use</h2>
            </div>
            <p className="text-muted mb-6 max-w-xl">
              Connect your own API key. Your keys stay in your browser &mdash; they never touch our servers.
              Switch providers anytime without losing your memory or notes.
            </p>
            <div className="flex flex-wrap gap-2">
              {["OpenAI", "Anthropic", "DeepSeek", "Ollama", "LM Studio", "Groq", "Together", "Mistral", "Gemini", "Cerebras", "Moonshot"].map((provider) => (
                <span
                  key={provider}
                  className="px-3 py-1 text-xs rounded-full border border-sidebar-border text-muted"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Desktop + Cloud */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">
            Use it your way
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <h3 className="text-lg font-semibold mb-2">Desktop App</h3>
              <p className="text-sm text-muted leading-relaxed mb-3">
                Free, private, offline. Your notes live as plain markdown files on your machine.
                No account needed. Works without internet.
              </p>
              <p className="text-xs text-muted/60">
                macOS, Windows, and Linux via Tauri.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <h3 className="text-lg font-semibold mb-2">Cloud</h3>
              <p className="text-sm text-muted leading-relaxed mb-3">
                Sync across devices, publish notes, share with a link, and get daily digest emails.
                Sign in with GitHub or Google.
              </p>
              <p className="text-xs text-muted/60">
                Free tier available. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* Open Source CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="p-8 rounded-2xl border border-sidebar-border bg-card-bg">
            <Github size={32} className="mx-auto mb-4 text-muted" />
            <h2 className="text-2xl font-bold mb-3">Open Source</h2>
            <p className="text-muted mb-6 max-w-lg mx-auto">
              Inspect every line of code, contribute features, or self-host your own instance.
              Your notes, your data, your rules.
            </p>
            <a
              href="https://github.com/novyxlabs/novyx-vault"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Github size={18} />
              View on GitHub
            </a>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to try it?
          </h2>
          <p className="text-muted mb-8">
            Free to use. No credit card. Takes 30 seconds.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-accent text-white text-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started Free
            <ArrowRight size={20} />
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-sidebar-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            Built by{" "}
            <a
              href="https://novyxlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-accent transition-colors"
            >
              Novyx Labs
            </a>
          </p>
          <nav aria-label="Footer" className="flex items-center gap-6 text-sm text-muted">
            <a href="/features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a
              href="https://github.com/novyxlabs/novyx-vault"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
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
    <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg hover:border-[var(--text-secondary,#a1a1aa)] transition-colors">
      <div className="text-accent mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}
