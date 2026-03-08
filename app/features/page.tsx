import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain, FileText, Network, GitBranch, History, Sparkles, BarChart3,
  Key, WifiOff, Wifi, Zap, BookOpen, ArrowRight,
} from "lucide-react";
import {
  MemoryDemo, WikiLinkDemo, GhostConnectionsDemo, KnowledgeGraphDemo,
  MemoryRollbackDemo, CortexInsightsDemo, BYOKDemo, LocalFirstDemo,
  CloudSyncDemo, WritingToolsDemo, OpenSourceDemo,
} from "@/components/FeatureDemos";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Novyx Vault features: persistent AI memory, wiki-style linking, knowledge graph, Ghost Connections, memory rollback, multi-provider AI, and more.",
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
            Everything you need to capture, connect, and recall your knowledge &mdash; with AI that
            gets smarter the longer you use it.
          </p>
        </section>

        {/* Feature Sections */}
        <div className="space-y-20">
          <Feature
            icon={<Brain size={28} />}
            title="Persistent AI Memory"
            id="memory"
          >
            <p>
              Most AI tools forget everything when you close the tab. Novyx Vault is different. Powered
              by the Novyx SDK, your AI assistant builds a persistent memory that grows over time. It
              remembers your projects, preferences, writing style, and the relationships between your ideas.
            </p>
            <p>
              The more notes you write and save to memory, the more useful your AI becomes. Ask it about
              a project from last month and it responds with full context. Over time, your AI evolves from
              a generic assistant into something that truly understands how you think.
            </p>
            <ul>
              <li>Memories persist across sessions &mdash; nothing is lost when you close the app</li>
              <li>AI context improves with every note you save to memory</li>
              <li>Per-user memory isolation in cloud mode &mdash; your memories are yours alone</li>
            </ul>
            <MemoryDemo />
          </Feature>

          <Feature
            icon={<FileText size={28} />}
            title="Wiki-Style Linking &amp; Backlinks"
            id="linking"
          >
            <p>
              Connect your ideas using familiar [[wiki-link]] syntax. Type <code>[[</code> and an
              autocomplete menu appears, letting you quickly link to any note in your vault. Every link
              is bidirectional &mdash; when you link note A to note B, note B automatically shows a
              backlink to note A.
            </p>
            <p>
              Backlinks appear in a dedicated panel below each note, giving you instant visibility into
              how your ideas are connected. This creates an organic web of knowledge that grows naturally
              as you write.
            </p>
            <ul>
              <li>Autocomplete wiki-link insertion with <code>[[</code> trigger</li>
              <li>Automatic bidirectional backlinks</li>
              <li>Clickable links in both editor and preview modes</li>
            </ul>
            <WikiLinkDemo />
          </Feature>

          <Feature
            icon={<Network size={28} />}
            title="Ghost Connections"
            id="ghost-connections"
          >
            <p>
              Ghost Connections are AI-discovered relationships between your notes that you never
              explicitly created. When you open a note, Novyx Vault analyzes its content and finds
              related notes across your vault &mdash; even when they share no keywords or explicit links.
            </p>
            <p>
              Each Ghost Connection includes a colored badge showing how the relationship was discovered:
              shared tags, content similarity, semantic meaning, or entity overlap. Click any connection
              to navigate directly to the related note.
            </p>
            <ul>
              <li>Automatic discovery &mdash; no manual tagging or linking required</li>
              <li>Multiple discovery methods: semantic, keyword, tag, and entity matching</li>
              <li>Updates dynamically as you navigate between notes</li>
            </ul>
            <GhostConnectionsDemo />
          </Feature>

          <Feature
            icon={<GitBranch size={28} />}
            title="Knowledge Graph"
            id="knowledge-graph"
          >
            <p>
              See your entire vault as an interactive, force-directed graph. Every note is a node, every
              wiki-link is an edge. Zoom, pan, and drag to explore the structure of your knowledge.
              Click any node to open the note directly.
            </p>
            <p>
              The graph visualization reveals clusters of related ideas, orphaned notes that need
              connections, and the overall topology of your thinking. It is a bird&apos;s-eye view of
              everything you know.
            </p>
            <ul>
              <li>Interactive force-directed layout</li>
              <li>Color-coded by folder or tag</li>
              <li>Click to navigate, drag to rearrange</li>
            </ul>
            <KnowledgeGraphDemo />
          </Feature>

          <Feature
            icon={<History size={28} />}
            title="Memory Rollback &amp; Timeline"
            id="memory-rollback"
          >
            <p>
              Every memory your AI stores is timestamped and versioned. The Memory Dashboard lets you
              browse your AI&apos;s memory timeline, see exactly what it remembers, and roll back to
              previous states if needed.
            </p>
            <p>
              Accidentally told your AI something wrong? Travel back to before that memory was stored
              and restore a clean state. You have full control over what your AI knows and when it
              learned it.
            </p>
            <ul>
              <li>Full memory timeline with timestamps</li>
              <li>One-click rollback to any previous state</li>
              <li>Memory audit log for transparency</li>
            </ul>
            <MemoryRollbackDemo />
          </Feature>

          <Feature
            icon={<Sparkles size={28} />}
            title="Cortex Insights &amp; Entity Extraction"
            id="cortex"
          >
            <p>
              As your vault grows, Cortex Insights analyzes your accumulated knowledge and surfaces
              emerging themes, patterns, and connections you may not have noticed. It is like having a
              research assistant that reads everything you write and highlights the bigger picture.
            </p>
            <p>
              Entity Extraction automatically identifies people, projects, concepts, and relationships
              in your notes. These entities build a semantic knowledge graph &mdash; a structured map
              of everything in your vault that makes AI recall even more powerful.
            </p>
            <ul>
              <li>Automatic theme detection across your vault</li>
              <li>Entity and relationship extraction (people, projects, concepts)</li>
              <li>Semantic graph that grows with every note</li>
            </ul>
            <CortexInsightsDemo />
          </Feature>

          <Feature
            icon={<Key size={28} />}
            title="Bring Your Own AI Key"
            id="byok"
          >
            <p>
              Novyx Vault works with the AI provider you already use and trust. Connect your own API
              key and choose from over a dozen providers. Your API keys are stored in your browser&apos;s
              local storage only &mdash; they are sent to our server solely to proxy the request and are
              never persisted.
            </p>
            <Providers />
            <BYOKDemo />
          </Feature>

          <Feature
            icon={<WifiOff size={28} />}
            title="Local-First Architecture"
            id="local-first"
          >
            <p>
              In desktop mode, your notes are plain markdown files stored in a folder on your machine.
              No database, no cloud dependency, no account required. Open them in any text editor,
              sync them with Git, or back them up however you want.
            </p>
            <p>
              This local-first approach means Novyx Vault works offline, starts instantly, and gives
              you complete ownership of your data. If you ever stop using Novyx Vault, your notes are
              already in a universal format.
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
              For cross-device access, enable cloud mode with Supabase-powered storage. Your notes are
              stored in a Postgres database with row-level security, ensuring only you can access your
              data. Authentication supports email/password, Google, and GitHub.
            </p>
            <ul>
              <li>Supabase Postgres with row-level security</li>
              <li>Settings sync across devices (theme, pinned notes, AI providers)</li>
              <li>OAuth login with Google and GitHub</li>
            </ul>
            <CloudSyncDemo />
          </Feature>

          <Feature
            icon={<Zap size={28} />}
            title="AI-Powered Writing Tools"
            id="writing-tools"
          >
            <p>
              Beyond chat, Novyx Vault includes specialized AI writing tools designed for knowledge work.
              Brain Dump takes unstructured thoughts and transforms them into organized, well-structured
              notes. Clip Remix takes content you&apos;ve clipped from the web and rewrites it in your
              personal voice, matching the style of your existing notes.
            </p>
            <ul>
              <li>Brain Dump &mdash; raw thoughts to structured notes</li>
              <li>Clip Remix &mdash; rewrite clipped content in your voice</li>
              <li>Slash commands for inline AI assistance</li>
              <li>Weekly Review &mdash; AI-generated summary of your writing activity</li>
            </ul>
            <WritingToolsDemo />
          </Feature>

          <Feature
            icon={<BookOpen size={28} />}
            title="Open Source"
            id="open-source"
          >
            <p>
              Novyx Vault is fully open source. Every line of code is available for inspection. You can
              contribute features, report bugs, or fork the entire project. The desktop app is built with
              Tauri for native performance on macOS, Windows, and Linux.
            </p>
            <ul>
              <li>Full source code available on GitHub</li>
              <li>Self-hostable with your own Supabase instance</li>
              <li>Desktop apps via Tauri (macOS, Windows, Linux)</li>
              <li>Built with Next.js, React, TypeScript, Tailwind CSS</li>
            </ul>
            <OpenSourceDemo />
          </Feature>
        </div>

        {/* CTA */}
        <section className="text-center pt-20 pb-8">
          <h2 className="text-2xl font-bold mb-4">Ready to build your second brain?</h2>
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
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-accent">{icon}</div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="space-y-4 text-muted leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-sm [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-card-bg [&_code]:text-accent [&_code]:text-sm">
        {children}
      </div>
    </section>
  );
}

function Providers() {
  const providers = [
    "OpenAI", "Anthropic", "DeepSeek", "Ollama", "LM Studio", "Groq",
    "Together", "Mistral", "Gemini", "Cerebras", "SambaNova", "Moonshot", "MiniMax",
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
