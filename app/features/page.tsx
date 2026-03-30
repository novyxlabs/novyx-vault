import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain, FileText, Network, GitBranch, History, Sparkles,
  Key, WifiOff, Wifi, Zap, BookOpen, ArrowRight, Link2, Mic,
} from "lucide-react";
import {
  MarkdownEditorDemo, MemoryDemo, WikiLinkDemo, GhostConnectionsDemo, KnowledgeGraphDemo,
  MemoryRollbackDemo, CortexInsightsDemo, BYOKDemo, LocalFirstDemo,
  CloudSyncDemo, WritingToolsDemo, VoiceCaptureDemo, OpenSourceDemo,
} from "@/components/FeatureDemos";
import { FadeInSection } from "@/components/FadeInSection";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Markdown notes, wiki-links, knowledge graph, persistent AI memory, Ghost Connections, memory rollback, 18+ AI providers, and more.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
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

      <main className="max-w-4xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Features
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            A complete workspace for capturing, connecting, and recalling your knowledge &mdash;
            with AI that gets smarter the longer you use it.
          </p>
        </section>

        {/* Feature Sections */}
        <div className="space-y-14">
          {/* Notes-first features */}
          <Feature
            icon={<FileText size={28} />}
            title="Markdown Editor"
            id="editor"
          >
            <p>
              A fast, keyboard-driven editor built on CodeMirror 6. Live preview, syntax highlighting,
              and familiar shortcuts. Your notes are plain markdown files &mdash; open them in any text
              editor, sync them with Git, or back them up however you want.
            </p>
            <ul>
              <li>Live preview with full GitHub-flavored markdown support</li>
              <li>Slash commands for quick formatting and AI actions</li>
              <li>Autosave with version history</li>
              <li>Templates for common note types</li>
            </ul>
            <MarkdownEditorDemo />
          </Feature>

          <Feature
            icon={<Link2 size={28} />}
            title="Wiki-Links & Backlinks"
            id="linking"
          >
            <p>
              Connect your ideas using familiar [[wiki-link]] syntax. Type <code>[[</code> and an
              autocomplete menu appears, letting you link to any note in your vault. Every link
              is bidirectional &mdash; backlinks appear automatically below each note.
            </p>
            <p>
              This creates an organic web of knowledge that grows naturally as you write. No need
              to plan your structure upfront &mdash; just write and link.
            </p>
            <ul>
              <li>Autocomplete wiki-link insertion with <code>[[</code> trigger</li>
              <li>Automatic bidirectional backlinks</li>
              <li>Clickable links in both editor and preview</li>
            </ul>
            <WikiLinkDemo />
          </Feature>

          <Feature
            icon={<GitBranch size={28} />}
            title="Knowledge Graph"
            id="knowledge-graph"
          >
            <p>
              See your entire vault as an interactive, force-directed graph. Every note is a node,
              every wiki-link is an edge. Zoom, pan, and drag to explore how your ideas connect.
              Click any node to open the note.
            </p>
            <p>
              The graph reveals clusters of related ideas, orphaned notes that need connections,
              and the overall shape of your thinking.
            </p>
            <ul>
              <li>Interactive force-directed layout</li>
              <li>Color-coded by folder or tag</li>
              <li>Click to navigate, drag to rearrange</li>
            </ul>
            <KnowledgeGraphDemo />
          </Feature>

          {/* AI-powered features */}
          <Feature
            icon={<Brain size={28} />}
            title="Persistent AI Memory"
            id="memory"
          >
            <p>
              Most AI tools forget everything when you close the tab. Novyx Vault is different.
              Your AI assistant builds a persistent memory that grows over time. It remembers your
              projects, your preferences, your writing style, and the relationships between your ideas.
            </p>
            <p>
              Ask about a project from last month and it responds with full context. The more you
              use it, the more useful it becomes &mdash; like an assistant that actually knows you.
            </p>
            <ul>
              <li>Memories persist across sessions &mdash; nothing is lost when you close the app</li>
              <li>AI context improves with every note you save</li>
              <li>Your memories are yours alone &mdash; fully private and portable</li>
            </ul>
            <MemoryDemo />
          </Feature>

          <Feature
            icon={<Network size={28} />}
            title="Ghost Connections"
            id="ghost-connections"
          >
            <p>
              Ghost Connections are AI-discovered relationships between your notes that you never
              explicitly created. When you open a note, Vault analyzes its content and finds related
              notes across your vault &mdash; even without shared keywords or links.
            </p>
            <p>
              Each connection includes a badge showing how it was discovered: shared tags, content
              similarity, semantic meaning, or entity overlap. Click any connection to jump to the
              related note.
            </p>
            <ul>
              <li>Automatic discovery &mdash; no manual tagging required</li>
              <li>Multiple discovery methods: semantic, keyword, tag, and entity matching</li>
              <li>Updates dynamically as you navigate</li>
            </ul>
            <GhostConnectionsDemo />
          </Feature>

          <Feature
            icon={<History size={28} />}
            title="Memory Timeline & Rollback"
            id="memory-rollback"
          >
            <p>
              Every memory your AI stores is timestamped and versioned. Browse the full timeline,
              see exactly what your AI remembers, and roll back to previous states if needed.
            </p>
            <p>
              Told your AI something wrong? Travel back to before that memory was stored and restore
              a clean state. You always have full control over what your AI knows.
            </p>
            <ul>
              <li>Full memory timeline with timestamps</li>
              <li>One-click rollback to any previous state</li>
              <li>Audit trail for complete transparency</li>
            </ul>
            <MemoryRollbackDemo />
          </Feature>

          <Feature
            icon={<Sparkles size={28} />}
            title="Insights & Entity Extraction"
            id="cortex"
          >
            <p>
              As your vault grows, Vault analyzes your accumulated knowledge and surfaces
              emerging themes, patterns, and connections you may not have noticed. It&apos;s like
              having a research assistant that reads everything you write and highlights the bigger picture.
            </p>
            <ul>
              <li>Automatic theme detection across your vault</li>
              <li>Entity and relationship extraction (people, projects, concepts)</li>
              <li>Semantic graph that grows with every note</li>
            </ul>
            <CortexInsightsDemo />
          </Feature>

          <Feature
            icon={<Zap size={28} />}
            title="AI Writing Tools"
            id="writing-tools"
          >
            <p>
              Beyond chat, Vault includes writing tools designed for how you actually think.
              Brain Dump takes messy thoughts and transforms them into structured notes.
              Clip Remix takes content from the web and rewrites it in your voice.
              Voice Capture transcribes meetings and podcasts into structured markdown.
            </p>
            <ul>
              <li>Brain Dump &mdash; raw thoughts to structured notes</li>
              <li>Clip Remix &mdash; rewrite clipped content in your voice</li>
              <li>Slash commands for inline AI help</li>
              <li>Weekly Review &mdash; AI summary of your writing activity</li>
            </ul>
            <WritingToolsDemo />
          </Feature>

          <Feature
            icon={<Mic size={28} />}
            title="Voice Capture"
            id="voice-capture"
          >
            <p>
              Record meetings, lectures, webinars, or voice memos &mdash; no bot joins your call.
              Transcribe locally on-device using Whisper or via cloud with any OpenAI-compatible API.
              AI structures your transcript into clean, organized markdown notes.
            </p>
            <ul>
              <li>Dual transcription: local (on-device, private) or cloud (faster, more accurate)</li>
              <li>Capture from microphone or system audio</li>
              <li>Real-time waveform visualization during recording</li>
              <li>AI structuring &mdash; raw transcript becomes meeting notes, thought capture, or learning notes</li>
              <li>Save as a new note or merge into an existing one</li>
            </ul>
            <VoiceCaptureDemo />
          </Feature>

          <Feature
            icon={<Key size={28} />}
            title="BYOK — Bring Your Own Key"
            id="byok"
          >
            <p>
              Novyx Vault works with the AI provider you already use. Connect your own API key
              and choose from 18+ providers. Your keys are stored in your browser only &mdash;
              we never store them on our servers. Switch providers anytime without losing your memory or notes.
            </p>
            <Providers />
            <BYOKDemo />
          </Feature>

          <Feature
            icon={<WifiOff size={28} />}
            title="Desktop App — Local & Offline"
            id="local-first"
          >
            <p>
              In desktop mode, your notes are plain markdown files in a folder on your machine.
              No database, no cloud, no account required. Works offline, starts instantly, and gives
              you complete ownership of your data.
            </p>
            <ul>
              <li>Plain markdown files on disk</li>
              <li>Works completely offline</li>
              <li>Zero lock-in &mdash; your files are always yours</li>
            </ul>
            <LocalFirstDemo />
          </Feature>

          <Feature
            icon={<Wifi size={28} />}
            title="Cloud Sync"
            id="cloud-sync"
          >
            <p>
              For cross-device access, cloud mode syncs your notes securely. Settings, themes,
              and pinned notes carry over everywhere. Sign in with GitHub or Google.
            </p>
            <ul>
              <li>Secure sync across devices</li>
              <li>Publish notes with a shareable link</li>
              <li>Daily digest emails with AI-surfaced highlights</li>
            </ul>
            <CloudSyncDemo />
          </Feature>

          <Feature
            icon={<BookOpen size={28} />}
            title="Open Source"
            id="open-source"
          >
            <p>
              Every line of code is on GitHub. Contribute features, report bugs, or fork the project.
              Self-host with your own infrastructure if you want full control.
            </p>
            <ul>
              <li>Full source code on GitHub</li>
              <li>Self-hostable</li>
              <li>Desktop apps for macOS, Windows, and Linux</li>
              <li>Built with Next.js, React, TypeScript, and Tailwind</li>
            </ul>
            <OpenSourceDemo />
          </Feature>
        </div>

        {/* CTA */}
        <section className="text-center pt-20 pb-8">
          <h2 className="text-2xl font-bold mb-4">Ready to try it?</h2>
          <p className="text-muted mb-8">
            Free to use. No credit card required.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started Free
            <ArrowRight size={18} />
          </a>
        </section>
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
          <nav aria-label="Footer" className="flex items-center gap-6 text-sm text-muted">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, id, children }: { icon: React.ReactNode; title: string; id: string; children: React.ReactNode }) {
  return (
    <FadeInSection id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-accent">{icon}</div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="space-y-4 text-muted leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-sm [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-card-bg [&_code]:text-accent [&_code]:text-sm">
        {children}
      </div>
    </FadeInSection>
  );
}

function Providers() {
  const providers = [
    "OpenAI", "Anthropic", "Google Gemini", "DeepSeek", "Ollama", "LM Studio",
    "Groq", "Together", "Mistral", "xAI Grok", "Perplexity", "Cohere",
    "Cerebras", "SambaNova", "Fireworks", "Moonshot", "MiniMax", "OpenRouter",
    "Nvidia NIM", "Hyperbolic",
  ];
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {providers.map((p) => (
        <span key={p} className="px-3 py-1 text-xs rounded-full border border-sidebar-border text-muted">
          {p}
        </span>
      ))}
    </div>
  );
}
