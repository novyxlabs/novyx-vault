import Link from "next/link";

export default function TermsPage() {
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
          &larr; Back to Novyx Vault
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: "#71717a", marginBottom: 32 }}>
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
          using API keys you provide. Your API keys are stored in your browser
          only and are sent to our server solely to proxy requests to the AI
          provider. We do not store your AI provider API keys on our servers.
          Novyx-powered memory features (remember, recall, cortex) are processed
          through the Novyx API using a per-user key provisioned at sign-up.
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
          <a href="https://github.com/novyxlabs/novyx-vault/issues" style={{ color: "#6366f1" }}>
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
      <p style={{ fontSize: 15, lineHeight: 1.7, color: "#a1a1aa" }}>{children}</p>
    </div>
  );
}
