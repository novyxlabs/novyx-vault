import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0b",
        color: "#e4e4e7",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>
        <Link
          href="/"
          style={{ color: "#6366f1", textDecoration: "none", fontSize: 14 }}
        >
          &larr; Back to Noctivault
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "#71717a", marginBottom: 32 }}>
          Last updated: March 2026
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
        </Section>

        <Section title="What We Do NOT Collect or Store">
          <strong>AI provider API keys:</strong> Your OpenAI, Anthropic, or other
          AI provider API keys are stored in your browser&apos;s localStorage only.
          They are sent to our server to proxy AI requests but are never persisted
          on our servers or in any database.
          <br /><br />
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
          <a href="https://supabase.com/privacy" style={{ color: "#6366f1" }}>
            Supabase Privacy Policy
          </a>.
          <br /><br />
          <strong>Novyx:</strong> AI memory and feature gating.
          See{" "}
          <a href="https://novyxlabs.com" style={{ color: "#6366f1" }}>
            novyxlabs.com
          </a>.
          <br /><br />
          <strong>AI Providers:</strong> When you use AI features, your prompts
          are sent to whichever provider you configure (OpenAI, Anthropic, etc.)
          using your own API key. Their privacy policies apply to that data.
          <br /><br />
          <strong>Vercel:</strong> Hosting and anonymized analytics.
          See{" "}
          <a href="https://vercel.com/legal/privacy-policy" style={{ color: "#6366f1" }}>
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
          <a href="https://github.com/novyxlabs/noctivault/issues" style={{ color: "#6366f1" }}>
            GitHub Issues
          </a>{" "}
          or at the Novyx Labs website.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.7, color: "#a1a1aa" }}>{children}</div>
    </div>
  );
}
