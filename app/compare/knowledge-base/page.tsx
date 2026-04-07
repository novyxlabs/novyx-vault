import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

export const metadata: Metadata = {
  title:
    "Novyx Vault vs LLM Knowledge Bases — Karpathy's Wiki Pattern, With Memory",
  description:
    "Andrej Karpathy described a powerful LLM Knowledge Base workflow: raw sources, an LLM-compiled wiki, and structured conventions. Novyx Vault implements that vision with persistent AI memory, rollback, and zero setup.",
  alternates: { canonical: "/compare/knowledge-base" },
  keywords: [
    "Karpathy knowledge base",
    "LLM knowledge base",
    "LLM wiki",
    "AI knowledge management",
    "Novyx Vault",
    "persistent AI memory",
    "Obsidian LLM",
    "knowledge base workflow",
  ],
};

const comparisonRows = [
  {
    feature: "Raw / immutable source documents",
    wiki: true,
    vault: true,
  },
  {
    feature: "LLM-compiled structured notes",
    wiki: true,
    vault: true,
  },
  {
    feature: "Interlinked wiki pages",
    wiki: true,
    vault: true,
  },
  {
    feature: "Ingest new sources across pages",
    wiki: "Manual prompt",
    vault: "Automatic on capture",
  },
  {
    feature: "Query with citations",
    wiki: true,
    vault: true,
  },
  {
    feature: "Lint (contradictions, gaps, orphans)",
    wiki: "Manual prompt",
    vault: "Ghost Connections + Cortex",
  },
  {
    feature: "Persistent AI memory across sessions",
    wiki: false,
    vault: true,
  },
  {
    feature: "Memory timeline & versioning",
    wiki: false,
    vault: true,
  },
  {
    feature: "Rollback to any previous state",
    wiki: "Git (manual)",
    vault: "Built-in, one click",
  },
  {
    feature: "Tamper-proof audit trail",
    wiki: false,
    vault: true,
  },
  {
    feature: "AI-discovered connections (Ghost Connections)",
    wiki: false,
    vault: true,
  },
  {
    feature: "Interactive knowledge graph",
    wiki: false,
    vault: true,
  },
  {
    feature: "20+ AI providers (BYOK)",
    wiki: "Single model",
    vault: true,
  },
  {
    feature: "Frontend / viewer",
    wiki: "Obsidian (manual setup)",
    vault: "Built-in (web + desktop)",
  },
  {
    feature: "Setup required",
    wiki: "Folder structure + prompts + Obsidian config",
    vault: "Sign up and start writing",
  },
  {
    feature: "Open source",
    wiki: "Varies",
    vault: "MIT License",
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)
    return <Check size={18} className="text-green-500 mx-auto" />;
  if (value === false)
    return <X size={18} className="text-red-400/60 mx-auto" />;
  return <span className="text-sm text-muted">{value}</span>;
}

