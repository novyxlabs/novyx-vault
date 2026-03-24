/**
 * Novyx Control API client — delegates to Novyx SDK 2.11.0.
 * Control is a capability inside Novyx Core — same host, same auth, same key.
 */

import { getNovyxForKey } from "./novyx";

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
  const result = await nx.actionList({
    status: params.status,
    limit: params.limit,
    offset: params.offset,
  } as Parameters<typeof nx.actionList>[0]);
  return result as { actions: ControlAction[]; total: number };
}

export async function getApprovals(
  params: { status?: string; limit?: number },
  apiKey: string
): Promise<{ approvals: ControlAction[]; total: number }> {
  const nx = requireClient(apiKey);
  const result = await nx.listApprovals({
    limit: params.limit,
    status_filter: params.status,
  });
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
  const result = await nx.approveAction(approvalId, { decision: sdkDecision });
  return result as { success: boolean; message?: string };
}

export async function getPolicies(
  apiKey: string
): Promise<{ policies: ControlPolicy[] }> {
  const nx = requireClient(apiKey);
  const result = await nx.listPolicies();
  return result as unknown as { policies: ControlPolicy[] };
}

export async function explainAction(
  actionId: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const nx = requireClient(apiKey);
  return nx.explainAction(actionId);
}

