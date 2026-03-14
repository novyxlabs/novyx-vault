/**
 * Novyx Control API client — thin server-side proxy for the governed action plane.
 * Control is a capability inside Novyx Core — same host, same auth, same key.
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

export interface ControlAction {
  id: string;
  agent_id?: string;
  agent_name?: string;
  action_type: string;
  description?: string;
  status: string;
  created_at: string;
  decided_at?: string;
  decided_by?: string;
  details?: Record<string, unknown>;
}

export interface ControlPolicy {
  id: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
}

export interface PolicyRule {
  action: string;
  effect: "allow" | "deny" | "require_approval";
  scope?: string;
  conditions?: Record<string, unknown>;
}

export async function getActions(
  params: { status?: string; limit?: number; offset?: number },
  apiKey: string
): Promise<{ actions: ControlAction[]; total: number }> {
  const url = new URL(`${BASE_URL}/v1/actions`);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetchWithTimeout(url.toString(), { headers: headers(apiKey) });
  if (!res.ok) {
    throw new Error(`Control API error: ${res.status}`);
  }
  return res.json();
}

export async function getApprovals(
  params: { status?: string; limit?: number },
  apiKey: string
): Promise<{ approvals: ControlAction[]; total: number }> {
  const url = new URL(`${BASE_URL}/v1/approvals`);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetchWithTimeout(url.toString(), { headers: headers(apiKey) });
  if (!res.ok) {
    throw new Error(`Control API error: ${res.status}`);
  }
  return res.json();
}

export async function submitDecision(
  approvalId: string,
  decision: "approved" | "denied",
  apiKey: string
): Promise<{ success: boolean; message?: string }> {
  const res = await fetchWithTimeout(`${BASE_URL}/v1/approvals/${approvalId}/decision`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ decision }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Control API error: ${res.status}`);
  }
  return res.json();
}

export async function getPolicies(
  apiKey: string
): Promise<{ policies: ControlPolicy[] }> {
  const res = await fetchWithTimeout(`${BASE_URL}/v1/control/policies`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    throw new Error(`Control API error: ${res.status}`);
  }
  return res.json();
}
