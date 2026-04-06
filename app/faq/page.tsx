import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ — Novyx Vault",
  description:
    "Frequently asked questions about Novyx Vault: pricing, AI memory, providers, privacy, open source, self-hosting, Obsidian import, and more.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    question: "What is Novyx Vault?",
    answer:
      "Novyx Vault is an open-source, AI-powered personal knowledge base. It combines a markdown editor with wiki-links, a knowledge graph, and persistent AI memory that grows smarter the longer you use it. It is available as a web app and a desktop app for macOS, Windows, and Linux.",
  },
  {
    question: "Is Novyx Vault free?",
    answer:
      "Yes. The free tier includes the full markdown editor, wiki-links, backlinks, knowledge graph, 20+ AI providers (BYOK), cloud sync, and publishing. The $9/month Pro plan adds persistent AI memory, Ghost Connections, cortex insights, voice capture, memory rollback, and the full audit trail.",
  },
  {
    question: "How does AI memory work in Novyx Vault?",
    answer:
      "Novyx Vault uses the Novyx SDK to give your AI assistant persistent memory. Every interaction is stored, timestamped, and versioned. Your AI remembers your projects, preferences, and writing style across sessions. You can browse the full memory timeline, verify the chain of memories, and roll back to any previous state.",
  },
  {
    question: "Can I use my own AI provider with Novyx Vault?",
    answer:
      "Yes. Vault supports 20+ AI providers through BYOK (Bring Your Own Key), including OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama, LM Studio, Groq, Together, Mistral, xAI Grok, Perplexity, Cohere, and more. Your API keys are stored in your browser only and never sent to Novyx servers.",
  },
  {
    question: "Is Novyx Vault open source?",
    answer:
      "Yes. Novyx Vault is fully open source under the MIT license. The complete source code is available on GitHub. You can read every line of code, contribute features, report bugs, or fork the project for your own use.",
  },
  {
    question: "How does Novyx Vault compare to Obsidian?",
    answer:
      "Both use markdown and support wiki-links, backlinks, and a knowledge graph. Vault wins on AI memory (persistent across sessions), BYOK provider breadth (20+), open source (MIT), and free cloud sync. Obsidian wins on plugin ecosystem (2,000+), mobile apps, and maturity. See our detailed comparison at /compare/obsidian.",
  },
  {
    question: "Can I self-host Novyx Vault?",
    answer:
      "Yes. Since Vault is open source, you can self-host the entire application on your own infrastructure. It is built with Next.js, React, TypeScript, and Supabase. The desktop app also runs fully locally without any cloud dependency.",
  },
  {
    question: "Does Novyx Vault work offline?",
    answer:
      "Yes. The desktop app stores notes as plain markdown files on your machine and works completely offline with no internet connection required. The web app requires an internet connection for cloud sync but caches your notes locally.",
  },
  {
    question: "What AI providers does Novyx Vault support?",
    answer:
      "Vault supports OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama, LM Studio, Groq, Together, Mistral, xAI Grok, Perplexity, Cohere, Cerebras, SambaNova, Fireworks, Moonshot, MiniMax, OpenRouter, Nvidia NIM, Hyperbolic, and any OpenAI-compatible API endpoint.",
  },
  {
    question: "Is my data private in Novyx Vault?",
    answer:
      "Yes. In desktop mode, your notes are plain markdown files on your machine that never leave your computer. In cloud mode, data is stored in Supabase with row-level security. API keys are stored in your browser only. The codebase is open source so you can verify exactly how your data is handled.",
  },
  {
    question: "Can I import from Obsidian?",
    answer:
      "Yes. Novyx Vault includes a built-in Obsidian import feature. Since both tools use plain markdown files with wiki-link syntax, your notes transfer cleanly. Tags, links, and folder structure are preserved during import.",
  },
  {
    question: "What is Novyx Core?",
    answer:
      "Novyx Core is the SDK and API that powers Vault's AI memory layer. It provides persistent memory, audit trails, chain verification, entity extraction, and more. Novyx Core is a separate product from Novyx Labs that any developer can use to add persistent memory to their own AI applications.",
  },
];

export default function FAQPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
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

      <main className="max-w-3xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Everything you need to know about Novyx Vault.
          </p>
        </section>

        {/* FAQ List */}
        <section className="space-y-8">
          {faqs.map((faq) => (
            <div key={faq.question} className="border-b border-sidebar-border pb-8">
              <h2 className="text-lg font-bold mb-3">{faq.question}</h2>
              <p className="text-muted leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="text-center pt-16 pb-8">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted mb-8">
            Try Novyx Vault for free or reach out to us directly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started Free
              <ArrowRight size={18} />
            </a>
            <a
              href="mailto:blake@novyxlabs.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-sidebar-border font-semibold hover:bg-sidebar-border/20 transition-colors text-sm"
            >
              Contact Us
            </a>
          </div>
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
            <Link href="/compare/obsidian" className="hover:text-foreground transition-colors">vs Obsidian</Link>
            <Link href="/compare/notion" className="hover:text-foreground transition-colors">vs Notion</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
