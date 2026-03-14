/**
 * Novyx Drafts API client — server-side proxy for memory draft review.
 * Wraps the Core /v1/memory-drafts and /v1/memory-branches endpoints.
 */

const BASE_URL = "https://novyx-ram-api.fly.dev";
const TIMEOUT_MS = 8000;

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeout = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// --- Types ---

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

// --- Drafts ---

export async function listDrafts(
  apiKey: string,
  params?: { status?: string; branch_id?: string; limit?: number; offset?: number }
): Promise<{ drafts: Draft[]; total: number }> {
  const url = new URL(`${BASE_URL}/v1/memory-drafts`);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.branch_id) url.searchParams.set("branch_id", params.branch_id);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetchWithTimeout(url.toString(), { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`Drafts API error: ${res.status}`);
  return res.json();
}

export async function getDraft(
  apiKey: string,
  draftId: string
): Promise<Draft> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/v1/memory-drafts/${draftId}`,
    { headers: headers(apiKey) }
  );
  if (!res.ok) throw new Error(`Drafts API error: ${res.status}`);
  return res.json();
}

export async function getDraftDiff(
  apiKey: string,
  draftId: string
): Promise<DraftDiff> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/v1/memory-drafts/${draftId}/diff`,
    { headers: headers(apiKey) }
  );
  if (!res.ok) throw new Error(`Drafts API error: ${res.status}`);
  return res.json();
}

export async function mergeDraft(
  apiKey: string,
  draftId: string
): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/v1/memory-drafts/${draftId}/merge`,
    { method: "POST", headers: headers(apiKey) }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Drafts API error: ${res.status}`);
  }
  return res.json();
}

export async function rejectDraft(
  apiKey: string,
  draftId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/v1/memory-drafts/${draftId}/reject`,
    {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ reason }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Drafts API error: ${res.status}`);
  }
  return res.json();
}

// --- Branches ---

export async function getBranch(
  apiKey: string,
  branchId: string
): Promise<Branch> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/v1/memory-branches/${branchId}`,
    { headers: headers(apiKey) }
  );
  if (!res.ok) throw new Error(`Drafts API error: ${res.status}`);
  return res.json();
}

export async function mergeBranch(
  apiKey: string,
  branchId: string
): Promise<{ success: boolean; merged: number }> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/v1/memory-branches/${branchId}/merge`,
    { method: "POST", headers: headers(apiKey) }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Drafts API error: ${res.status}`);
  }
  return res.json();
}

export async function rejectBranch(
  apiKey: string,
  branchId: string,
  reason?: string
): Promise<{ success: boolean; rejected: number }> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/v1/memory-branches/${branchId}/reject`,
    {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ reason }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Drafts API error: ${res.status}`);
  }
  return res.json();
}
