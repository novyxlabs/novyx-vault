import type { Metadata } from "next";
import Link from "next/link";
import { Github } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Novyx Vault. Read our terms governing your use of the AI-powered notes platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav aria-label="Main navigation" className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight">Novyx Vault</Link>
        <div className="flex items-center gap-4">
          <Link href="/features" className="text-sm text-muted hover:text-foreground transition-colors py-3 px-1">Features</Link>
          <a
            href="https://github.com/novyxlabs/novyx-vault"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-muted hover:text-foreground transition-colors p-2"
          >
            <Github size={20} />
          </a>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <main className="max-w-[680px] mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-muted mb-8">
          Last updated: March 2026
        </p>

        <Section title="1. What Novyx Vault Is">
          Novyx Vault is an open-source, AI-powered note-taking application built
          by Novyx Labs. You can use it locally on your own machine (desktop
          mode) or with a cloud account (cloud mode) for syncing and
          collaboration features.
        </Section>

        <Section title="2. Accounts">
          When you create a cloud account, you provide an email address and
          password, or sign in via Google or GitHub. You are responsible for
          keeping your credentials secure. One account per person, please.
        </Section>

        <Section title="3. Your Content">
          You own everything you write. We do not claim any rights to your
          notes, documents, or any content you create. In desktop mode, your
          files stay on your machine as plain markdown. In cloud mode, your notes
          are stored in Supabase with row-level security so only you can access
          them.
        </Section>

        <Section title="4. AI Features">
          Novyx Vault connects to AI providers (OpenAI, Anthropic, and others)
          using API keys you provide. In cloud mode, your API keys are encrypted
          with a server-held secret and stored encrypted at rest in your account
          settings; they are decrypted server-side only to proxy requests to the
          AI provider you configured. In desktop mode, keys remain in your
          local browser and are not transmitted to our servers. Novyx-powered
          memory features (remember, recall, cortex) are processed through the
          Novyx API using a per-user key provisioned at sign-up.
        </Section>

        <Section title="5. Acceptable Use">
          Don&apos;t use Novyx Vault to store or distribute illegal content, spam,
          malware, or anything that violates others&apos; rights. Don&apos;t
          attempt to access other users&apos; data or disrupt the service.
        </Section>

        <Section title="6. Availability">
          We aim to keep Novyx Vault available but don&apos;t guarantee 100%
          uptime. The service is provided &quot;as is&quot; without warranties.
          We may update, modify, or discontinue features with reasonable notice.
        </Section>

        <Section title="7. Termination">
          You can delete your account at any time. We may suspend accounts that
          violate these terms. On account deletion, your cloud data is
          permanently removed.
        </Section>

        <Section title="8. Open Source">
          Novyx Vault&apos;s source code is available on GitHub. The software is
          provided under its open-source license. These Terms of Service apply
          to the hosted service at vault.novyxlabs.com, not to self-hosted
          instances.
        </Section>

        <Section title="9. Changes">
          We may update these terms. Continued use after changes constitutes
          acceptance. We&apos;ll make reasonable efforts to notify users of
          significant changes.
        </Section>

        <Section title="10. Contact">
          Questions? Reach us via{" "}
          <a href="https://github.com/novyxlabs/novyx-vault/issues" className="text-accent hover:underline">
            GitHub Issues
          </a>{" "}
          or at the Novyx Labs website.
        </Section>
      </main>

      <footer className="border-t border-sidebar-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            Built by{" "}
            <a href="https://novyxlabs.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent transition-colors">
              Novyx Labs
            </a>
          </p>
          <nav aria-label="Footer" className="flex items-center gap-4 text-sm text-muted">
            <Link href="/features" className="hover:text-foreground transition-colors py-3 px-1">Features</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors py-3 px-1">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors py-3 px-1">Privacy</Link>
            <a href="https://github.com/novyxlabs/novyx-vault" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors py-3 px-1">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-[15px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}
