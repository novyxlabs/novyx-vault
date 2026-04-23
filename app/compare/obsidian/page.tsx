import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Novyx Vault vs Obsidian (2026 Comparison)",
  description:
    "An honest comparison of Novyx Vault and Obsidian for personal knowledge management. See how they differ on AI memory, providers, privacy, pricing, and more.",
  alternates: { canonical: "/compare/obsidian" },
};

const sections = [
  {
    name: "Notes & Editor",
    rows: [
      { feature: "Markdown editing", vault: true, obsidian: true },
      { feature: "Wiki-links & backlinks", vault: true, obsidian: true },
      { feature: "Knowledge graph", vault: true, obsidian: true },
      { feature: "Live preview", vault: true, obsidian: true },
      { feature: "Slash commands", vault: true, obsidian: true },
      { feature: "Plugin / extension ecosystem", vault: "Limited", obsidian: "2,000+" },
      { feature: "Mobile apps", vault: false, obsidian: true },
      { feature: "Templates", vault: true, obsidian: true },
    ],
  },
  {
    name: "AI Features",
    rows: [
      { feature: "Built-in AI chat", vault: true, obsidian: true },
      { feature: "Persistent AI memory", vault: true, obsidian: false },
      { feature: "Memory rollback & audit trail", vault: true, obsidian: false },
      { feature: "Ghost Connections (AI-discovered links)", vault: true, obsidian: false },
      { feature: "Entity extraction & insights", vault: true, obsidian: false },
      { feature: "20+ AI providers (BYOK)", vault: true, obsidian: false },
      { feature: "Voice capture & transcription", vault: true, obsidian: false },
      { feature: "AI writing tools (Brain Dump, Clip Remix)", vault: true, obsidian: false },
    ],
  },
  {
    name: "Memory & Knowledge",
    rows: [
      { feature: "AI remembers across sessions", vault: true, obsidian: false },
      { feature: "Memory timeline with versioning", vault: true, obsidian: false },
      { feature: "Rollback to any memory state", vault: true, obsidian: false },
      { feature: "Chain verification (tamper-proof audit)", vault: true, obsidian: false },
      { feature: "Daily digest emails", vault: true, obsidian: false },
    ],
  },
  {
    name: "Privacy & Ownership",
    rows: [
      { feature: "Open source", vault: "MIT License", obsidian: "Source-available" },
      { feature: "Local-first / offline mode", vault: true, obsidian: true },
      { feature: "Self-hostable", vault: true, obsidian: false },
      { feature: "Plain markdown files on disk", vault: true, obsidian: true },
      { feature: "BYOK (no vendor AI lock-in)", vault: true, obsidian: false },
      { feature: "End-to-end encryption", vault: false, obsidian: true },
    ],
  },
  {
    name: "Pricing",
    rows: [
      { feature: "Free tier", vault: "Yes (full editor + BYOK)", obsidian: "Yes (personal use)" },
      { feature: "Sync across devices", vault: "Free (cloud mode)", obsidian: "$50/year" },
      { feature: "Publish to web", vault: "Free", obsidian: "$8/month" },
      { feature: "Pro / AI memory features", vault: "$9/month", obsidian: "N/A" },
    ],
  },
  {
    name: "Community & Ecosystem",
    rows: [
      { feature: "Community plugins", vault: "Growing", obsidian: "2,000+" },
      { feature: "Community themes", vault: "Limited", obsidian: "Hundreds" },
      { feature: "Public API", vault: true, obsidian: false },
      { feature: "Years in market", vault: "2026 (new)", obsidian: "2020 (mature)" },
      { feature: "Contribute to source code", vault: true, obsidian: false },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={18} className="text-green-500 mx-auto" />;
  if (value === false) return <X size={18} className="text-red-400/60 mx-auto" />;
  return <span className="text-sm text-muted">{value}</span>;
}

export default function CompareObsidianPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Novyx Vault vs Obsidian — How They Compare (2026)",
    description:
      "An honest, detailed comparison of Novyx Vault and Obsidian for personal knowledge management.",
    author: { "@type": "Organization", name: "Novyx Labs", url: "https://novyxlabs.com" },
    publisher: { "@type": "Organization", name: "Novyx Labs", url: "https://novyxlabs.com" },
    datePublished: "2026-03-30",
    dateModified: "2026-04-06",
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            Novyx Vault vs Obsidian
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Every AI notes app does RAG over your files. Vault has true persistent AI memory
            that survives sessions, consolidates over time, and can be rolled back. Here&apos;s
            an honest look at how Vault and Obsidian compare.
          </p>
        </section>

        {/* Comparison Table */}
        {sections.map((section) => (
          <section key={section.name} className="mb-12">
            <h2 className="text-xl font-bold mb-4">{section.name}</h2>
            <div className="rounded-xl border border-sidebar-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card-bg">
                    <th className="text-left px-4 py-3 font-semibold text-muted">Feature</th>
                    <th className="text-center px-4 py-3 font-semibold text-accent w-28">Vault</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted w-28">Obsidian</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-background" : "bg-card-bg/50"}
                    >
                      <td className="px-4 py-3 text-muted">{row.feature}</td>
                      <td className="px-4 py-3 text-center"><CellValue value={row.vault} /></td>
                      <td className="px-4 py-3 text-center"><CellValue value={row.obsidian} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {/* Detailed Sections */}
        <section className="space-y-10 mb-16">
          <div>
            <h2 className="text-xl font-bold mb-3">Notes & Editor</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Both Novyx Vault and Obsidian use markdown as their native format, so your notes
                are always plain text files you can open anywhere. Both support wiki-links,
                backlinks, and an interactive knowledge graph for visualizing connections.
              </p>
              <p>
                Where Obsidian pulls ahead is its massive plugin ecosystem. With over 1.5 million
                users and 2,000+ community plugins, you can customize Obsidian to do almost
                anything &mdash; from Kanban boards to spaced repetition. Obsidian also has polished
                mobile apps for iOS and Android, which Vault does not have yet.
              </p>
              <p>
                Vault&apos;s editor is built on CodeMirror 6 with slash commands, live preview, and
                built-in AI writing tools like Brain Dump and Clip Remix that go beyond what
                Obsidian offers out of the box.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">AI Features</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Obsidian recently introduced AI features, but they are stateless &mdash; the AI
                does RAG over your files without remembering previous conversations or building
                context over time. Each interaction starts from scratch.
              </p>
              <p>
                Novyx Vault&apos;s AI is fundamentally different. It has true persistent memory
                that survives sessions, consolidates over time, and can be rolled back to any
                previous state. Ask about a project from last month and the AI responds with full
                context. It also discovers hidden connections between your notes (Ghost
                Connections), extracts entities and relationships, and offers a full memory
                timeline with audit trail.
              </p>
              <p>
                Vault supports 20+ AI providers through BYOK (Bring Your Own Key), including
                OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama, and local models via LM Studio.
                Obsidian&apos;s AI is limited to fewer provider options.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Memory</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                This is Vault&apos;s strongest differentiator. Powered by the Novyx SDK, Vault
                gives your AI a real memory layer &mdash; every interaction is remembered,
                timestamped, and versioned. You can browse the full timeline, verify the chain of
                memories, and roll back to any previous state.
              </p>
              <p>
                Obsidian does not have an equivalent feature. Its AI works within the current
                session only, with no persistence between conversations.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Privacy & Ownership</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Both tools respect privacy. Obsidian stores notes locally by default and offers
                end-to-end encrypted sync. Vault also stores notes locally in desktop mode as plain
                markdown files, and is fully self-hostable.
              </p>
              <p>
                The key difference is openness. Vault is open source under the MIT license &mdash;
                you can read every line of code, contribute features, or fork the entire project.
                Obsidian is source-available but not open source &mdash; you can inspect the code,
                but you cannot modify or redistribute it. With Vault, you can verify and fork it.
              </p>
              <p>
                Vault&apos;s BYOK model means your AI API keys are encrypted at rest (cloud) or
                kept on your device (desktop), and are used only to call the provider you
                configured. Novyx Labs never rebrokers them, giving you full control over which AI
                provider sees your data.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Pricing</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Obsidian is free for personal use, but sync costs $50/year and publish costs
                $8/month. These add up quickly if you use both. Commercial use requires a $50/year
                license per user.
              </p>
              <p>
                Vault&apos;s free tier includes the full editor, wiki-links, knowledge graph, 20+
                AI providers, cloud sync, and publishing. The $9/month Pro plan adds persistent AI
                memory, Ghost Connections, cortex insights, voice capture, and the full audit trail.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Community</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Obsidian has a mature, thriving community that has been growing since 2020. Its
                plugin and theme ecosystem is unmatched in the personal knowledge management space.
                If you need a specific workflow, there is probably a plugin for it.
              </p>
              <p>
                Vault is newer and its community is just getting started. The advantage is that
                Vault is fully open source &mdash; you can contribute directly to the core product,
                not just build plugins on top of a closed platform. As the community grows, so will
                the ecosystem.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pt-8 pb-8">
          <h2 className="text-2xl font-bold mb-4">Ready to try Novyx Vault?</h2>
          <p className="text-muted mb-8">
            Free to use. No credit card required. Import your Obsidian vault in one click.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Try Novyx Vault Free
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
            <Link href="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link href="/compare/notion" className="hover:text-foreground transition-colors">vs Notion</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
