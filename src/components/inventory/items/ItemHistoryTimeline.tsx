import React from "react";
import { InventoryHistoryLog } from "../../../utils/inventory_api";
import { History, User, Clock, ArrowRight, Package, Building, UserCheck } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Props {
  history: InventoryHistoryLog[];
  loading?: boolean;
}

export const ItemHistoryTimeline: React.FC<Props> = ({ history, loading }) => {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading audit timeline...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
        <History className="w-8 h-8 opacity-40" />
        <p>No audit history recorded yet.</p>
      </div>
    );
  }

  const getBadgeStyle = (action: string) => {
    switch (action) {
      case "created":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "partial_allocation":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold";
      case "status_changed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "location_transferred":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      case "repaired":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "scrapped":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "ticket_raised":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
      {history.map((log) => {
        let dateStr = "";
        try {
          dateStr = formatDistanceToNow(parseISO(log.created_at), { addSuffix: true });
        } catch (e) {
          dateStr = log.created_at;
        }

        const isTransferOrAllocation =
          log.action_type === "partial_allocation" ||
          log.action_type === "location_transferred" ||
          (log.action_type === "created" && log.old_value?.source_item_code);

        return (
          <div key={log.id} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background ring-4 ring-primary/20" />

            <div className="bg-card border rounded-xl p-3.5 shadow-sm space-y-2.5 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getBadgeStyle(
                    log.action_type
                  )}`}
                >
                  {log.action_type.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  {dateStr}
                </span>
              </div>

              {log.change_reason && (
                <p className="text-xs text-foreground font-medium leading-relaxed">{log.change_reason}</p>
              )}

              {/* Handover & Location Summary Card */}
              {isTransferOrAllocation && log.new_value && (
                <div className="p-2.5 bg-muted/30 border rounded-lg space-y-1.5 text-xs">
                  {log.new_value.allocated_quantity && (
                    <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                      <Package className="w-3.5 h-3.5" />
                      <span>
                        Quantity Handed Over: {log.new_value.allocated_quantity} unit(s)
                      </span>
                    </div>
                  )}

                  {(log.new_value.target_location || log.new_value.location) && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building className="w-3.5 h-3.5 text-primary" />
                      <span>
                        Destination: <strong>{log.new_value.target_location || log.new_value.location}</strong> ({log.new_value.target_branch || log.new_value.branch || "General"}, Room {log.new_value.target_room || log.new_value.room || "--"})
                      </span>
                    </div>
                  )}

                  {log.new_value.received_by && log.new_value.received_by !== "Unassigned" && (
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>
                        Received & Custody: <strong className="text-purple-700 dark:text-purple-300">{log.new_value.received_by}</strong> ({log.new_value.recipient_role || "Recipient"})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Detail Payload Preview for other field changes */}
              {!isTransferOrAllocation && log.old_value && log.new_value && Object.keys(log.old_value).length > 0 && (
                <div className="bg-muted/40 rounded-lg p-2 text-[11px] font-mono space-y-1 text-muted-foreground">
                  {Object.keys(log.new_value).map((key) => {
                    const oldV = log.old_value[key];
                    const newV = log.new_value[key];
                    if (oldV === newV) return null;
                    return (
                      <div key={key} className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground">{key}:</span>
                        <span className="line-through text-destructive">{String(oldV || "none")}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-emerald-600 font-semibold">{String(newV || "none")}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                <User className="w-3 h-3 text-primary" />
                <span>Changed by: <strong className="text-foreground">{log.changed_by_name}</strong></span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
