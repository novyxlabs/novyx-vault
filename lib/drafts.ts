/**
 * Novyx Drafts API client — delegates to Novyx SDK 2.11.0.
 * Wraps the Core /v1/memory-drafts and /v1/memory-branches endpoints.
 */

import { getNovyxForKey } from "./novyx";

const NOVYX_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms = NOVYX_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Novyx API timeout")), ms)
    ),
  ]);
}

// --- Types (kept for component imports) ---

export interface Draft {
  draft_id: string;
  branch_id?: string;
  observation: string;
  tags: string[];
  importance: number;
  confidence: number;
  status: "draft" | "merged" | "rejected";
  review_summary?: {
    recommendation: "merge" | "review" | "skip";
    reason?: string;
    similar_count?: number;
    max_similarity?: number;
  };
  source?: string;
  created_at: string;
  decided_at?: string;
}

export interface DraftDiff {
  draft_id: string;
  proposed: {
    observation: string;
    tags: string[];
    importance: number;
    confidence: number;
  };
  existing?: {
    uuid: string;
    observation: string;
    tags: string[];
    importance: number;
    confidence: number;
  } | null;
  field_diffs: {
    field: string;
    current?: string | number | string[];
    proposed: string | number | string[];
    changed: boolean;
  }[];
  similar_memories: {
    uuid: string;
    observation: string;
    similarity: number;
  }[];
  review_summary?: Draft["review_summary"];
}

export interface Branch {
  branch_id: string;
  drafts: Draft[];
  counts: {
    total: number;
    draft: number;
    merged: number;
    rejected: number;
  };
  recommendations?: {
    merge: number;
    review: number;
    skip: number;
  };
  created_at?: string;
}

function requireClient(apiKey: string) {
  const nx = getNovyxForKey(apiKey);
  if (!nx) throw new Error("No Novyx client available");
  return nx;
}

// --- Drafts ---

export async function listDrafts(
  apiKey: string,
  params?: { status?: string; branch_id?: string; limit?: number; offset?: number }
): Promise<{ drafts: Draft[]; total: number }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.memoryDrafts({
    status: params?.status,
    branch_name: params?.branch_id,
    limit: params?.limit,
    offset: params?.offset,
  }));
  return result as unknown as { drafts: Draft[]; total: number };
}

export async function getDraft(
  apiKey: string,
  draftId: string
): Promise<Draft> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.memoryDraft(draftId));
  return result as unknown as Draft;
}

export async function getDraftDiff(
  apiKey: string,
  draftId: string
): Promise<DraftDiff> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.draftDiff(draftId));
  return result as unknown as DraftDiff;
}

export async function mergeDraft(
  apiKey: string,
  draftId: string
): Promise<{ success: boolean }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.mergeDraft(draftId));
  return result as { success: boolean };
}

export async function rejectDraft(
  apiKey: string,
  draftId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.rejectDraft(draftId, reason));
  return result as { success: boolean };
}

// --- Branches ---
// getBranch uses direct fetch — SDK doesn't have a single-branch endpoint

const BASE_URL = process.env.NOVYX_API_URL || "https://novyx-ram-api.fly.dev";
const TIMEOUT_MS = 8000;

export async function getBranch(
  apiKey: string,
  branchId: string
): Promise<Branch> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/v1/memory-branches/${branchId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Drafts API error: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function mergeBranch(
  apiKey: string,
  branchId: string
): Promise<{ success: boolean; merged: number }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.mergeBranch(branchId));
  return result as { success: boolean; merged: number };
}

export async function rejectBranch(
  apiKey: string,
  branchId: string,
  reason?: string
): Promise<{ success: boolean; rejected: number }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.rejectBranch(branchId, reason));
  return result as { success: boolean; rejected: number };
}
