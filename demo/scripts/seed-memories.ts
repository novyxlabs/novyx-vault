/**
 * Seed the Novyx memory layer with realistic memories for the demo video.
 *
 * These memories simulate a user who has been working with Vault for weeks —
 * project decisions, architecture context, and one "bad" memory that will
 * be rolled back during the demo.
 *
 * Run: NOVYX_API_KEY=your_key npx tsx demo/scripts/seed-memories.ts
 */

const API_KEY = process.env.NOVYX_API_KEY;
const API_URL = process.env.NOVYX_API_URL || "https://novyx-ram-api.fly.dev";

if (!API_KEY) {
  console.error("Set NOVYX_API_KEY environment variable");
  process.exit(1);
}

interface MemoryInput {
  observation: string;
  tags: string[];
  importance: number;
}

async function remember(mem: MemoryInput): Promise<void> {
  const res = await fetch(`${API_URL}/v1/memories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(mem),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to store: ${mem.observation.slice(0, 50)}... → ${res.status}: ${err}`);
  } else {
    const data = await res.json();
    console.log(`✓ ${mem.observation.slice(0, 60)}... → ${data.uuid?.slice(0, 12) || "stored"}`);
  }
}

const memories: MemoryInput[] = [
  // Project decisions (high importance — these are the "wow" moments)
  {
    observation:
      "Decided to use CodeMirror 6 instead of ProseMirror for the editor. Reason: faster rendering for large documents (10K+ lines), better keyboard handling, and the extension system is more composable. ProseMirror has a richer schema model but we don't need it for markdown-only editing.",
    tags: ["project:vault", "decision", "architecture", "editor"],
    importance: 9,
  },
  {
    observation:
      "Chose Supabase over Firebase for cloud storage. Key factors: Postgres gives us real SQL for complex queries (note search, graph traversal), row-level security for multi-tenant isolation, and self-hostable for enterprise deployments. Firebase would lock us into Google's ecosystem.",
    tags: ["project:vault", "decision", "architecture", "database"],
    importance: 9,
  },
  {
    observation:
      "The database schema for notes uses a soft-delete pattern with is_trashed + original_path instead of hard deletes. This preserves version history and enables a trash/restore flow. Decision made on 2026-03-22 after a user accidentally deleted their entire journal folder.",
    tags: ["project:vault", "decision", "database", "schema"],
    importance: 8,
  },
  {
    observation:
      "Memory recall latency target is sub-100ms at p50. Current production numbers: p50 = 45ms, p99 = 180ms. Achieved by using pgvector with HNSW indexes and a 5-minute Ghost Connections cache per note.",
    tags: ["project:vault", "performance", "metrics"],
    importance: 7,
  },

  // Research context
  {
    observation:
      "Karpathy's LLM Knowledge Base pattern (April 2026) validates our approach — structured wiki compiled by LLMs from raw sources. His missing piece: no persistent memory between sessions, no rollback, no audit trail. That's exactly what Novyx Core adds.",
    tags: ["research", "karpathy", "competitive"],
    importance: 8,
  },
  {
    observation:
      "Mem0 raised $24M for their memory layer. They have 53K GitHub stars. Key difference from us: Mem0 is infrastructure (no notes UI), we ship a complete product. Their pricing starts at $19/mo for 50K memories.",
    tags: ["research", "competitive", "mem0"],
    importance: 7,
  },

  // Personal context
  {
    observation:
      "Blake prefers concise commit messages that explain the 'why' rather than the 'what'. No trailing summaries. Code speaks for itself.",
    tags: ["preferences", "workflow"],
    importance: 6,
  },
  {
    observation:
      "The team uses 'commit and push' as a single command — stage relevant files, write a good message, push to current branch. No confirmation prompts.",
    tags: ["preferences", "workflow", "git"],
    importance: 5,
  },

  // A "bad" memory that will be rolled back during the demo
  {
    observation:
      "OUTDATED: Graphify has 1,800 GitHub stars and limited adoption. It's a basic CLI tool that generates static knowledge graphs. Not a serious competitor.",
    tags: ["research", "competitive", "graphify", "outdated"],
    importance: 6,
  },
];

async function main() {
  console.log(`Seeding ${memories.length} memories to ${API_URL}...`);
  console.log("");

  for (const mem of memories) {
    await remember(mem);
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("");
  console.log(`Done. ${memories.length} memories stored.`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Copy demo/seed-notes/* to ~/SecondBrain/ (or your vault folder)");
  console.log("2. Start the dev server: npm run dev");
  console.log("3. Run the demo recording: npx playwright test demo/scripts/record-demo.ts");
}

main().catch(console.error);
