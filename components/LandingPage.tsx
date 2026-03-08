"use client";

import {
  Brain, FileText, Wifi, WifiOff, Network, GitBranch, Github, ArrowRight,
  Sparkles, History, BarChart3, Key, Shield, Layers, Zap, BookOpen,
} from "lucide-react";
import HeroDemo from "./HeroDemo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav aria-label="Main navigation" className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <span className="text-xl font-bold tracking-tight">Novyx Vault</span>
        <div className="flex items-center gap-4">
          <a href="/features" className="text-sm text-muted hover:text-foreground transition-colors hidden sm:inline">Features</a>
          <a href="https://novyx.ai" target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-foreground transition-colors hidden sm:inline">Novyx Core</a>
          <a
            href="https://github.com/novyxlabs"
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
            An open-source AI workspace with{" "}
            <span className="text-accent">persistent memory</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-4">
            Your notes, your AI&apos;s memory, and cryptographic proof that nothing was lost or changed.
            Built on{" "}
            <a href="https://novyx.ai" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Novyx Core
            </a>.
          </p>
          <p className="text-base text-muted max-w-2xl mx-auto mb-10">
            Use it as your AI-powered workspace, or install{" "}
            <code className="text-sm bg-card-bg px-1.5 py-0.5 rounded border border-sidebar-border">novyx-mcp</code>{" "}
            in Claude Desktop or Cursor and manage your agent&apos;s memories here when you upgrade to cloud.
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
              href="https://github.com/novyxlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-sidebar-border text-muted hover:text-foreground hover:border-[var(--text-secondary,#a1a1aa)] transition-colors font-medium"
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
            Where human thinking meets agent memory
          </h2>
          <p className="text-center text-muted mb-12 max-w-2xl mx-auto">
            One workspace for your notes and your AI&apos;s context. Markdown files, persistent memory,
            and a verifiable audit trail &mdash; no black boxes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Brain size={24} />}
              title="Persistent AI Memory"
              description="Your AI remembers across sessions, tools, and conversations. Memories created via MCP, API, or the Vault UI all live in one place — searchable, auditable, and yours."
            />
            <FeatureCard
              icon={<Shield size={24} />}
              title="Cryptographic Audit Trail"
              description="Every memory operation is hash-chained. See exactly what was stored, recalled, or deleted — with cryptographic proof the chain is intact. Nothing lost, nothing changed."
            />
            <FeatureCard
              icon={<FileText size={24} />}
              title="Markdown Workspace"
              description="A CodeMirror-based editor with live preview, wiki-links, backlinks, and syntax highlighting. Your notes are plain markdown files — no vendor lock-in, no proprietary formats."
            />
            <FeatureCard
              icon={<Network size={24} />}
              title="Ghost Connections"
              description="AI discovers hidden relationships between your notes — even without shared keywords or explicit links. Surface connections you never knew existed."
            />
            <FeatureCard
              icon={<History size={24} />}
              title="Memory Rollback"
              description="Made a mistake? Roll back your AI's memory to any point in time. See exactly what changed, how many memories were affected, and restore previous states."
            />
            <FeatureCard
              icon={<Key size={24} />}
              title="Bring Your Own AI"
              description="Works with 18+ providers — OpenAI, Anthropic, Gemini, Ollama, and more. Your API keys stay in your browser. Switch providers anytime."
            />
          </div>
        </section>

        {/* Two paths */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">
            Two ways in, one workspace
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4 text-sm font-bold">
                A
              </div>
              <h3 className="font-semibold mb-2">Start with Vault</h3>
              <p className="text-sm text-muted leading-relaxed mb-3">
                Sign up, write notes in markdown, and add an AI provider. Your AI gets persistent memory
                powered by Novyx &mdash; it remembers your projects, preferences, and thinking patterns
                across every session.
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Best for: developers who want an AI-first notes app that actually remembers them.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4 text-sm font-bold">
                B
              </div>
              <h3 className="font-semibold mb-2">Start with MCP</h3>
              <p className="text-sm text-muted leading-relaxed mb-3">
                Install <code className="text-xs bg-background px-1 py-0.5 rounded border border-sidebar-border">novyx-mcp</code> in
                Claude Desktop or Cursor. Your agent gets local memory via SQLite. When you upgrade to cloud,
                open Vault to see, search, and manage those memories alongside your notes.
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Best for: developers already using AI coding agents who want their agent to remember context.
              </p>
            </div>
          </div>
        </section>

        {/* Trust & Proof */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            Trust through transparency
          </h2>
          <p className="text-center text-muted mb-12 max-w-2xl mx-auto">
            Most AI tools are black boxes. Novyx Vault gives you a verifiable record of every memory
            operation &mdash; with hash-chained proof, usage dashboards, and full rollback history.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <DiffCard
              icon={<Shield size={24} />}
              title="Hash-Chained Audit"
              description="Every store, recall, and delete is logged with a SHA-256 hash linked to the previous entry. Verify chain integrity anytime. Tamper-evident by design."
            />
            <DiffCard
              icon={<History size={24} />}
              title="Rollback History"
              description="See exactly what changed and when. Roll back to any point in time, with counts of memories restored and removed. Full timeline grouped by day."
            />
            <DiffCard
              icon={<BarChart3 size={24} />}
              title="Usage Dashboard"
              description="Monitor memory counts, API usage, spend estimates, and pressure levels in real time. Know exactly where you stand against plan limits."
            />
          </div>
        </section>

        {/* Bring Your Own AI */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="p-8 rounded-2xl border border-sidebar-border bg-card-bg">
            <div className="flex items-center gap-3 mb-4">
              <Key size={24} className="text-accent" />
              <h2 className="text-2xl font-bold">Bring your own AI</h2>
            </div>
            <p className="text-muted mb-6 max-w-xl">
              Novyx Vault works with the AI provider you already use. Connect your own API key and
              choose from over a dozen providers. Your keys stay in your browser &mdash; they never
              touch our servers.
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

        {/* Why Novyx Vault */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">
            Why Novyx Vault?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <Shield size={20} className="text-accent shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Privacy by default</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Local-first means your data never leaves your machine unless you opt into cloud sync.
                  API keys are stored in your browser only. We never see your notes or AI conversations.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Layers size={20} className="text-accent shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">No vendor lock-in</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Notes are plain markdown. Memories are portable via the Novyx API. Export everything
                  anytime. Self-host the entire stack if you want.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Zap size={20} className="text-accent shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">MCP-native</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Install novyx-mcp in any MCP-compatible tool. Memories sync to Vault automatically.
                  One API key connects your agent&apos;s context to your personal workspace.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <BookOpen size={20} className="text-accent shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">AI writing tools</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Brain Dump converts raw thoughts into structured notes. Clip Remix rewrites content in
                  your voice. AI chat responds with full context of your vault and memory.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Open Source CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="p-8 rounded-2xl border border-sidebar-border bg-card-bg">
            <Github size={32} className="mx-auto mb-4 text-muted" />
            <h2 className="text-2xl font-bold mb-3">Open Source</h2>
            <p className="text-muted mb-6 max-w-lg mx-auto">
              Novyx Vault is fully open source. Inspect every line of code, contribute features,
              report issues, or self-host your own instance. Built transparently by Novyx Labs.
            </p>
            <a
              href="https://github.com/novyxlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Github size={18} />
              View on GitHub
            </a>
          </div>
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
              href="https://github.com/novyxlabs"
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
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function DiffCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg">
      <div className="text-accent mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}
