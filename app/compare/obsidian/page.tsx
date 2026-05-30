import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Novyx Vault vs Obsidian (2026 Comparison)",
  description:
    "An honest comparison of Novyx Vault and Obsidian for markdown knowledge work, local files, AI memory, providers, privacy, and pricing.",
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
      { feature: "Slash commands", vault: true, obsidian: "Plugin-dependent" },
      { feature: "Plugin / extension ecosystem", vault: "Limited", obsidian: "Large" },
      { feature: "Mobile apps", vault: false, obsidian: true },
      { feature: "Templates", vault: true, obsidian: true },
    ],
  },
  {
    name: "AI Features",
    rows: [
      { feature: "AI chat", vault: "Native", obsidian: "Plugin-dependent" },
      { feature: "Persistent AI memory", vault: "Native", obsidian: "Plugin-dependent" },
      { feature: "Memory rollback & audit trail", vault: "Native", obsidian: false },
      { feature: "Ghost Connections (AI-discovered links)", vault: "Native", obsidian: "Plugin-dependent" },
      { feature: "Entity extraction & insights", vault: "Native", obsidian: "Plugin-dependent" },
      { feature: "BYOK AI providers", vault: true, obsidian: "Plugin-dependent" },
      { feature: "Voice capture & transcription", vault: "Native", obsidian: "Plugin-dependent" },
      { feature: "AI writing tools (Brain Dump, Clip Remix)", vault: "Native", obsidian: "Plugin-dependent" },
    ],
  },
  {
    name: "Memory & Knowledge",
    rows: [
      { feature: "AI remembers across sessions", vault: "Native", obsidian: "Plugin-dependent" },
      { feature: "Memory timeline with versioning", vault: "Native", obsidian: false },
      { feature: "Rollback to any memory state", vault: "Native", obsidian: false },
      { feature: "Chain verification for memory audit", vault: "Native", obsidian: false },
      { feature: "Daily digest emails", vault: "Native", obsidian: "Plugin-dependent" },
    ],
  },
  {
    name: "Privacy & Ownership",
    rows: [
      { feature: "License", vault: "MIT open source", obsidian: "Proprietary" },
      { feature: "Desktop-local files", vault: true, obsidian: true },
      { feature: "Self-hostable", vault: true, obsidian: false },
      { feature: "Plain markdown files on disk", vault: true, obsidian: true },
      { feature: "BYOK (no vendor AI lock-in)", vault: true, obsidian: "Plugin-dependent" },
      { feature: "End-to-end encrypted sync", vault: false, obsidian: "Paid Sync add-on" },
    ],
  },
  {
    name: "Pricing",
    rows: [
      { feature: "Core app", vault: "Free editor + BYOK", obsidian: "Free without limits" },
      { feature: "Sync / hosted workspace", vault: "Optional cloud mode", obsidian: "$4/user/mo annual" },
      { feature: "Publish to web", vault: "Included", obsidian: "$8/site/mo annual" },
      { feature: "Commercial license", vault: "MIT", obsidian: "Optional $50/user/yr" },
      { feature: "Pro / AI memory features", vault: "$9/month", obsidian: "Plugin/service-dependent" },
    ],
  },
  {
    name: "Community & Ecosystem",
    rows: [
      { feature: "Community plugins", vault: "Limited", obsidian: "Large ecosystem" },
      { feature: "Community themes", vault: "Limited", obsidian: "Large ecosystem" },
      { feature: "Developer extension surface", vault: "Source code", obsidian: "Plugin API" },
      { feature: "Market maturity", vault: "Newer", obsidian: "Mature" },
      { feature: "Contribute to source code", vault: true, obsidian: false },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={18} className="text-green-500 mx-auto" />;
  if (value === false) return <X size={18} className="text-red-400/60 mx-auto" />;
  if (value === "Plugin-dependent") return <span className="inline-flex items-center justify-center gap-1 text-sm text-muted"><Minus size={14} />Plugin</span>;
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
    dateModified: "2026-05-30",
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

      <main className="max-w-5xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="pt-14 pb-12">
          <div className="mb-5 inline-flex border border-sidebar-border px-3 py-1.5 text-xs text-muted">
            Last checked: May 30, 2026
          </div>
          <h1 className="max-w-4xl text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Obsidian is the benchmark. Vault is the AI-memory wedge.
          </h1>
          <p className="text-lg text-muted max-w-3xl">
            If you want the largest local-first markdown ecosystem, Obsidian is still the standard.
            Novyx Vault is for people who want that markdown workflow plus inspectable AI memory,
            rollback, audit trails, and provider choice built into the product.
          </p>
          <div className="mt-8 grid gap-px border border-sidebar-border bg-sidebar-border md:grid-cols-2">
            <div className="bg-background p-5">
              <h2 className="text-base font-semibold">Choose Obsidian if</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>You need mature mobile apps today.</li>
                <li>You rely on a large plugin and theme ecosystem.</li>
                <li>Your workflow is already heavily customized around local files.</li>
              </ul>
            </div>
            <div className="bg-background p-5">
              <h2 className="text-base font-semibold">Choose Vault if</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>You want AI memory you can inspect, audit, and roll back.</li>
                <li>You want built-in BYOK across hosted and local providers.</li>
                <li>You want an MIT-licensed product you can self-host or fork.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        {sections.map((section) => (
          <section key={section.name} className="mb-12">
            <h2 className="text-xl font-bold mb-4">{section.name}</h2>
            <div className="rounded-lg border border-sidebar-border overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-card-bg">
                    <th className="text-left px-4 py-3 font-semibold text-muted">Feature</th>
                    <th className="text-center px-4 py-3 font-semibold text-accent w-32">Vault</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted w-32">Obsidian</th>
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
                Where Obsidian pulls ahead is its mature plugin ecosystem. You can customize Obsidian to do almost
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
                Obsidian AI workflows usually depend on plugins and retrieval over local files.
                The exact behavior depends on the plugin and provider you choose.
              </p>
              <p>
                Novyx Vault&apos;s differentiator is the memory layer. It can preserve useful context
                across sessions, consolidate over time, and be rolled back to a previous state.
                It also discovers likely hidden connections between your notes (Ghost
                Connections), extracts entities and relationships, and offers a full memory
                timeline with audit trail.
              </p>
              <p>
                Vault supports BYOK (Bring Your Own Key) across hosted providers,
                OpenAI-compatible endpoints, and local options such as Ollama and LM Studio.
                Obsidian&apos;s provider support depends on plugins and external services.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Memory</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                This is Vault&apos;s strongest differentiator. Powered by the Novyx SDK, Vault
                gives your AI a persistent memory layer with timestamped operations and versioned
                history. You can browse the timeline, verify the chain of memories, and roll back
                to a previous state.
              </p>
              <p>
                Obsidian does not ship an equivalent native memory layer. AI memory behavior
                depends on the plugins and services a user installs.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Privacy & Ownership</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Both tools respect privacy. Obsidian stores notes locally by default and offers
                a paid encrypted multi-device service. Vault stores notes locally in desktop mode as plain
                markdown files and is self-hostable; its hosted cloud mode is a separate workspace
                model rather than local-file mirroring.
              </p>
              <p>
                The key difference is openness. Vault is open source under the MIT license &mdash;
                you can read every line of code, contribute features, or fork the entire project.
                Obsidian is proprietary software. With Vault, you can verify the implementation,
                modify it, and keep a working fork if the product ever moves in a direction you
                do not want.
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
                Obsidian offers a strong free local app with optional paid add-ons. As of May 30,
                2026, official Obsidian pricing lists Sync at $4/user/month billed annually and
                Publish at $8/site/month billed annually. Obsidian&apos;s commercial license is
                encouraged for organizations but is not required.
              </p>
              <p>
                Vault&apos;s free tier includes the full editor, wiki-links, knowledge graph, BYOK
                provider setup, the desktop/local app, and publishing. Its $9/month Pro plan adds
                persistent AI memory, Ghost Connections, cortex insights, voice capture, audit
                history, and hosted cloud features such as account-backed access and sharing.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Community</h2>
            <div className="space-y-3 text-muted leading-relaxed">
              <p>
                Obsidian has a mature, thriving community. Its plugin and theme ecosystem is one
                of the strongest reasons to choose it.
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
            Free to use. No credit card required. Import markdown files and keep your links.
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
          </nav>
        </div>
      </footer>
    </div>
  );
}
