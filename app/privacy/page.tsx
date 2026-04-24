import type { Metadata } from "next";
import Link from "next/link";
import { Github } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Novyx Vault. How we handle your data, API keys, and notes — including server-side encryption of provider keys in cloud mode.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-muted mb-8">
          Last updated: April 2026
        </p>

        <Section title="What We Collect">
          <strong>Account data:</strong> Email address, display name, and
          authentication provider (Google, GitHub, or email/password). This is
          stored in Supabase and used solely for authentication.
          <br /><br />
          <strong>Notes (cloud mode):</strong> When using cloud mode, your notes
          are stored in Supabase with row-level security. Only you can read your
          own notes. In desktop mode, notes stay on your local filesystem and
          never leave your machine.
          <br /><br />
          <strong>AI Memory (Novyx):</strong> When you use AI features,
          conversation context and memories are stored server-side via the Novyx
          API. This enables persistent memory across sessions. Each user has an
          isolated memory space.
          <br /><br />
          <strong>Analytics:</strong> We use Vercel Analytics, which collects
          anonymized page view data. No personal information or note content is
          included in analytics.
          <br /><br />
          <strong>AI provider API keys:</strong> In cloud mode, API keys for
          providers you configure (OpenAI, Anthropic, and others) are encrypted
          with a server-held secret and stored encrypted at rest in your account
          settings. They are decrypted server-side only when you make an AI
          request, and the plaintext value is never returned to the client except
          through an explicit, rate-limited reveal action in Settings. In
          desktop mode, keys are stored in your browser&apos;s localStorage and are
          not transmitted to our servers. We do not share your keys with any
          party other than the AI provider you configure each key for.
        </Section>

        <Section title="What We Do NOT Collect or Store">
          <strong>Note content for training:</strong> We do not use your notes or
          AI conversations to train any models. Your content is yours.
        </Section>

        <Section title="How Data Is Protected">
          All data in transit uses HTTPS/TLS. Supabase provides encryption at
          rest for stored data. Row-level security policies ensure users can only
          access their own data. The Supabase service role key is used
          server-side only and never exposed to clients.
        </Section>

        <Section title="Third-Party Services">
          <strong>Supabase:</strong> Authentication and cloud data storage.
          See{" "}
          <a href="https://supabase.com/privacy" className="text-accent hover:underline">
            Supabase Privacy Policy
          </a>.
          <br /><br />
          <strong>Novyx:</strong> AI memory and feature gating.
          See{" "}
          <a href="https://novyxlabs.com" className="text-accent hover:underline">
            novyxlabs.com
          </a>.
          <br /><br />
          <strong>AI Providers:</strong> When you use AI features, your prompts
          are sent to whichever provider you configure (OpenAI, Anthropic, etc.)
          using your own API key. Their privacy policies apply to that data.
          <br /><br />
          <strong>Vercel:</strong> Hosting and anonymized analytics.
          See{" "}
          <a href="https://vercel.com/legal/privacy-policy" className="text-accent hover:underline">
            Vercel Privacy Policy
          </a>.
        </Section>

        <Section title="Data Retention">
          Your data is retained as long as your account is active. You can
          delete individual notes, clear AI memories through the Memory
          Dashboard, or request full account deletion. On account deletion, all
          associated data is permanently removed from Supabase.
        </Section>

        <Section title="Your Rights">
          You can export all your notes at any time via the app&apos;s export
          feature. You can view and delete your AI memories through the Memory
          Dashboard. You can delete your account and all associated data.
        </Section>

        <Section title="Changes">
          We may update this policy. Continued use after changes constitutes
          acceptance. Significant changes will be communicated through the app
          or via email.
        </Section>

        <Section title="Contact">
          Questions about your data? Reach us via{" "}
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
      <div className="text-[15px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}
