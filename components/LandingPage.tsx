"use client";

import {
  Brain, FileText, Network, Github, ArrowRight,
  Sparkles, History, Key, PenTool, Link2, FolderTree,
  Download, Mic, Menu, X,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const viewportOnce = { once: true, margin: "-60px" as const };

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start end", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.98, 0.95]);
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav — touch targets 44px min */}
      <nav aria-label="Main navigation" className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">Novyx Vault</span>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-2">
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
          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden flex flex-col gap-1 pt-4 pb-2 border-t border-sidebar-border mt-4">
            <a href="/features" className="text-sm text-muted hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center">Features</a>
            <a
              href="https://github.com/novyxlabs/novyx-vault"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center gap-2"
            >
              <Github size={18} /> GitHub
            </a>
            <a
              href="/login"
              className="px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors min-h-[44px] flex items-center justify-center mt-2"
            >
              Sign In
            </a>
          </div>
        )}
      </nav>

      <main>
        {/* Hero */}
        <motion.section
          className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 [text-wrap:balance]"
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Your AI forgets everything.{" "}
            <span className="text-accent">This one doesn&apos;t.</span>
          </motion.h1>
          <motion.p
            className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 [text-wrap:balance]"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            The only open-source second brain with AI memory that persists across every session.
            Roll back what your AI knows at any point. Connect 20+ providers &mdash; your keys never leave your browser.
          </motion.p>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
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
          </motion.div>
          {/* App screenshot — scroll parallax */}
          <motion.div
            ref={heroRef}
            className="mt-16 -mx-2 sm:mx-0 rounded-xl overflow-hidden border border-sidebar-border shadow-2xl"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ y: heroY, scale: heroScale }}
          >
            <Image
              src="/hero-app.jpeg"
              alt="Novyx Vault — markdown editor with wiki-links, live preview, and ghost connections"
              width={1440}
              height={900}
              priority
              className="w-full h-auto"
            />
          </motion.div>
        </motion.section>

        {/* The problem — left-aligned for variety */}
        <motion.section
          className="max-w-3xl mx-auto px-6 py-20"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <motion.p
            className="text-lg text-muted leading-relaxed"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            Every AI assistant starts from zero. Every conversation.
            You explain your project again. You repeat your preferences.
            You lose context the moment you close the tab.
          </motion.p>
          <motion.p
            className="text-lg text-foreground font-medium mt-6"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            Novyx Vault fixes that.
          </motion.p>
        </motion.section>

        {/* Core experience — bento/asymmetric layout instead of 3-col grid */}
        <motion.section
          className="max-w-5xl mx-auto px-6 py-12"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold mb-4 [text-wrap:balance]"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Everything you&apos;d expect from a great notes app
          </motion.h2>
          <motion.p
            className="text-muted mb-12 max-w-2xl"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Plain markdown, wiki-links, backlinks, a knowledge graph, and a fast editor.
            If you&apos;ve used Obsidian, you&apos;ll feel at home.
          </motion.p>
          {/* Bento grid — asymmetric, not uniform 3-col */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5"
            variants={staggerContainer}
          >
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
          </motion.div>
        </motion.section>

        {/* The differentiator — AI Memory, varied layout */}
        <motion.section
          className="max-w-5xl mx-auto px-6 py-20"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold mb-4 [text-wrap:balance]"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Now add AI that <span className="text-accent">never forgets</span>
          </motion.h2>
          <motion.p
            className="text-muted mb-14 max-w-2xl"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            This is what makes Novyx Vault different. Your AI builds persistent memory
            from your notes and conversations. The longer you use it, the more useful it becomes.
          </motion.p>
          {/* Asymmetric 2-col: large left, stacked right */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            variants={staggerContainer}
          >
            <motion.div
              className="lg:col-span-7 p-8 rounded-xl border border-sidebar-border bg-card-bg"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <Brain size={28} className="text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-3">Persistent Memory</h3>
              <p className="text-muted leading-relaxed">
                Your AI remembers your projects, preferences, and thinking patterns across every session.
                Ask about something from last month and it responds with full context.
                No more re-explaining yourself.
              </p>
            </motion.div>
            <motion.div
              className="lg:col-span-5 flex flex-col gap-6"
              variants={staggerContainer}
            >
              <motion.div
                className="p-6 rounded-xl border border-sidebar-border bg-card-bg flex-1"
                variants={fadeUp}
                transition={{ duration: 0.5 }}
              >
                <Sparkles size={24} className="text-emerald-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">Ghost Connections</h3>
                <p className="text-sm text-muted leading-relaxed">
                  AI discovers hidden relationships between your notes &mdash; even without shared keywords
                  or explicit links. Surface connections you never knew existed.
                </p>
              </motion.div>
              <motion.div
                className="p-6 rounded-xl border border-sidebar-border bg-card-bg flex-1"
                variants={fadeUp}
                transition={{ duration: 0.5 }}
              >
                <History size={24} className="text-amber-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">Timeline & Rollback</h3>
                <p className="text-sm text-muted leading-relaxed">
                  See exactly what your AI remembers and when. Made a mistake?
                  Roll back to any point in time. Full control.
                </p>
              </motion.div>
            </motion.div>
            <motion.div
              className="lg:col-span-12 p-6 rounded-xl border border-sidebar-border bg-card-bg"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <PenTool size={24} className="text-cyan-400 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Writing Tools</h3>
              <p className="text-muted leading-relaxed max-w-3xl">
                Brain Dump turns raw thoughts into structured notes. Clip Remix rewrites web content in
                your voice. Voice Capture transcribes meetings and podcasts. Weekly Review summarizes your activity.
              </p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* How it compares — left-aligned heading for variety */}
        <motion.section
          className="max-w-4xl mx-auto px-6 py-16"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 [text-wrap:balance]">
            How it compares
          </h2>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-0">
              <thead>
                <tr className="border-b border-sidebar-border">
                  <th className="text-left py-3 pr-2 sm:pr-4 font-medium text-muted" />
                  <th className="text-center py-3 px-2 sm:px-4 font-semibold text-emerald-400">Novyx Vault</th>
                  <th className="text-center py-3 px-2 sm:px-4 font-medium text-muted">Obsidian</th>
                  <th className="text-center py-3 px-2 sm:px-4 font-medium text-muted">Notion</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                {[
                  ["Markdown files", "Yes", "Yes", "No"],
                  ["Wiki-links & backlinks", "Yes", "Yes", "Yes"],
                  ["Knowledge graph", "Yes", "Yes", "No"],
                  ["AI with persistent memory", "Built in", "No", "Workspace only"],
                  ["AI-discovered connections", "Built in", "No", "No"],
                  ["Memory rollback & audit", "Built in", "No", "Page history"],
                  ["Voice capture & transcription", "Built in", "Recording only", "Yes (paid)"],
                  ["Bring your own AI provider", "20+", "No", "No"],
                  ["Open source", "Yes", "No", "No"],
                ].map(([feature, vault, obsidian, notion], i, arr) => (
                  <tr key={feature} className={i < arr.length - 1 ? "border-b border-sidebar-border/50" : ""}>
                    <td className="py-3 pr-2 sm:pr-4">{feature}</td>
                    <td className="text-center py-3 px-2 sm:px-4 text-emerald-400">{vault}</td>
                    <td className="text-center py-3 px-2 sm:px-4">{obsidian === "No" ? <span className="text-muted/50">{obsidian}</span> : obsidian}</td>
                    <td className="text-center py-3 px-2 sm:px-4">{notion === "No" ? <span className="text-muted/50">{notion}</span> : notion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Providers — left-aligned, not centered */}
        <motion.section
          className="max-w-4xl mx-auto px-6 py-12"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
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
              {["OpenAI", "Anthropic", "Google Gemini", "DeepSeek", "Groq", "Together", "Mistral", "xAI Grok", "Perplexity", "Cohere", "Nvidia NIM", "Hyperbolic", "Cerebras", "SambaNova", "Fireworks", "Moonshot", "MiniMax", "OpenRouter", "Ollama", "LM Studio"].map((provider) => (
                <span
                  key={provider}
                  className="px-3 py-1.5 text-xs rounded-full border border-sidebar-border text-muted"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Desktop + Cloud — asymmetric */}
        <motion.section
          className="max-w-5xl mx-auto px-6 py-20"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold mb-12 [text-wrap:balance]"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Use it your way
          </motion.h2>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-12 gap-6"
            variants={staggerContainer}
          >
            <motion.div
              className="md:col-span-7 p-8 rounded-xl border border-sidebar-border bg-card-bg"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-semibold mb-3">Desktop App</h3>
              <p className="text-muted leading-relaxed mb-4">
                Free, private, offline. Your notes live as plain markdown files on your machine.
                No account needed. Works without internet.
              </p>
              <p className="text-sm text-muted/60">
                macOS, Windows, and Linux via Tauri.
              </p>
            </motion.div>
            <motion.div
              className="md:col-span-5 p-8 rounded-xl border border-sidebar-border bg-card-bg"
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-semibold mb-3">Cloud</h3>
              <p className="text-muted leading-relaxed mb-4">
                Sync across devices, publish notes, share with a link, and get daily digest emails.
              </p>
              <p className="text-sm text-muted/60">
                Free tier. No credit card required.
              </p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Open Source CTA */}
        <motion.section
          className="max-w-3xl mx-auto px-6 py-12"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
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
        </motion.section>

        {/* Final CTA */}
        <motion.section
          className="max-w-3xl mx-auto px-6 pt-12 pb-20 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold mb-4 [text-wrap:balance]"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Ready to try it?
          </motion.h2>
          <motion.p
            className="text-muted mb-8"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Free to use. No credit card. Takes 30 seconds.
          </motion.p>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-emerald-500 text-white text-lg font-semibold hover:bg-emerald-400 transition-colors"
            >
              Get Started Free
              <ArrowRight size={20} />
            </a>
          </motion.div>
        </motion.section>
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
              className="text-foreground hover:text-accent transition-colors py-2.5 min-h-[44px] inline-flex items-center"
            >
              Novyx Labs
            </a>
          </p>
          <nav aria-label="Footer" className="flex items-center gap-1 text-sm text-muted">
            <a href="/features" className="hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center">
              Features
            </a>
            <a href="/pricing" className="hover:text-foreground transition-colors px-3 py-2.5 min-h-[44px] flex items-center">
              Pricing
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
    <motion.div
      className={`p-6 rounded-xl border border-sidebar-border bg-card-bg hover:border-muted transition-colors text-left ${className}`}
      variants={fadeUp}
      transition={{ duration: 0.4 }}
    >
      <div className={`${accent === "emerald" ? "text-emerald-400" : "text-accent"} mb-3`}>{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </motion.div>
  );
}