export default function CompareKnowledgeBasePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline:
      "Novyx Vault vs LLM Knowledge Bases — Karpathy's Wiki Pattern, With Memory",
    description:
      "Andrej Karpathy described a powerful LLM Knowledge Base workflow. Novyx Vault implements that vision with persistent AI memory, rollback, and zero setup.",
    author: {
      "@type": "Organization",
      name: "Novyx Labs",
      url: "https://novyxlabs.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Novyx Labs",
      url: "https://novyxlabs.com",
    },
    datePublished: "2026-04-06",
    dateModified: "2026-04-06",
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav
        aria-label="Main navigation"
        className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5"
      >
        <Link
          href="/"
          className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
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
            Novyx Vault vs LLM Knowledge Bases
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Andrej Karpathy described the ideal LLM Knowledge Base: raw sources,
            an LLM-compiled wiki, and structured conventions. Vault takes that
            vision and adds persistent memory, rollback, and zero setup.
          </p>
        </section>

        {/* What Karpathy Described */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-3">
            What Karpathy Described
          </h2>
          <div className="space-y-3 text-muted leading-relaxed">
            <p>
              In early April 2026, Andrej Karpathy shared his workflow for
              building a personal knowledge base with LLMs. The core insight is
              elegant: the tedious part of maintaining a knowledge base
              isn&apos;t the reading or the thinking &mdash; it&apos;s the
              bookkeeping. LLMs handle the bookkeeping.
            </p>
            <p>
              The pattern has three layers. First, a <strong>/raw</strong> folder
              of immutable source documents &mdash; PDFs, transcripts, articles,
              anything you want to remember. Second, a{" "}
              <strong>wiki</strong> of structured, interlinked markdown files
              that an LLM &ldquo;compiles&rdquo; from those raw sources. Third,
              a <strong>schema</strong> of conventions the LLM follows when
              building and updating the wiki.
            </p>
            <p>
              Three key operations keep the wiki alive:{" "}
              <strong>Ingest</strong> (a new source touches 10&ndash;15 wiki
              pages), <strong>Query</strong> (synthesize answers with citations
              back to raw sources), and <strong>Lint</strong> (find
              contradictions, orphan pages, and knowledge gaps). Karpathy uses
              Obsidian as the frontend viewer for the markdown files.
            </p>
          </div>
        </section>

        {/* What's Missing */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-3">
            What&apos;s Missing From the Pattern
          </h2>
          <div className="space-y-3 text-muted leading-relaxed">
            <p>
              Karpathy&apos;s pattern is a great starting point, but it leaves
              several hard problems unsolved:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>No persistent AI memory.</strong> Each LLM session starts
                fresh. The model that compiled your wiki yesterday doesn&apos;t
                remember doing it today. Context built up over weeks of
                interaction is lost between sessions.
              </li>
              <li>
                <strong>No rollback or audit trail.</strong> If the LLM
                introduces an error during an ingest pass &mdash; a subtle
                factual mistake, a broken cross-reference, a merged concept that
                shouldn&apos;t have been &mdash; you have no built-in way to
                detect it or revert. Git helps, but it&apos;s manual and
                coarse-grained.
              </li>
              <li>
                <strong>No automatic connection discovery.</strong> The LLM
                creates links you explicitly ask for, but it doesn&apos;t
                proactively surface hidden relationships across your knowledge.
              </li>
              <li>
                <strong>Manual setup.</strong> You need to configure Obsidian,
                structure the folder hierarchy, write the schema conventions, and
                craft the right prompts. It&apos;s a power-user workflow that
                takes real effort to bootstrap.
              </li>
              <li>
                <strong>Single model lock-in.</strong> The pattern typically runs
                against one LLM provider. Switching models means re-tuning
                prompts and hoping the schema conventions still hold.
              </li>
            </ul>
          </div>
        </section>

        {/* How Vault Fills the Gap */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-3">
            How Vault Fills the Gap
          </h2>
          <div className="space-y-3 text-muted leading-relaxed">
            <p>
              Novyx Vault isn&apos;t a replacement for Karpathy&apos;s insight
              &mdash; it&apos;s an implementation of it, with the missing pieces
              built in.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>Persistent AI memory.</strong> Vault&apos;s AI remembers
                across sessions. Every interaction is stored, timestamped, and
                versioned. The context you build up over weeks compounds instead
                of resetting.
              </li>
              <li>
                <strong>Ghost Connections.</strong> Vault&apos;s AI proactively
                discovers links between your notes that you didn&apos;t create
                &mdash; surfacing relationships across topics, projects, and time
                periods you might never have noticed.
              </li>
              <li>
                <strong>Memory timeline and rollback.</strong> Every memory state
                is versioned. You can browse the full timeline, verify the chain,
                and roll back to any previous point with one click. No Git
                required.
              </li>
              <li>
                <strong>Built-in wiki-link graph.</strong> An interactive
                knowledge graph ships out of the box. No Obsidian configuration,
                no plugins &mdash; your notes and their connections are
                visualized automatically.
              </li>
              <li>
                <strong>20+ AI providers.</strong> Bring your own API key for
                OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama, local models,
                and more. Switch providers without rebuilding your knowledge
                base.
              </li>
              <li>
                <strong>Zero setup.</strong> Sign up and start writing. Vault
                handles the folder structure, the schema conventions, and the
                bookkeeping automatically. Karpathy&apos;s vision, without the
                bootstrapping.
              </li>
            </ul>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">
            Raw Wiki Pattern vs Novyx Vault
          </h2>
          <div className="rounded-xl border border-sidebar-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card-bg">
                  <th className="text-left px-4 py-3 font-semibold text-muted">
                    Feature
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted w-36">
                    Raw Wiki Pattern
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-accent w-36">
                    Vault
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? "bg-background" : "bg-card-bg/50"}
                  >
                    <td className="px-4 py-3 text-muted">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      <CellValue value={row.wiki} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CellValue value={row.vault} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom Line */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-3">The Bottom Line</h2>
          <div className="space-y-3 text-muted leading-relaxed">
            <p>
              Karpathy nailed the core idea: LLMs should handle the bookkeeping
              of knowledge management, not humans. The raw-wiki-schema pattern is
              a sound architecture.
            </p>
            <p>
              Vault takes that architecture and makes it a product &mdash;
              persistent memory so the AI&apos;s understanding compounds over
              time, a versioned timeline so you can always go back, automatic
              connection discovery so nothing falls through the cracks, and zero
              setup so you don&apos;t need to be a power user to get started.
            </p>
            <p>
              Karpathy&apos;s vision, plus persistent memory, plus zero setup.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pt-8 pb-8">
          <h2 className="text-2xl font-bold mb-4">
            Ready to try Novyx Vault?
          </h2>
          <p className="text-muted mb-8">
            Free to use. No credit card required. Your AI remembers everything.
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
            <a
              href="https://novyxlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-accent transition-colors"
            >
              Novyx Labs
            </a>
          </p>
          <nav
            aria-label="Footer"
            className="flex items-center gap-6 text-sm text-muted"
          >
            <Link
              href="/"
              className="hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/faq"
              className="hover:text-foreground transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/compare/obsidian"
              className="hover:text-foreground transition-colors"
            >
              vs Obsidian
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
