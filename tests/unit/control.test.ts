import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Novyx SDK via lib/novyx
const mockActionList = vi.fn();
const mockListApprovals = vi.fn();
const mockApproveAction = vi.fn();
const mockListPolicies = vi.fn();

vi.mock("@/lib/novyx", () => ({
  getNovyxForKey: vi.fn((key: string) => {
    if (!key) return null;
    return {
      actionList: mockActionList,
      listApprovals: mockListApprovals,
      approveAction: mockApproveAction,
      listPolicies: mockListPolicies,
    };
  }),
}));

import {
  getActions,
  submitDecision,
  getPolicies,
  getApprovals,
} from "@/lib/control";

describe("getActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to SDK actionList with all params", async () => {
    mockActionList.mockResolvedValueOnce({
      actions: [{ id: "a1", action_type: "deploy", status: "pending" }],
      total: 1,
    });

    const result = await getActions({ status: "pending", limit: 10, offset: 5 }, "nram_test_key");

    expect(mockActionList).toHaveBeenCalledWith({ status: "pending", limit: 10, offset: 5 });
    expect(result.actions).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("passes undefined params when not provided", async () => {
    mockActionList.mockResolvedValueOnce({ actions: [], total: 0 });

    await getActions({}, "nram_test_key");
    expect(mockActionList).toHaveBeenCalledWith({ status: undefined, limit: undefined, offset: undefined });
  });

  it("throws when SDK throws", async () => {
    mockActionList.mockRejectedValueOnce(new Error("Control API error: 403"));

    await expect(getActions({}, "nram_test_key")).rejects.toThrow("Control API error: 403");
  });
});

describe("getApprovals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to SDK listApprovals with params", async () => {
    mockListApprovals.mockResolvedValueOnce({
      approvals: [{ approval_id: "ap1", status: "pending_approval" }],
      total: 1,
    });

    const result = await getApprovals({ status: "pending_approval", limit: 50 }, "nram_test_key");

    expect(mockListApprovals).toHaveBeenCalledWith({
      limit: 50,
      status_filter: "pending_approval",
    });
    expect(result.approvals).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

describe("submitDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps 'approved' to SDK 'approve'", async () => {
    mockApproveAction.mockResolvedValueOnce({ success: true });

    const result = await submitDecision("approval-123", "approved", "nram_test_key");

    expect(mockApproveAction).toHaveBeenCalledWith("approval-123", { decision: "approve" });
    expect(result.success).toBe(true);
  });

  it("maps 'denied' to SDK 'deny'", async () => {
    mockApproveAction.mockResolvedValueOnce({ success: true });

    await submitDecision("a1", "denied", "nram_test_key");
    expect(mockApproveAction).toHaveBeenCalledWith("a1", { decision: "deny" });
  });

  it("throws when SDK throws", async () => {
    mockApproveAction.mockRejectedValueOnce(new Error("Action already decided"));

    await expect(submitDecision("a1", "approved", "nram_test_key")).rejects.toThrow(
      "Action already decided"
    );
  });
});

describe("getPolicies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to SDK listPolicies", async () => {
    mockListPolicies.mockResolvedValueOnce({
      policies: [{
        name: "Default",
        enabled: true,
        description: "Default policy",
      }],
      mode: "strict",
      connectors: [],
      approval_modes: [],
    });

    const result = await getPolicies("nram_test_key");

    expect(mockListPolicies).toHaveBeenCalledOnce();
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].name).toBe("Default");
  });

  it("throws when SDK throws", async () => {
    mockListPolicies.mockRejectedValueOnce(new Error("Control API error: 401"));

    await expect(getPolicies("nram_test_key")).rejects.toThrow("Control API error: 401");
  });
});
