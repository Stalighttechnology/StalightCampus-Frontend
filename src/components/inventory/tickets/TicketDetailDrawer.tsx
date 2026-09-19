import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import {
  InventoryTicket,
  updateInventoryTicket,
} from "../../../utils/inventory_api";
import {
  Wrench,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ExternalLink,
  MessageSquare,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  ticket: InventoryTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  users?: Array<{ id: number; name: string }>;
  role?: string;
}

export const TicketDetailDrawer: React.FC<Props> = ({
  ticket,
  isOpen,
  onClose,
  onRefresh,
  users = [],
  role = "admin",
}) => {
  const canManage = [
    "inventory_manager",
    "admin",
    "org_admin",
    "superadmin",
    "dean",
    "hod",
    "principal",
  ].includes(role);
  const [newNote, setNewNote] = useState("");
  const [statusUpdate, setStatusUpdate] = useState<string>("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  if (!ticket) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) {
      toast.error("Please add a note or resolution comment");
      return;
    }

    try {
      setSubmitting(true);
      await updateInventoryTicket(ticket.id, {
        notes: newNote.trim(),
        status: statusUpdate || ticket.status,
        assigned_to_id: assignedToId ? Number(assignedToId) : undefined,
      });

      toast.success("Ticket updated successfully");
      setNewNote("");
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      pending: { label: "PENDING", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
      in_progress: { label: "IN PROGRESS", bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" },
      procure_in_progress: { label: "PROCUREMENT", bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800" },
      waiting_for_user: { label: "WAITING INFO", bg: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800" },
      resolved: { label: "RESOLVED", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" },
      closed: { label: "CLOSED", bg: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" },
    };
    const s = map[status] || { label: (status || "").toUpperCase(), bg: "bg-muted text-muted-foreground border-border" };
    return (
      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-block ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90%] sm:w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-xl sm:rounded-2xl custom-scrollbar">
        <DialogHeader className="border-b pb-3 pr-8">
          <div className="flex items-center gap-2.5 flex-wrap">
            <DialogTitle className="text-lg font-semibold">
              Maintenance Ticket Details
            </DialogTitle>
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-primary/10 text-primary">
              {ticket.ticket_number}
            </span>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getPriorityStyle(
                ticket.priority
              )}`}
            >
              {ticket.priority.toUpperCase()} PRIORITY
            </span>
            {getStatusBadge(ticket.status)}
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Category: <strong className="text-foreground">{ticket.issue_category.replace(/_/g, " ").toUpperCase()}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/20 border rounded-2xl text-xs">
            <div>
              <span className="text-muted-foreground">Reported By:</span>
              <p className="font-semibold text-foreground">{ticket.reported_by_name || "Staff"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned Technician:</span>
              <p className="font-semibold text-foreground">{ticket.assigned_to_name || "Unassigned"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Item / Asset:</span>
              <p className="font-semibold text-primary font-mono">{ticket.item_code || "General Item"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Location & Room:</span>
              <p className="font-semibold text-foreground">
                {ticket.department_name || "General"} {ticket.room_no && `• ${ticket.room_no}`}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 border rounded-2xl bg-card space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Issue Details
            </h4>
            <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
              {ticket.issue_description}
            </p>

            {ticket.attachment_url && (
              <div className="pt-2">
                <a
                  href={ticket.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Attached Photo / Document
                </a>
              </div>
            )}
          </div>

          {/* Updates Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" /> Activity & Resolution Log
            </h4>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {ticket.updates?.map((u) => (
                <div key={u.id} className="p-3 bg-muted/30 border rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground text-[11px]">
                    <span className="font-semibold text-foreground">{u.updated_by_name}</span>
                    <span>{new Date(u.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-foreground">{u.notes}</p>
                  {u.status_to && u.status_from !== u.status_to && (
                    <span className="inline-block text-[10px] font-semibold text-primary">
                      Status changed: {u.status_from} → {u.status_to}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Form */}
          <form onSubmit={handleUpdate} className="p-4 border rounded-2xl bg-card space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {canManage ? "Update Status & Add Resolution Note" : "Post Ticket Update / Comment"}
            </h4>

            {canManage && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    New Status
                  </label>
                  <Select
                    value={statusUpdate || ticket.status}
                    onValueChange={setStatusUpdate}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="procure_in_progress">Part Procurement</SelectItem>
                      <SelectItem value="waiting_for_user">Waiting for Info</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {users.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Assign Technician
                    </label>
                    <Select value={assignedToId} onValueChange={setAssignedToId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign Staff Member" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div>
              <Textarea
                rows={2}
                placeholder="Add technician notes, work done, or resolution summary..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs font-semibold">
                Close
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5 text-xs font-semibold h-9 px-4">
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Submit Update
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
