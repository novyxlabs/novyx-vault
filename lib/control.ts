/**
 * Novyx Control API client — delegates to Novyx SDK 3.1.0+.
 * Control is a capability inside Novyx Core — same host, same auth, same key.
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
  window: "24h" | "7d" | "30d";
  bucket: "hour" | "day";
  backend: "postgres" | "file";
  totals: {
    evaluations: number;
    executed: number;
    pending_review: number;
    approved: number;
    denied: number;
  };
  violations_by_policy: Array<{
    policy: string;
    count: number;
    severity_breakdown: Record<string, number>;
  }>;
  violations_by_agent: Array<{
    agent_id: string;
    count: number;
  }>;
  time_series: Array<{
    bucket: string; // ISO 8601 timestamp — parse on client
    executed: number;
    pending_review: number;
    approved: number;
    denied: number;
  }>;
}

export interface AgentViolation {
  action_id: string;
  action: string;
  timestamp: string; // ISO 8601
  event: "action_pending_review" | "action_denied" | "action_executed";
  triggered_policy: string | null;
  severity: "critical" | "high" | "medium" | "low" | null;
  reason: string | null;
  risk_score: number | null; // 0.0 - 1.0
  violation_count: number;
  // Optional audit chain fields — present on postgres backend, absent in file mode.
  // Surfaced in the Test Action panel to close the visible loop between
  // "policy fired" and "this is on the chain".
  audit_hash?: string;
  audit_chain_index?: number;
}

export interface AgentViolationsResponse {
  agent_id: string;
  total: number;
  backend: "postgres" | "file";
  violations: AgentViolation[];
}

export interface PolicyInput {
  name: string;
  description?: string;
  agent_id?: string;
  rules: PolicyRule[];
  enabled?: boolean;
}

export interface SubmitActionResult {
  status: "allowed" | "blocked" | "pending_review";
  action_id?: string;
  policy_result?: {
    action_id?: string;
    triggered_policy?: string;
    severity?: "low" | "medium" | "high" | "critical";
    reason?: string;
    risk_score?: number;
  };
  [key: string]: unknown;
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

// --- Governance endpoints (typed SDK wrappers, novyx 3.1.0+) ---

export async function getDashboard(apiKey: string): Promise<ControlDashboard> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.governanceDashboard());
  return result as unknown as ControlDashboard;
}

export async function getAgentViolations(
  agentId: string,
  apiKey: string,
  params: { limit?: number; since?: string; until?: string } = {}
): Promise<AgentViolationsResponse> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.agentViolations(agentId, {
    limit: params.limit,
    since: params.since,
    until: params.until,
  }));
  return result as unknown as AgentViolationsResponse;
}

export async function createPolicy(
  input: PolicyInput,
  apiKey: string
): Promise<ControlPolicy> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.createPolicy({
    name: input.name,
    rules: input.rules as unknown as Record<string, unknown>[],
    description: input.description,
    enabled: input.enabled,
    agent_id: input.agent_id,
  }));
  return result as unknown as ControlPolicy;
}

export async function updatePolicy(
  policyName: string,
  input: Partial<PolicyInput>,
  apiKey: string
): Promise<ControlPolicy> {
  const nx = requireClient(apiKey);
  let rules = input.rules;

  if (!rules) {
    const current = await withTimeout(nx.listPolicies());
    const policies = (current as { policies?: ControlPolicy[] }).policies ?? [];
    const existing = policies.find((policy) => policy.id === policyName || policy.name === policyName);
    if (!existing) throw new Error("Policy not found");
    rules = existing.rules;
  }

  const result = await withTimeout(nx.updatePolicy(policyName, {
    rules: rules as unknown as Record<string, unknown>[],
    description: input.description,
    enabled: input.enabled,
  }));
  return result as unknown as ControlPolicy;
}

export async function deletePolicy(
  policyId: string,
  apiKey: string
): Promise<{ success: boolean }> {
  const nx = requireClient(apiKey);
  const result = await withTimeout(nx.deletePolicy(policyId));
  return result as unknown as { success: boolean };
}

export async function submitAction(
  action: string,
  params: Record<string, unknown>,
  apiKey: string,
  opts: { agent_id?: string } = {}
): Promise<SubmitActionResult> {
  const nx = requireClient(apiKey);
  // submitAction has a longer timeout ceiling since policies may do expensive eval
  const result = await withTimeout(
    nx.submitAction(action, params, { agent_id: opts.agent_id }),
    10000
  );
  return result as unknown as SubmitActionResult;
}
