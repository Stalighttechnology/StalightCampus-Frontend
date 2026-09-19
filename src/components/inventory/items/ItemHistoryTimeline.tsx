import React, { useState, useMemo } from "react";
import { InventoryHistoryLog } from "../../../utils/inventory_api";
import {
  History,
  User,
  Clock,
  ArrowRight,
  Package,
  Building,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Props {
  history: InventoryHistoryLog[];
  loading?: boolean;
}

export const ItemHistoryTimeline: React.FC<Props> = ({ history, loading }) => {
  const [filter, setFilter] = useState<"all" | "transfers" | "stockin" | "other">("all");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  // Client-side consolidated grouping if logs are not already consolidated by backend
  const consolidatedList = useMemo(() => {
    if (!history || history.length === 0) return [];

    // If already pre-consolidated (has action_title or count > 1 on batch events)
    const isPreConsolidated = history.some((h) => h.count && h.count > 1);
    if (isPreConsolidated) {
      return history;
    }

    // Otherwise, consolidate on frontend
    const consolidated: InventoryHistoryLog[] = [];

    history.forEach((log) => {
      const action = log.action_type || "";
      const reason = log.change_reason || "";
      const changedBy = log.changed_by_name || "Inventory Manager";
      const nv = log.new_value || {};
      const ov = log.old_value || {};
      const itemCode = log.item_code || "";
      const targetBranch = nv.target_branch || nv.branch || "";
      const targetLoc = nv.target_location || nv.location || "";
      const receivedBy = nv.received_by || "";
      const recipientRole = nv.recipient_role || "";
      const room = String(nv.target_room || nv.room || "").trim();

      let matched: InventoryHistoryLog | undefined;

      for (const evt of consolidated) {
        if (evt.action_type === action && evt.changed_by_name === changedBy) {
          if (action === "created") {
            if (!reason || !evt.change_reason || reason === evt.change_reason) {
              matched = evt;
              break;
            }
          } else if (action === "location_transferred" || action === "partial_allocation") {
            if (
              evt.destination_branch === targetBranch &&
              evt.destination_location === targetLoc &&
              evt.received_by === receivedBy
            ) {
              matched = evt;
              break;
            }
          } else if (action === "status_changed") {
            if (evt.old_value?.status === ov.status && evt.new_value?.status === nv.status) {
              matched = evt;
              break;
            }
          }
        }
      }

      if (matched) {
        matched.count = (matched.count || 1) + 1;
        if (itemCode && !matched.unit_codes?.includes(itemCode)) {
          matched.unit_codes = [...(matched.unit_codes || []), itemCode];
        }
        if (room && !matched.rooms?.includes(room)) {
          matched.rooms = [...(matched.rooms || []), room];
        }
        if (!matched.change_reason && reason) {
          matched.change_reason = reason;
        }
      } else {
        let title = "Asset Movement";
        if (action === "created") {
          const isDirectDept =
            reason.toLowerCase().includes("handed over") || !!targetBranch;
          title = isDirectDept
            ? "Direct Department Allocation & Stock-In"
            : "Stock-In & Buffer Inward";
        } else if (action === "location_transferred" || action === "partial_allocation") {
          title = "Department Allocation & Handover";
        } else if (action === "status_changed") {
          title = `Status Changed to ${(nv.status || "").toUpperCase()}`;
        } else if (action === "repaired") {
          title = "Maintenance & Repair";
        } else if (action === "scrapped") {
          title = "Asset Scrapped";
        }

        consolidated.push({
          ...log,
          action_title: title,
          count: 1,
          unit_codes: itemCode ? [itemCode] : [],
          destination_branch: targetBranch,
          destination_location: targetLoc,
          rooms: room ? [room] : [],
          received_by: receivedBy,
          recipient_role: recipientRole,
        });
      }
    });

    // Compute code_range and rooms_display
    consolidated.forEach((evt) => {
      const units = evt.unit_codes || [];
      if (units.length > 1 && units[0] !== units[units.length - 1]) {
        evt.code_range = `${units[0]} — ${units[units.length - 1]}`;
      } else if (units.length === 1) {
        evt.code_range = units[0];
      } else {
        evt.code_range = "--";
      }

      const rooms = evt.rooms || [];
      if (rooms.length > 4) {
        evt.rooms_display = `${rooms.slice(0, 4).join(", ")} (+${rooms.length - 4} more)`;
      } else {
        evt.rooms_display = rooms.join(", ");
      }
    });

    return consolidated;
  }, [history]);

  // Apply tab filter
  const filteredList = useMemo(() => {
    if (filter === "all") return consolidatedList;
    if (filter === "transfers") {
      return consolidatedList.filter(
        (e) =>
          e.action_type === "location_transferred" ||
          e.action_type === "partial_allocation" ||
          (e.action_type === "created" &&
            (e.change_reason?.toLowerCase().includes("handed over") || !!e.destination_branch))
      );
    }
    if (filter === "stockin") {
      return consolidatedList.filter(
        (e) =>
          e.action_type === "created" &&
          !e.change_reason?.toLowerCase().includes("handed over") &&
          !e.destination_branch
      );
    }
    return consolidatedList.filter(
      (e) => !["location_transferred", "partial_allocation", "created"].includes(e.action_type)
    );
  }, [consolidatedList, filter]);

  const toggleExpand = (id: string | number) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Loading transfer timeline...
      </div>
    );
  }

  if (!consolidatedList || consolidatedList.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
        <History className="w-8 h-8 opacity-30 text-muted-foreground" />
        <p className="font-medium">No transfer or movement records found.</p>
      </div>
    );
  }

  const getActionBadge = (evt: InventoryHistoryLog) => {
    const isTransfer =
      evt.action_type === "location_transferred" || evt.action_type === "partial_allocation";
    const isStockIn = evt.action_type === "created";
    const isDirectDeptStockIn =
      isStockIn &&
      (evt.change_reason?.toLowerCase().includes("handed over") || !!evt.destination_branch);
    const isStatus = evt.action_type === "status_changed";

    if (isTransfer || isDirectDeptStockIn) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
          <ArrowRightLeft className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          {evt.count && evt.count > 1 ? `Department Allocation (${evt.count} Units)` : "Allocation"}
        </span>
      );
    }
    if (isStockIn) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
          <Package className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          {evt.count && evt.count > 1 ? `Initial Stock-In (${evt.count} Units)` : "Stock-In"}
        </span>
      );
    }
    if (isStatus) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
          <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          Status Update
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
        {evt.action_type.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap border-b pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
            filter === "all"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All Activity ({consolidatedList.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("transfers")}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
            filter === "transfers"
              ? "bg-purple-600 text-white"
              : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
          }`}
        >
          Allocations & Transfers
        </button>
        <button
          type="button"
          onClick={() => setFilter("stockin")}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
            filter === "stockin"
              ? "bg-emerald-600 text-white"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          }`}
        >
          Stock-In / PO
        </button>
      </div>

      {/* Clean Timeline Feed */}
      <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {filteredList.map((evt, idx) => {
          let dateStr = "";
          try {
            dateStr = formatDistanceToNow(parseISO(evt.created_at), { addSuffix: true });
          } catch (e) {
            dateStr = evt.created_at;
          }

          const isTransfer =
            evt.action_type === "location_transferred" || evt.action_type === "partial_allocation";
          const isStockIn = evt.action_type === "created";
          const eventKey = String(evt.id || idx);
          const isExpanded = !!expandedEvents[eventKey];
          const hasMultipleUnits = (evt.unit_codes?.length || 0) > 1;

          return (
            <div key={eventKey} className="relative group">
              {/* Timeline Indicator */}
              <div
                className={`absolute -left-5 top-2 w-2.5 h-2.5 rounded-full border-2 border-background ring-3 ${
                  isTransfer
                    ? "bg-purple-600 ring-purple-200 dark:ring-purple-950"
                    : isStockIn
                    ? "bg-emerald-600 ring-emerald-200 dark:ring-emerald-950"
                    : "bg-blue-600 ring-blue-200 dark:ring-blue-950"
                }`}
              />

              {/* Event Card */}
              <div className="bg-card border rounded-xl p-3.5 shadow-2xs hover:border-border/80 transition-all space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getActionBadge(evt)}
                    <span className="text-xs font-bold text-foreground">
                      {evt.action_title || evt.action_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    {dateStr}
                  </span>
                </div>

                {/* Handover & Location Summary */}
                {isTransfer && (
                  <div className="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/50 space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-foreground">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>
                          <strong>{evt.destination_location || evt.new_value?.target_location || "Engineering Block"}</strong>
                          {" — "}
                          <span className="text-muted-foreground">
                            {evt.destination_branch || evt.new_value?.target_branch || "General Dept"}
                          </span>
                        </span>
                      </div>

                      {(evt.rooms_display || evt.new_value?.target_room) && (
                        <div className="text-muted-foreground">
                          <strong>Rooms:</strong> {evt.rooms_display || evt.new_value?.target_room}
                        </div>
                      )}
                    </div>

                    {(evt.received_by || evt.new_value?.received_by) && (
                      <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-200 font-semibold pt-0.5">
                        <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>
                          Custody: <strong>{evt.received_by || evt.new_value?.received_by}</strong>{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({evt.recipient_role || evt.new_value?.recipient_role || "Recipient"})
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stock-In Summary */}
                {isStockIn && (
                  <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 space-y-1 text-xs">
                    <p className="text-foreground font-medium">
                      {evt.change_reason || "Stocked into Central Store Buffer Bay."}
                    </p>
                  </div>
                )}

                {/* Reason if available */}
                {evt.change_reason && !isStockIn && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {evt.change_reason}
                  </p>
                )}

                {/* Units Affected & Footer */}
                <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-primary" />
                    <span>
                      Logged by: <strong className="text-foreground">{evt.changed_by_name}</strong>
                    </span>
                  </div>

                  {evt.code_range && evt.code_range !== "--" && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-primary">
                        Units ({evt.unit_codes?.length || evt.count || 1}): {evt.code_range}
                      </span>
                      {hasMultipleUnits && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(eventKey)}
                          className="text-[10.5px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                        >
                          {isExpanded ? (
                            <>
                              Hide List <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              View All ({evt.unit_codes?.length}) <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expandable Serial Code Pills Grid */}
                {isExpanded && evt.unit_codes && evt.unit_codes.length > 0 && (
                  <div className="pt-2 border-t border-border/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Included Serial Codes:
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-muted/40 rounded-lg">
                      {evt.unit_codes.map((code) => (
                        <span
                          key={code}
                          className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-background border border-border/70 text-foreground font-medium"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
