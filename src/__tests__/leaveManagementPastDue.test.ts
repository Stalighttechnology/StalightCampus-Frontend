import { describe, it, expect } from 'vitest';

/**
 * Pure functions mirroring LeaveManagement.tsx mapping & action logic
 */
export interface RawLeaveRequest {
  id: number;
  faculty_name: string;
  role: string;
  department: string;
  status: string;
  current_stage: string;
  hod_approval_status: string;
  start_date: string;
  end_date: string;
}

export const STATUS_FILTER_OPTIONS = ["All", "Pending", "Past Due", "Approved", "Rejected"] as const;

export function mapFilterStatusToBackend(filterStatus: typeof STATUS_FILTER_OPTIONS[number]) {
  if (filterStatus === "All") return undefined;
  if (filterStatus === "Pending") return "PENDING";
  if (filterStatus === "Past Due") return "PAST_DUE";
  if (filterStatus === "Approved") return "APPROVED";
  if (filterStatus === "Rejected") return "REJECTED";
  return undefined;
}

export function processLeaveItem(req: RawLeaveRequest, todayDateOnly: Date) {
  const isPending = req.status === "PENDING";
  const isHodApproved = req.hod_approval_status === "APPROVED";
  const isAtHod = req.current_stage === "hod";

  let isPastDue = false;
  if (isPending) {
    try {
      const end = new Date(req.end_date);
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      isPastDue = endDateOnly < todayDateOnly;
    } catch {
      isPastDue = false;
    }
  }

  let displayStatus = "Pending";
  if (req.status === "APPROVED") {
    displayStatus = "Approved";
  } else if (req.status === "REJECTED") {
    displayStatus = "Rejected";
  } else if (isPastDue) {
    displayStatus = "Past Due";
  } else if (isHodApproved) {
    displayStatus = "Endorsed (Pending Principal)";
  } else {
    displayStatus = "Pending";
  }

  const canApprove = isPending && isAtHod && !isHodApproved && !isPastDue;

  let actionText = "No action needed";
  if (canApprove) {
    actionText = "Approve / Reject";
  } else if (displayStatus === "Past Due") {
    actionText = "Action Expired";
  } else if (displayStatus.startsWith("Endorsed")) {
    actionText = "Endorsed (Forwarded to Next Authority)";
  }

  return {
    id: req.id.toString(),
    displayStatus,
    canApprove,
    actionText,
    isPastDue,
  };
}

describe('LeaveManagement Past Due Logic', () => {
  const today = new Date(2026, 9, 26); // Oct 26, 2026

  it('includes Past Due in status filter options', () => {
    expect(STATUS_FILTER_OPTIONS).toContain("Past Due");
  });

  it('maps "Past Due" to "PAST_DUE" for backend query parameter', () => {
    expect(mapFilterStatusToBackend("Past Due")).toBe("PAST_DUE");
    expect(mapFilterStatusToBackend("Pending")).toBe("PENDING");
    expect(mapFilterStatusToBackend("Approved")).toBe("APPROVED");
    expect(mapFilterStatusToBackend("Rejected")).toBe("REJECTED");
    expect(mapFilterStatusToBackend("All")).toBeUndefined();
  });

  it('correctly identifies past pending leaves as Past Due with Action Expired', () => {
    const raw: RawLeaveRequest = {
      id: 369,
      faculty_name: "CS Faculty 18",
      role: "teacher",
      department: "Computer Science",
      status: "PENDING",
      current_stage: "alternate_duty",
      hod_approval_status: "PENDING",
      start_date: "2026-06-22",
      end_date: "2026-06-22",
    };

    const result = processLeaveItem(raw, today);
    expect(result.displayStatus).toBe("Past Due");
    expect(result.canApprove).toBe(false);
    expect(result.actionText).toBe("Action Expired");
  });

  it('keeps active pending leaves actionable with Approve / Reject', () => {
    const raw: RawLeaveRequest = {
      id: 501,
      faculty_name: "CS Faculty 2",
      role: "teacher",
      department: "Computer Science",
      status: "PENDING",
      current_stage: "hod",
      hod_approval_status: "PENDING",
      start_date: "2026-10-28",
      end_date: "2026-10-29",
    };

    const result = processLeaveItem(raw, today);
    expect(result.displayStatus).toBe("Pending");
    expect(result.canApprove).toBe(true);
    expect(result.actionText).toBe("Approve / Reject");
  });

  it('marks approved and rejected historical leaves as non-actionable', () => {
    const approvedRaw: RawLeaveRequest = {
      id: 1330,
      faculty_name: "CS Faculty 11",
      role: "teacher",
      department: "Computer Science",
      status: "APPROVED",
      current_stage: "completed",
      hod_approval_status: "APPROVED",
      start_date: "2026-07-15",
      end_date: "2026-07-15",
    };

    const result = processLeaveItem(approvedRaw, today);
    expect(result.displayStatus).toBe("Approved");
    expect(result.canApprove).toBe(false);
    expect(result.actionText).toBe("No action needed");
  });
});

