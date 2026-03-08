# Novyx Vault

## Stack
Next.js 16 + React 19 + TypeScript + Tailwind CSS 4. Supabase for auth and Postgres.

## Deploy
Git push to main triggers Vercel auto-deploy (region: iad1).

## Auth
Supabase handles auth. OAuth callback at /api/auth/callback. Server-side sign-out at /api/auth/signout. Password reset flow: /forgot-password → email → /auth/confirm?type=recovery → /reset-password.

## Storage
STORAGE_MODE=supabase for cloud. Unset for local filesystem (~/SecondBrain/).

## Novyx Integration
Uses Novyx SDK for persistent AI memory. Pro-gated features: Graph, Insights, Replay, Audit.

## Open Source
This repo is being prepared for open source. Frame it as a reference implementation for building on Novyx, not just a notes app.
