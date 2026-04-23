import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Novyx Vault vs Notion (2026 Comparison)",
  description:
    "An honest comparison of Novyx Vault and Notion. See how they differ on AI memory, local-first storage, open source, pricing, and more.",
  alternates: { canonical: "/compare/notion" },
};

const sections = [
  {
    name: "Notes & Editor",
    rows: [
      { feature: "Markdown editing", vault: true, notion: "Block-based (export to markdown)" },
      { feature: "Wiki-links & backlinks", vault: true, notion: true },
      { feature: "Knowledge graph", vault: true, notion: false },
      { feature: "Databases & tables", vault: false, notion: true },
      { feature: "Kanban boards", vault: false, notion: true },
      { feature: "Project management", vault: false, notion: true },
      { feature: "Slash commands", vault: true, notion: true },
      { feature: "Mobile apps", vault: false, notion: true },
      { feature: "Real-time collaboration", vault: false, notion: true },
    ],
  },
  {
    name: "AI Features",
    rows: [
      { feature: "Built-in AI chat", vault: true, notion: true },
      { feature: "Persistent AI memory", vault: true, notion: false },
      { feature: "Memory rollback & audit trail", vault: true, notion: false },
      { feature: "Ghost Connections (AI-discovered links)", vault: true, notion: false },
      { feature: "Entity extraction & insights", vault: true, notion: false },
      { feature: "20+ AI providers (BYOK)", vault: true, notion: false },
      { feature: "AI agents", vault: false, notion: true },
      { feature: "Voice capture & transcription", vault: true, notion: false },
    ],
  },
  {
    name: "Memory & Knowledge",
    rows: [
      { feature: "AI remembers across sessions", vault: true, notion: false },
      { feature: "Memory timeline with versioning", vault: true, notion: false },
      { feature: "Rollback to any memory state", vault: true, notion: false },
      { feature: "Chain verification (tamper-proof audit)", vault: true, notion: false },
      { feature: "Daily digest emails", vault: true, notion: false },
    ],
  },
  {
    name: "Privacy & Ownership",
    rows: [
      { feature: "Open source", vault: "MIT License", notion: false },
      { feature: "Local-first / offline mode", vault: true, notion: "Limited offline" },
      { feature: "Self-hostable", vault: true, notion: false },
      { feature: "Plain markdown files on disk", vault: true, notion: false },
      { feature: "BYOK (no vendor AI lock-in)", vault: true, notion: false },
      { feature: "Data export", vault: "Native markdown files", notion: "CSV / Markdown export" },
    ],
  },
  {
    name: "Pricing",
    rows: [
      { feature: "Free tier", vault: "Yes (full editor + BYOK)", notion: "Yes (limited blocks)" },
      { feature: "Team plan", vault: "N/A (individual-first)", notion: "$10/seat/month" },
      { feature: "AI add-on cost", vault: "BYOK (pay your provider)", notion: "Bundled in Business ($20/user/mo)" },
      { feature: "Pro features", vault: "$9/month", notion: "$10/month (Plus)" },
    ],
  },
  {
    name: "Platform & Ecosystem",
    rows: [
      { feature: "Desktop app", vault: true, notion: true },
      { feature: "Web app", vault: true, notion: true },
      { feature: "API", vault: true, notion: true },
      { feature: "Integrations", vault: "Growing", notion: "Hundreds" },
      { feature: "Contribute to source code", vault: true, notion: false },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={18} className="text-green-500 mx-auto" />;
  if (value === false) return <X size={18} className="text-red-400/60 mx-auto" />;
  return <span className="text-sm text-muted">{value}</span>;
}

export default function CompareNotionPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Novyx Vault vs Notion — How They Compare (2026)",
    description:
      "An honest, detailed comparison of Novyx Vault and Notion for personal knowledge management and productivity.",
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
            Novyx Vault vs Notion
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Every AI notes app does RAG over your files. Vault has true persistent AI memory
            that survives sessions, consolidates over time, and can be rolled back. Here&apos;s
            how Vault and Notion compare for knowledge management.
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
                    <th className="text-center px-4 py-3 font-semibold text-muted w-28">Notion</th>
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
                      <td className="px-4 py-3 text-center"><CellValue value={row.notion} /></td>
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
                Notion and Novyx Vault take very different approaches to note-taking. With over
                100 million users, Notion uses a proprietary block-based editor that excels at
                databases, tables, Kanban boards, and project management. It is a team-first tool
                designed for collaboration.
              </p>
              <p>
                Vault uses plain markdown files. Your notes are real files on disk (in desktop mode)
                or synced via Supabase in cloud mode. This means zero lock-in &mdash; you can open
                your notes in any text editor, back them up with Git, or migrate them anywhere.
              </p>
              <p>
                If you need databases, project boards, and team wikis, Notion is the stronger
                choice. If you want a focused writing environment with AI that actually remembers
                your work, Vault is built for that.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">AI Features</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Notion has invested heavily in AI, offering built-in AI writing, summarization, and
                recently AI agents. But Notion&apos;s AI does RAG over your pages &mdash; it does
                not build persistent memory across conversations. AI is bundled into the Business
                tier at $20/user/month.
              </p>
              <p>
                Vault&apos;s AI is different in two fundamental ways. First, it has true persistent
                memory that survives sessions, consolidates over time, and can be rolled back to
                any previous state. Second, it uses BYOK (Bring Your Own Key) with 20+ providers,
                so you choose and pay your AI provider directly instead of being locked into a
                single vendor.
              </p>
              <p>
                Notion&apos;s AI agents are more capable for task automation within the Notion
                ecosystem. Vault&apos;s AI is more capable for long-term knowledge work where
                context accumulation matters.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Memory</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                This is where Vault is in a category of its own. Powered by the Novyx SDK, Vault
                gives your AI a persistent, versioned memory layer. Every AI interaction is
                remembered, timestamped, and auditable. You can browse the full timeline, verify
                the chain of memories, and roll back to any previous state.
              </p>
              <p>
                Notion&apos;s AI does not have an equivalent. It can access your Notion pages for
                context, but it does not build persistent memory across conversations or offer
                memory management features.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Privacy & Ownership</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Notion stores all data on their servers. There is no local-first option, no
                self-hosting, and no way to run Notion without an internet connection (beyond
                limited offline caching). Your data lives in Notion&apos;s infrastructure.
              </p>
              <p>
                Vault offers a desktop app that stores notes as plain markdown files on your
                machine &mdash; no cloud, no account, no internet required. The entire codebase is
                open source under the MIT license. You can self-host the cloud version on your own
                infrastructure if you want full control.
              </p>
              <p>
                With Vault&apos;s BYOK model, your AI API keys are encrypted at rest and used only
                to call the provider you configured. Novyx Labs never rebrokers them. With Notion,
                your data passes through their AI pipeline.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Pricing</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Notion&apos;s free tier has limitations on block storage and file uploads. The Plus
                plan is $10/month, and team plans start at $10/seat/month. Full AI features are
                bundled into the Business tier at $20/user/month, and the cost scales with team
                size.
              </p>
              <p>
                Vault&apos;s free tier includes the full editor, wiki-links, knowledge graph, 20+
                AI providers, cloud sync, and publishing &mdash; with no block limits. The $9/month
                Pro plan adds persistent AI memory, Ghost Connections, cortex insights, voice
                capture, and the full audit trail. Since AI is BYOK, you pay your provider directly
                at their rates.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Who Should Use What?</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                <strong>Choose Notion</strong> if you need a team workspace with databases, project
                management, and real-time collaboration. Notion excels as an all-in-one tool for
                teams that want everything in one place.
              </p>
              <p>
                <strong>Choose Novyx Vault</strong> if you are an individual who wants a focused
                writing environment with AI that actually remembers your work. Vault is built for
                knowledge workers, researchers, and developers who value privacy, open source, and
                long-term AI context.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pt-8 pb-8">
          <h2 className="text-2xl font-bold mb-4">Ready to try Novyx Vault?</h2>
          <p className="text-muted mb-8">
            Free to use. No credit card required.
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
            <Link href="/compare/obsidian" className="hover:text-foreground transition-colors">vs Obsidian</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
