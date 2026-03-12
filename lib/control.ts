/**
 * Novyx Control API client — thin server-side proxy for the governed action plane.
 * Reads NOVYX_CONTROL_URL from env. Returns null/empty when not configured.
 */

function getBaseURL(): string | null {
  return process.env.NOVYX_CONTROL_URL || null;
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
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

export function isControlConfigured(): boolean {
  return !!getBaseURL();
}

export async function getActions(
  params: { status?: string; limit?: number; offset?: number },
  apiKey: string
): Promise<{ actions: ControlAction[]; total: number }> {
  const base = getBaseURL();
  if (!base) return { actions: [], total: 0 };

  const url = new URL(`${base}/v1/actions`);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString(), { headers: headers(apiKey) });
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
  const base = getBaseURL();
  if (!base) throw new Error("Control not configured");

  const res = await fetch(`${base}/v1/approvals/${approvalId}/decision`, {
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
  const base = getBaseURL();
  if (!base) return { policies: [] };

  const res = await fetch(`${base}/v1/control/policies`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    throw new Error(`Control API error: ${res.status}`);
  }
  return res.json();
}
