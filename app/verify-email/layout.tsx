import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to complete your Novyx Vault account setup.",
  alternates: { canonical: "/verify-email" },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
