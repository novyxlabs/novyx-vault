# Novyx Vault SEO Audit Report

**URL**: https://vault.novyxlabs.com
**Date**: March 4, 2026
**Overall SEO Health Score**: **18/100**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Meta Tags, OG & Twitter Cards](#1-meta-tags-og--twitter-cards)
3. [Sitemap & Robots.txt](#2-sitemap--robotstxt)
4. [Schema / Structured Data](#3-schema--structured-data)
5. [Technical SEO](#4-technical-seo)
6. [Keyword Research & Targeting](#5-keyword-research--targeting)
7. [AI Search Optimization (GEO)](#6-ai-search-optimization-geo)
8. [Landing Page SEO Copy](#7-landing-page-seo-copy)
9. [Content Strategy](#8-content-strategy)
10. [Prioritized Action Items](#prioritized-action-items)

---

## Executive Summary

Novyx Vault is a local-first AI-powered personal knowledge base positioned as "The only note app where AI gets smarter the longer you use it." The site is **not indexed by Google**, has minimal on-page content (~205 words), no structured data, and no content marketing presence. The technical foundation (Next.js, HTTPS, mobile-responsive) is solid, but the site is essentially invisible to search engines and AI citation systems.

**Top 3 Critical Issues:**
1. Site not indexed by Google — no organic traffic possible
2. Landing page has only ~205 words — far below the 1,000+ word minimum for competitive SaaS queries
3. Title tag is just "Novyx Vault" — no keyword targeting whatsoever

---

## 1. Meta Tags, OG & Twitter Cards

### Current State

| Element | Status | Value |
|---------|--------|-------|
| `<title>` | Weak | "Novyx Vault" (single word, no keywords) |
| `<meta name="description">` | Present | "Your AI-powered second brain for capturing, connecting, and recalling ideas effortlessly." |
| `<meta name="viewport">` | Issue | Disables user zoom (`maximum-scale=1`) |
| OG: title | Present | "Novyx Vault" |
| OG: description | Present | Matches meta description |
| OG: image | Present | `/api/og` (dynamic) |
| OG: url | Missing | Not set |
| OG: type | Missing | Not set |
| OG: site_name | Missing | Not set |
| Twitter: card | Present | `summary_large_image` |
| Twitter: title | Present | "Novyx Vault" |
| Twitter: description | Present | Matches meta description |
| Twitter: image | Present | `/api/og` |
| Canonical URL | Missing | No `<link rel="canonical">` |
| Favicon | Present | Multiple sizes configured |

### Issues

- **Title tag** needs primary keyword: "Novyx Vault — AI-Powered Second Brain for Personal Knowledge Management"
- **No canonical URL** — risks duplicate content issues
- **Viewport blocks zoom** — accessibility violation (WCAG 2.1 SC 1.4.4)
- **No OG:url, OG:type, OG:site_name** — incomplete social sharing
- **No page-specific meta** for /login, /terms, /privacy

### Recommendations

```html
<!-- Homepage title -->
<title>Novyx Vault — AI-Powered Second Brain for Personal Knowledge Management</title>

<!-- Homepage description (150-160 chars) -->
<meta name="description" content="Novyx Vault is an AI-powered second brain that learns your thinking patterns. Capture, connect, and recall ideas with persistent AI memory. Free to start." />

<!-- Fix viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1" />

<!-- Add canonical -->
<link rel="canonical" href="https://vault.novyxlabs.com/" />

<!-- Complete OG tags -->
<meta property="og:url" content="https://vault.novyxlabs.com/" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Novyx Vault" />
```

---

## 2. Sitemap & Robots.txt

### robots.txt — Current

```
User-agent: *
Allow: /

Sitemap: https://vault.novyxlabs.com/sitemap.xml
```

**Issues:**
- No directives for AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
- No `Disallow` for /api/, /login (authenticated routes)
- No crawl-delay

### sitemap.xml — Current

```xml
<urlset>
  <url>
    <loc>https://vault.novyxlabs.com</loc>
    <lastmod>2025-08-01T00:00:00.000Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://vault.novyxlabs.com/login</loc>
    <lastmod>2025-08-01T00:00:00.000Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://vault.novyxlabs.com/terms</loc>
    <lastmod>2025-08-01T00:00:00.000Z</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://vault.novyxlabs.com/privacy</loc>
    <lastmod>2025-08-01T00:00:00.000Z</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
```

**Issues:**
- **Login page at priority 0.8** — should be excluded or priority 0.1 (not indexable content)
- **Only 4 URLs** — need content pages (features, blog, docs, pricing) for crawl budget
- **lastmod dates are stale** (2025-08-01) — should be dynamic
- **No blog/content URLs** — nothing for search engines to index

### Recommendations

- Remove `/login` from sitemap (or set priority 0.1 with `noindex` meta)
- Add planned content pages as they're created
- Make `lastmod` dynamic (use build time or git commit date)
- Add AI crawler directives to robots.txt (see GEO section)

---

## 3. Schema / Structured Data

### Current State

**No JSON-LD or structured data detected on any page.**

### Recommended Schema Markup

#### SoftwareApplication (Homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Novyx Vault",
  "description": "AI-powered second brain for personal knowledge management with persistent AI memory that learns your thinking patterns.",
  "url": "https://vault.novyxlabs.com",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": "Web, macOS, Windows, Linux",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free tier with core features"
  },
  "author": {
    "@type": "Organization",
    "name": "Novyx Labs",
    "url": "https://novyx.ai"
  },
  "featureList": [
    "AI-powered knowledge management",
    "Persistent AI memory",
    "Wiki-style linking",
    "Local-first architecture",
    "Multi-provider AI support"
  ]
}
```

#### Organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Novyx Labs",
  "url": "https://novyx.ai",
  "logo": "https://vault.novyxlabs.com/icon-512.png",
  "sameAs": ["https://github.com/novyxlabs"]
}
```

#### WebSite (with SearchAction)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Novyx Vault",
  "url": "https://vault.novyxlabs.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://vault.novyxlabs.com/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

#### FAQPage (for future FAQ section)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Novyx Vault?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Novyx Vault is an AI-powered second brain that helps you capture, connect, and recall ideas. Unlike other note apps, its AI learns your thinking patterns over time."
      }
    },
    {
      "@type": "Question",
      "name": "Is Novyx Vault free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Novyx Vault offers a free tier with core features including AI-powered notes, wiki-linking, and persistent memory."
      }
    }
  ]
}
```

> **Note**: FAQ schema is deprecated for most sites as of Sept 2023, but may still provide value for SaaS product pages. Consider using only if it enhances the page experience.

---

## 4. Technical SEO

### Crawlability & Indexability

| Check | Status | Details |
|-------|--------|---------|
| HTTPS | Pass | Valid SSL, auto-redirect from HTTP |
| Mobile-responsive | Pass | Responsive layout detected |
| Google indexing | FAIL | Site NOT indexed (`site:vault.novyxlabs.com` returns 0 results) |
| Google Search Console | Unknown | Likely not configured |
| Canonical URLs | FAIL | No canonical tags on any page |
| Hreflang | N/A | English only |

### Performance & Core Web Vitals

| Metric | Status | Notes |
|--------|--------|-------|
| TTFB | Good | Vercel edge network, fast response |
| Font loading | Issue | No `font-display: swap` detected — potential FOIT |
| CLS prevention | Issue | No explicit dimension attributes on dynamic content |
| Preconnect hints | Missing | No `<link rel="preconnect">` for external resources |
| JavaScript bundle | Moderate | Next.js code-splitting helps, but no analysis of bundle size |

### Security & Headers

| Header | Status |
|--------|--------|
| HTTPS | Pass |
| HSTS | Check Vercel defaults |
| CSP | Not detected |
| X-Frame-Options | Not detected |
| X-Content-Type-Options | Not detected |

### Accessibility (SEO-relevant)

| Issue | Impact |
|-------|--------|
| Viewport blocks zoom | WCAG 2.1 violation, may affect mobile rankings |
| No semantic `<main>`, `<header>`, `<nav>` | Reduces content identification for crawlers |
| No ARIA labels on icon-only links | Accessibility and crawlability impact |
| No skip-to-content link | Minor accessibility gap |

### Broken Links

| Link | Status | Location |
|------|--------|----------|
| GitHub repo link | 404 | Landing page — repo is private |
| Any other external links | Need verification | — |

---

## 5. Keyword Research & Targeting

### Primary Target Keywords

| Keyword | Monthly Volume (est.) | Difficulty | Current Ranking |
|---------|----------------------|------------|-----------------|
| second brain app | 5,000–10,000 | High | Not ranked |
| AI note taking app | 3,000–8,000 | High | Not ranked |
| personal knowledge management | 2,000–5,000 | Medium | Not ranked |
| AI-powered notes | 1,000–3,000 | Medium | Not ranked |
| second brain software | 1,000–2,000 | Medium | Not ranked |
| knowledge base app | 1,000–3,000 | Medium-High | Not ranked |
| obsidian alternative | 3,000–5,000 | High | Not ranked |
| notion alternative AI | 1,000–2,000 | Medium | Not ranked |

### Current Keyword Usage on Landing Page

| Keyword | Occurrences | Needed |
|---------|-------------|--------|
| "second brain" | 0 | 3-5 |
| "AI note" / "AI notes" | 0 | 2-4 |
| "knowledge management" | 0 | 2-3 |
| "personal knowledge" | 0 | 1-2 |
| "note-taking" | 0 | 2-3 |
| "AI-powered" | 1 (meta only) | 3-5 (in body) |

### Competitor Landscape

| Competitor | Domain Rating | Indexed Pages | Blog Posts |
|-----------|---------------|---------------|-----------|
| Obsidian | High | 1,000+ | 50+ |
| Notion | Very High | 10,000+ | 200+ |
| Roam Research | Medium-High | 500+ | 30+ |
| Mem.ai | Medium | 200+ | 40+ |
| Reflect Notes | Medium | 100+ | 20+ |

### Differentiation Angle

Novyx Vault's unique value prop — **"AI that gets smarter the longer you use it"** (persistent AI memory via Novyx SDK) — is genuinely differentiated. No major competitor offers this. SEO content should heavily emphasize:

- "AI memory" / "persistent AI memory"
- "AI that learns your thinking"
- "AI second brain that remembers"
- Comparisons: "Unlike Notion AI / Obsidian AI, Novyx Vault remembers across sessions"

---

## 6. AI Search Optimization (GEO)

### AI Crawler Access

| Crawler | Status | Notes |
|---------|--------|-------|
| GPTBot (ChatGPT) | Allowed | No block in robots.txt |
| ClaudeBot (Claude) | Allowed | No block in robots.txt |
| PerplexityBot | Allowed | No block in robots.txt |
| Google-Extended | Allowed | No block in robots.txt |

**Good**: All AI crawlers can access the site. However, there's very little content for them to index.

### llms.txt

**Status**: Not present

**Recommended `/llms.txt`:**

```
# Novyx Vault

> AI-powered second brain with persistent memory that learns your thinking patterns.

## What is Novyx Vault?

Novyx Vault is a local-first personal knowledge management app with AI that gets smarter the longer you use it. It combines wiki-style note-linking with persistent AI memory powered by the Novyx SDK.

## Key Features

- **Persistent AI Memory**: AI remembers your notes, preferences, and thinking patterns across sessions
- **Wiki-Style Linking**: Connect ideas with [[wiki-links]] and visualize your knowledge graph
- **Multi-Provider AI**: Works with OpenAI, Anthropic, DeepSeek, Ollama, and 10+ providers
- **Local-First**: Your data stays on your device (desktop) or in your Supabase instance (cloud)
- **Cross-Platform**: Web, macOS, Windows, Linux (via Tauri)

## Links

- Homepage: https://vault.novyxlabs.com
- Documentation: https://vault.novyxlabs.com/docs (planned)
```

### AI Overview / Citation Readiness

| Factor | Status | Impact |
|--------|--------|--------|
| Content depth | FAIL | ~205 words — AI systems need 500+ words per topic for citation |
| Passage-level citability | FAIL | No distinct passages with clear claims/facts |
| FAQ content | FAIL | No FAQ section for AI to extract |
| Comparison content | FAIL | No "vs" or comparison pages |
| How-to content | FAIL | No tutorials or guides |
| Brand mentions (external) | FAIL | No detectable external mentions |
| GitHub stars / social proof | FAIL | Private repo, 0 public stars |

### Recommendations

1. Create `/llms.txt` with structured product information
2. Add explicit AI crawler directives to robots.txt (allow all)
3. Build content that's citation-worthy (comparison pages, how-to guides, feature deep-dives)
4. Create "What is Novyx Vault?" and "How Novyx Vault works" pages with detailed explanations
5. Publish the GitHub repo (or create a public landing repo with stars)

---

## 7. Landing Page SEO Copy

### Current State

- **Word count**: ~205 words (needs 1,000+ for competitive SaaS queries)
- **H1**: "Your Second Brain, Supercharged by AI" (decent, but needs keyword optimization)
- **H2s**: "Remember Everything", "Connect the Dots", "AI That Evolves" (creative but lack keywords)
- **CTAs**: "Get Started Free", "Try the Demo" (good)
- **Images**: None on landing page (missed opportunity for alt text + visual engagement)
- **Social proof**: None (no testimonials, user count, or trust signals)

### Keyword Density Analysis

The landing page mentions "AI" only in the context of features but doesn't use any target SEO keywords in the body copy. The terms "second brain," "note-taking," "knowledge management," and "personal knowledge base" are completely absent from the visible page content.

### Heading Hierarchy

```
H1: Your Second Brain, Supercharged by AI
  H2: Remember Everything
  H2: Connect the Dots
  H2: AI That Evolves
```

**Issues:**
- H2s are creative/catchy but contain zero target keywords
- No H3s for feature details
- Missing keywords in all headings

### Recommended Heading Structure

```
H1: Novyx Vault — The AI-Powered Second Brain That Learns How You Think
  H2: AI-Powered Note Taking That Remembers Everything
    H3: Persistent AI Memory Across Sessions
    H3: Multi-Provider AI (OpenAI, Claude, Ollama & More)
  H2: Connect Your Knowledge with Wiki-Style Linking
    H3: Visual Knowledge Graph
    H3: Smart Backlinks & Connections
  H2: Why Novyx Vault vs Obsidian, Notion & Roam
    H3: AI That Actually Gets Smarter Over Time
    H3: Local-First Privacy with Cloud Sync
  H2: Frequently Asked Questions
```

### Content Gaps (What to Add)

1. **Feature descriptions** with keyword-rich copy (500+ words)
2. **Social proof section** — user count, testimonials, or "as seen in" logos
3. **Comparison section** — "Why Novyx Vault?" with competitor comparison
4. **FAQ section** — 5-8 questions targeting long-tail keywords
5. **Screenshot/demo images** — with descriptive alt text
6. **Trust signals** — security badges, "local-first" emphasis, open-source mentions

---

## 8. Content Strategy

### Immediate Content Needs (Pages to Create)

| Page | Purpose | Target Keywords |
|------|---------|----------------|
| /features | Detailed feature breakdown | "AI note taking features", "second brain features" |
| /pricing | Pricing transparency | "second brain app pricing", "free note taking app" |
| /docs | Documentation hub | "novyx-vault documentation", "how to use novyx-vault" |
| /blog | Content marketing hub | Various long-tail keywords |
| /about | Trust & credibility | "novyx labs", "novyx-vault team" |

### Blog Content Calendar (First 10 Posts)

| # | Title | Target Keyword | Type |
|---|-------|----------------|------|
| 1 | "What is a Second Brain? The Complete Guide" | "what is a second brain" (5K+ vol) | Pillar |
| 2 | "Novyx Vault vs Obsidian: AI-Powered Knowledge Management" | "obsidian alternative" (3K+ vol) | Comparison |
| 3 | "How AI Memory Changes Personal Knowledge Management" | "AI knowledge management" (1K+ vol) | Thought Leadership |
| 4 | "Building a Second Brain with AI: Step-by-Step Guide" | "building a second brain" (3K+ vol) | How-to |
| 5 | "Novyx Vault vs Notion: Why Persistent AI Memory Matters" | "notion alternative AI" (1K+ vol) | Comparison |
| 6 | "Local-First Note Taking: Privacy Without Compromise" | "local first notes" (500+ vol) | Feature |
| 7 | "The Best AI Note Taking Apps in 2026" | "best AI note taking app" (5K+ vol) | Listicle |
| 8 | "How Wiki-Style Linking Transforms Your Thinking" | "wiki links notes" (500+ vol) | Educational |
| 9 | "Novyx Vault vs Roam Research: A Detailed Comparison" | "roam research alternative" (2K+ vol) | Comparison |
| 10 | "Getting Started with Novyx Vault: From First Note to Knowledge Graph" | "novyx-vault tutorial" | Tutorial |

### Content Principles

- Every page should have 1,000+ words minimum
- Include comparison tables, screenshots, and diagrams
- Internal link every blog post to at least 2 other posts and the features page
- Publish consistently (2-4 posts/month minimum)
- Prioritize posts 1, 2, and 4 first (highest volume, most differentiated)

---

## Prioritized Action Items

### CRITICAL (Blocks indexing — fix immediately)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| C1 | **Submit site to Google Search Console** and request indexing | Enables organic discovery | 15 min |
| C2 | **Rewrite title tag** to include primary keywords | Direct ranking factor | 5 min |
| C3 | **Expand landing page to 1,000+ words** with keyword-rich copy | Required for competitive queries | 2-4 hrs |
| C4 | **Add canonical URLs** to all pages | Prevents duplicate content issues | 15 min |
| C5 | **Fix viewport** — remove `maximum-scale=1` | Accessibility + mobile ranking | 2 min |

### HIGH (Significantly impacts rankings — fix within 1 week)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| H1 | **Add JSON-LD structured data** (SoftwareApplication, Organization, WebSite) | Rich results eligibility | 1 hr |
| H2 | **Create /features page** with detailed feature descriptions | Content for crawlers + users | 3-4 hrs |
| H3 | **Add FAQ section** to landing page with schema markup | Long-tail keyword coverage + AI citations | 1-2 hrs |
| H4 | **Fix broken GitHub link** (repo is private) — either make public or remove | User trust + crawl errors | 5 min |
| H5 | **Add semantic HTML** (`<main>`, `<header>`, `<nav>`, `<footer>`) | Crawlability + accessibility | 30 min |
| H6 | **Create `/llms.txt`** for AI crawler optimization | AI citation readiness | 30 min |
| H7 | **Add images/screenshots** to landing page with descriptive alt text | Visual engagement + image search | 1-2 hrs |
| H8 | **Add page-specific meta** for /login, /terms, /privacy | Per-page SEO coverage | 30 min |
| H9 | **Update robots.txt** — block /api/, add AI crawler directives | Crawl budget optimization | 10 min |

### MEDIUM (Optimization opportunities — fix within 1 month)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| M1 | **Start blog** with first 3 pillar posts | Content marketing + long-tail traffic | 1-2 weeks |
| M2 | **Create comparison pages** (vs Obsidian, vs Notion) | High-intent search traffic | 1-2 days each |
| M3 | **Add preconnect hints** for external resources | Performance improvement | 10 min |
| M4 | **Fix sitemap** — remove /login, make lastmod dynamic | Crawl efficiency | 30 min |
| M5 | **Add `font-display: swap`** to prevent FOIT | CWV improvement | 15 min |
| M6 | **Create /pricing page** | Conversion + keyword coverage | 2-3 hrs |
| M7 | **Add social proof** (testimonials, user count, trust badges) | Conversion + E-E-A-T signals | 1-2 hrs |
| M8 | **Make GitHub repo public** (or create public landing repo) | Social proof + backlinks | 15 min |

### LOW (Nice to have — backlog)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| L1 | **Add security headers** (CSP, HSTS, X-Frame-Options) | Security + trust signals | 1 hr |
| L2 | **Create /about page** | E-E-A-T trust signals | 1-2 hrs |
| L3 | **Set up OG image per page** (dynamic) | Social sharing improvement | 1-2 hrs |
| L4 | **Add skip-to-content link** | Accessibility polish | 15 min |
| L5 | **Monitor Core Web Vitals** with analytics | Ongoing performance tracking | 1 hr setup |
| L6 | **Build external backlinks** (Product Hunt, HN, Reddit, directories) | Domain authority | Ongoing |

---

## Score Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Technical SEO | 25% | 25/100 | 6.25 |
| Content Quality | 25% | 10/100 | 2.50 |
| On-Page SEO | 20% | 15/100 | 3.00 |
| Schema / Structured Data | 10% | 0/100 | 0.00 |
| Performance (CWV) | 10% | 50/100 | 5.00 |
| Images | 5% | 5/100 | 0.25 |
| AI Search Readiness | 5% | 15/100 | 0.75 |
| **Total** | **100%** | — | **17.75 ≈ 18** |

---

*Generated by Claude Code SEO Audit — March 4, 2026*
