/**
 * Novyx Control API client — delegates to Novyx SDK 2.11.0.
 * Control is a capability inside Novyx Core — same host, same auth, same key.
 *
 * Newer endpoints (dashboard, policy CRUD, agent violations) are called
 * via raw fetch against NOVYX_API_URL until the SDK ships wrappers.
 */

import { getNovyxForKey } from "./novyx";

const NOVYX_TIMEOUT_MS = 3000;
const BASE_URL = process.env.NOVYX_API_URL || "https://novyx-ram-api.fly.dev";

function withTimeout<T>(promise: Promise<T>, ms = NOVYX_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Novyx API timeout")), ms)
    ),
  ]);
}

// --- Types (kept for component imports) ---

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

export interface ControlDashboard {
  total_actions: number;
  pending_approvals: number;
  approved_today: number;
  denied_today: number;
  violations_today: number;
  active_policies: number;
  agents_total: number;
  violations_by_agent: Array<{
    agent_id: string;
    agent_name?: string;
    violations: number;
  }>;
  recent_activity: Array<{
    id: string;
    type: string;
    agent_id?: string;
    agent_name?: string;
    description?: string;
    timestamp: string;
  }>;
}

export interface AgentViolation {
  id: string;
  agent_id: string;
  policy_id?: string;
  policy_name?: string;
  action_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface PolicyInput {
  name: string;
  description?: string;
  agent_id?: string;
  rules: PolicyRule[];
  enabled?: boolean;
}

function requireClient(apiKey: string) {
  const nx = getNovyxForKey(apiKey);
  if (!nx) throw new Error("No Novyx client available");
  return nx;
}

export async function getActions(
  params: { status?: string; limit?: number; offset?: number },
  apiKey: string
): Promise<{ actions: ControlAction[]; total: number }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.actionList({
    status: params.status,
    limit: params.limit,
    offset: params.offset,
  } as Parameters<typeof nx.actionList>[0]));
  return result as { actions: ControlAction[]; total: number };
}

export async function getApprovals(
  params: { status?: string; limit?: number },
  apiKey: string
): Promise<{ approvals: ControlAction[]; total: number }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.listApprovals({
    limit: params.limit,
    status_filter: params.status,
  }));
  return result as unknown as { approvals: ControlAction[]; total: number };
}

export async function submitDecision(
  approvalId: string,
  decision: "approved" | "denied",
  apiKey: string
): Promise<{ success: boolean; message?: string }> {
  const nx = requireClient(apiKey);
  // SDK/backend expects "approve"/"deny", not "approved"/"denied"
  const sdkDecision = decision === "approved" ? "approve" : "deny";
  const result = await withTimeout(nx.approveAction(approvalId, { decision: sdkDecision }));
  return result as { success: boolean; message?: string };
}

export async function getPolicies(
  apiKey: string
): Promise<{ policies: ControlPolicy[] }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.listPolicies());
  return result as unknown as { policies: ControlPolicy[] };
}

export async function explainAction(
  actionId: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const nx = requireClient(apiKey);
  return withTimeout(nx.explainAction(actionId));
}

// --- Raw fetch helpers for endpoints not yet in SDK wrappers ---

async function rawFetch<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOVYX_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Response(
        JSON.stringify({ error: `Upstream ${res.status}` }),
        { status: res.status }
      );
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getDashboard(apiKey: string): Promise<ControlDashboard> {
  return rawFetch<ControlDashboard>("/v1/control/dashboard", apiKey);
}

export async function getAgentViolations(
  agentId: string,
  apiKey: string,
  params: { limit?: number; offset?: number } = {}
): Promise<{ violations: AgentViolation[]; total: number }> {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  const query = q.toString();
  return rawFetch(
    `/v1/control/agents/${encodeURIComponent(agentId)}/violations${query ? `?${query}` : ""}`,
    apiKey
  );
}

export async function createPolicy(
  input: PolicyInput,
  apiKey: string
): Promise<ControlPolicy> {
  return rawFetch<ControlPolicy>("/v1/control/policies", apiKey, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePolicy(
  policyId: string,
  input: Partial<PolicyInput>,
  apiKey: string
): Promise<ControlPolicy> {
  return rawFetch<ControlPolicy>(
    `/v1/control/policies/${encodeURIComponent(policyId)}`,
    apiKey,
    {
      method: "PUT",
      body: JSON.stringify(input),
    }
  );
}

export async function deletePolicy(
  policyId: string,
  apiKey: string
): Promise<{ success: boolean }> {
  return rawFetch(
    `/v1/control/policies/${encodeURIComponent(policyId)}`,
    apiKey,
    { method: "DELETE" }
  );
}

