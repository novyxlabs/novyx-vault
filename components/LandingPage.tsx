"use client";

import {
  Brain, FileText, Network, Github, ArrowRight,
  Sparkles, History, Key, PenTool, Link2, FolderTree,
  Download, Mic,
} from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav — touch targets 44px min */}
      <nav aria-label="Main navigation" className="flex items-center justify-between max-w-6xl mx-auto px-6 py-4">
        <span className="text-xl font-bold tracking-tight">Novyx Vault</span>
        <div className="flex items-center gap-2">
          <a href="/features" className="text-sm text-muted hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center">Features</a>
          <a
            href="https://github.com/novyxlabs/novyx-vault"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-muted hover:text-foreground transition-colors p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Github size={20} />
          </a>
          <a
            href="/login"
            className="px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors min-h-[44px] flex items-center"
          >
            Sign In
          </a>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 [text-wrap:balance]">
            A notes app where your AI{" "}
            <span className="text-accent">actually remembers you</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 [text-wrap:balance]">
            Markdown notes, wiki-links, and a knowledge graph &mdash; like Obsidian.
            But with an AI assistant that learns your projects, your writing style, and your ideas over time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors"
            >
              Get Started Free
              <ArrowRight size={18} />
            </a>
            <a
              href="/features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-sidebar-border text-muted hover:text-foreground hover:border-muted transition-colors font-medium"
            >
              See All Features
            </a>
          </div>
          {/* App screenshot */}
          <div className="mt-16 -mx-2 sm:mx-0 rounded-xl overflow-hidden border border-sidebar-border shadow-2xl">
            <Image
              src="/hero-app.jpeg"
              alt="Novyx Vault — markdown editor with wiki-links, live preview, and ghost connections"
              width={1440}
              height={900}
              priority
              className="w-full h-auto"
            />
          </div>
        </section>

        {/* The problem — left-aligned for variety */}
        <section className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-lg text-muted leading-relaxed">
            Every AI assistant starts from zero. Every conversation.
            You explain your project again. You repeat your preferences.
            You lose context the moment you close the tab.
          </p>
          <p className="text-lg text-foreground font-medium mt-6">
            Novyx Vault fixes that.
          </p>
        </section>

        {/* Core experience — bento/asymmetric layout instead of 3-col grid */}
        <section className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 [text-wrap:balance]">
            Everything you&apos;d expect from a great notes app
          </h2>
          <p className="text-muted mb-12 max-w-2xl">
            Plain markdown, wiki-links, backlinks, a knowledge graph, and a fast editor.
            If you&apos;ve used Obsidian, you&apos;ll feel at home.
          </p>
          {/* Bento grid — asymmetric, not uniform 3-col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
            <FeatureCard
              icon={<FileText size={24} />}
              title="Markdown Editor"
              description="A fast editor with live preview, syntax highlighting, and keyboard shortcuts. Plain markdown — no lock-in."
              className="lg:col-span-7"
            />
            <FeatureCard
              icon={<Link2 size={24} />}
              title="Wiki-Links & Backlinks"
              description="Connect ideas with [[wiki-links]]. Backlinks appear automatically. Build a web of knowledge."
              className="lg:col-span-5"
            />
            <FeatureCard
              icon={<Network size={24} />}
              title="Knowledge Graph"
              description="See your vault as an interactive graph. Explore clusters, orphans, and patterns at a glance."
              className="lg:col-span-4"
            />
            <FeatureCard
              icon={<FolderTree size={24} />}
              title="Folders, Tags & Search"
              description="Nested folders, inline tags, full-text search. Pin favorites, drag to reorder, filter instantly."
              className="lg:col-span-4"
            />
            <FeatureCard
              icon={<Key size={24} />}
              title="Bring Your Own AI"
              description="18+ providers — OpenAI, Anthropic, Gemini, Ollama. Your keys stay in your browser."
              className="lg:col-span-4"
            />
            <FeatureCard
              icon={<Download size={24} />}
              title="Local-First & Open Source"
              description="Desktop app stores files on your machine. Cloud syncs across devices. Export anytime."
              className="lg:col-span-6"
            />
            <FeatureCard
              icon={<Mic size={24} />}
              title="Voice Capture"
              description="Record meetings, webinars, or voice memos. Auto-transcribe locally or via cloud. AI structures your notes."
              className="lg:col-span-6"
              accent="emerald"
            />
          </div>
        </section>

        {/* The differentiator — AI Memory, varied layout */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 [text-wrap:balance]">
            Now add AI that <span className="text-accent">never forgets</span>
          </h2>
          <p className="text-muted mb-14 max-w-2xl">
            This is what makes Novyx Vault different. Your AI builds persistent memory
            from your notes and conversations. The longer you use it, the more useful it becomes.
          </p>
          {/* Asymmetric 2-col: large left, stacked right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-8 rounded-xl border border-sidebar-border bg-card-bg">
              <Brain size={28} className="text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-3">Persistent Memory</h3>
              <p className="text-muted leading-relaxed">
                Your AI remembers your projects, preferences, and thinking patterns across every session.
                Ask about something from last month and it responds with full context.
                No more re-explaining yourself.
              </p>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg flex-1">
                <Sparkles size={24} className="text-emerald-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">Ghost Connections</h3>
                <p className="text-sm text-muted leading-relaxed">
                  AI discovers hidden relationships between your notes &mdash; even without shared keywords
                  or explicit links. Surface connections you never knew existed.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-sidebar-border bg-card-bg flex-1">
                <History size={24} className="text-amber-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">Timeline & Rollback</h3>
                <p className="text-sm text-muted leading-relaxed">
                  See exactly what your AI remembers and when. Made a mistake?
                  Roll back to any point in time. Full control.
                </p>
              </div>
            </div>
            <div className="lg:col-span-12 p-6 rounded-xl border border-sidebar-border bg-card-bg">
              <PenTool size={24} className="text-cyan-400 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Writing Tools</h3>
              <p className="text-muted leading-relaxed max-w-3xl">
                Brain Dump turns raw thoughts into structured notes. Clip Remix rewrites web content in
                your voice. Voice Capture transcribes meetings and podcasts. Weekly Review summarizes your activity.
              </p>
            </div>
          </div>
        </section>

        {/* How it compares — left-aligned heading for variety */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 [text-wrap:balance]">
            How it compares
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sidebar-border">
                  <th className="text-left py-3 pr-4 font-medium text-muted" />
                  <th className="text-center py-3 px-4 font-semibold text-emerald-400">Novyx Vault</th>
                  <th className="text-center py-3 px-4 font-medium text-muted">Obsidian</th>
                  <th className="text-center py-3 px-4 font-medium text-muted">Notion</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                {[
                  ["Markdown files", "Yes", "Yes", "No"],
                  ["Wiki-links & backlinks", "Yes", "Yes", "Limited"],
                  ["Knowledge graph", "Yes", "Plugin", "No"],
                  ["AI with persistent memory", "Built in", "No", "No"],
                  ["AI-discovered connections", "Built in", "No", "No"],
                  ["Memory rollback & audit", "Built in", "No", "No"],
                  ["Voice capture & transcription", "Built in", "No", "No"],
                  ["Bring your own AI provider", "18+", "No", "No"],
                  ["Open source", "Yes", "No", "No"],
                ].map(([feature, vault, obsidian, notion], i, arr) => (
                  <tr key={feature} className={i < arr.length - 1 ? "border-b border-sidebar-border/50" : ""}>
                    <td className="py-3 pr-4">{feature}</td>
                    <td className="text-center py-3 px-4 text-emerald-400">{vault}</td>
                    <td className="text-center py-3 px-4">{obsidian === "No" ? <span className="text-muted/50">{obsidian}</span> : obsidian}</td>
                    <td className="text-center py-3 px-4">{notion === "No" || notion === "Limited" ? <span className="text-muted/50">{notion}</span> : notion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Providers — left-aligned, not centered */}
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className="p-8 rounded-2xl border border-sidebar-border bg-card-bg">
            <div className="flex items-center gap-3 mb-4">
              <Key size={24} className="text-accent" />
              <h2 className="text-2xl sm:text-3xl font-bold [text-wrap:balance]">Works with the AI you already use</h2>
            </div>
            <p className="text-muted mb-6 max-w-xl">
              Connect your own API key. Your keys stay in your browser &mdash; they never touch our servers.
              Switch providers anytime without losing your memory or notes.
            </p>
            <div className="flex flex-wrap gap-2">
              {["OpenAI", "Anthropic", "DeepSeek", "Ollama", "LM Studio", "Groq", "Together", "Mistral", "Gemini", "Cerebras", "Moonshot"].map((provider) => (
                <span
                  key={provider}
                  className="px-3 py-1.5 text-xs rounded-full border border-sidebar-border text-muted"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Desktop + Cloud — asymmetric */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 [text-wrap:balance]">
            Use it your way
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 p-8 rounded-xl border border-sidebar-border bg-card-bg">
              <h3 className="text-xl font-semibold mb-3">Desktop App</h3>
              <p className="text-muted leading-relaxed mb-4">
                Free, private, offline. Your notes live as plain markdown files on your machine.
                No account needed. Works without internet.
              </p>
              <p className="text-sm text-muted/60">
                macOS, Windows, and Linux via Tauri.
              </p>
            </div>
            <div className="md:col-span-5 p-8 rounded-xl border border-sidebar-border bg-card-bg">
              <h3 className="text-xl font-semibold mb-3">Cloud</h3>
              <p className="text-muted leading-relaxed mb-4">
                Sync across devices, publish notes, share with a link, and get daily digest emails.
              </p>
              <p className="text-sm text-muted/60">
                Free tier. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* Open Source CTA */}
        <section className="max-w-3xl mx-auto px-6 py-12">
          <div className="p-8 rounded-2xl border border-sidebar-border bg-card-bg text-center">
            <Github size={32} className="mx-auto mb-4 text-muted" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 [text-wrap:balance]">Open Source</h2>
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
        <section className="max-w-3xl mx-auto px-6 pt-12 pb-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 [text-wrap:balance]">
            Ready to try it?
          </h2>
          <p className="text-muted mb-8">
            Free to use. No credit card. Takes 30 seconds.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-emerald-500 text-white text-lg font-semibold hover:bg-emerald-400 transition-colors"
          >
            Get Started Free
            <ArrowRight size={20} />
          </a>
        </section>
      </main>

      {/* Footer — touch targets 44px min */}
      <footer className="border-t border-sidebar-border py-6">
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
          <nav aria-label="Footer" className="flex items-center gap-1 text-sm text-muted">
            <a href="/features" className="hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center">
              Features
            </a>
            <a href="/terms" className="hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center">
              Terms
            </a>
            <a href="/privacy" className="hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center">
              Privacy
            </a>
            <a
              href="https://github.com/novyxlabs/novyx-vault"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center"
            >
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, className = "", accent }: { icon: React.ReactNode; title: string; description: string; className?: string; accent?: "emerald" | "purple" }) {
  return (
    <div className={`p-6 rounded-xl border border-sidebar-border bg-card-bg hover:border-muted transition-colors text-left ${className}`}>
      <div className={`${accent === "emerald" ? "text-emerald-400" : "text-accent"} mb-3`}>{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}