export function processPrincipalLeaveItem(
  leave: {
    id: number;
    status: string;
    end_date?: string;
    current_stage?: string;
    principal_approval_status?: string;
  },
  todayDateOnly: Date,
  userRole: string = "principal"
) {
  const isPending = leave.status === "PENDING" || leave.status === "Pending";
  let isPastDue = false;
  if (isPending && leave.end_date) {
    try {
      const end = new Date(leave.end_date);
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      isPastDue = endDateOnly < todayDateOnly;
    } catch {
      isPastDue = false;
    }
  }

  let displayStatus = "Unknown";
  if (leave.status === "APPROVED") {
    displayStatus = "Approved";
  } else if (leave.status === "REJECTED") {
    displayStatus = "Rejected";
  } else if (isPastDue) {
    displayStatus = "Past Due";
  } else if (leave.status === "PENDING") {
    displayStatus = "Pending";
  } else {
    displayStatus = leave.status;
  }

  // canTakeAction logic from HODLeavesManagement.tsx
  const canTakeAction = () => {
    if (displayStatus !== "Pending") return false;
    const role = (userRole || "").toLowerCase();
    const stage = (leave.current_stage || "").toLowerCase();

    if (!role || ["principal", "org_admin", "superadmin", "admin"].includes(role)) {
      return stage === "principal" && leave.principal_approval_status !== "APPROVED";
    }
    return false;
  };

  const getActionPendingLabel = () => {
    if (displayStatus === "Past Due") return "Action Expired";
    if (displayStatus !== "Pending") return null;
    const stage = (leave.current_stage || "").toLowerCase();
    if (stage === "alternate_duty") return "Awaiting Substitute";
    if (stage === "hod") return "Awaiting HOD";
    return "No action needed";
  };

  return {
    id: leave.id,
    status: displayStatus,
    canTakeAction: canTakeAction(),
    actionLabel: getActionPendingLabel(),
    isPastDue,
  };
}

describe('Principal HODLeavesManagement Past Due Logic', () => {
  const today = new Date(2026, 9, 26); // Oct 26, 2026

  it('marks unacted expired leave requests as Past Due with Action Expired for Principal', () => {
    const pastLeave = {
      id: 201,
      status: "PENDING",
      end_date: "2026-10-20",
      current_stage: "principal",
      principal_approval_status: "PENDING",
    };

    const result = processPrincipalLeaveItem(pastLeave, today, "principal");
    expect(result.status).toBe("Past Due");
    expect(result.canTakeAction).toBe(false);
    expect(result.actionLabel).toBe("Action Expired");
  });

  it('allows Principal to take action on active pending leaves at principal stage', () => {
    const activeLeave = {
      id: 202,
      status: "PENDING",
      end_date: "2026-10-30",
      current_stage: "principal",
      principal_approval_status: "PENDING",
    };

    const result = processPrincipalLeaveItem(activeLeave, today, "principal");
    expect(result.status).toBe("Pending");
    expect(result.canTakeAction).toBe(true);
  });

  it('does not allow action on leaves awaiting prior stages (e.g. HOD)', () => {
    const hodStageLeave = {
      id: 203,
      status: "PENDING",
      end_date: "2026-10-30",
      current_stage: "hod",
      principal_approval_status: "PENDING",
    };

    const result = processPrincipalLeaveItem(hodStageLeave, today, "principal");
    expect(result.status).toBe("Pending");
    expect(result.canTakeAction).toBe(false);
    expect(result.actionLabel).toBe("Awaiting HOD");
  });

  it('marks completed approved leaves as non-actionable', () => {
    const approvedLeave = {
      id: 204,
      status: "APPROVED",
      end_date: "2026-10-15",
      current_stage: "completed",
      principal_approval_status: "APPROVED",
    };

    const result = processPrincipalLeaveItem(approvedLeave, today, "principal");
    expect(result.status).toBe("Approved");
    expect(result.canTakeAction).toBe(false);
    expect(result.actionLabel).toBeNull();
  });
});

