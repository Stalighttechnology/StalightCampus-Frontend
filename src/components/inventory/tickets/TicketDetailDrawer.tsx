import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
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
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";

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
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary">
                  {ticket.ticket_number}
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getPriorityStyle(
                    ticket.priority
                  )}`}
                >
                  {ticket.priority} Priority
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-bold text-muted-foreground uppercase">
                  {ticket.status.replace(/_/g, " ")}
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-foreground pt-1">
                {ticket.issue_category.replace(/_/g, " ").toUpperCase()}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/20 border rounded-2xl text-xs">
            <div>
              <span className="text-muted-foreground">Reported By:</span>
              <p className="font-bold text-foreground">{ticket.reported_by_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned Technician:</span>
              <p className="font-bold text-foreground">{ticket.assigned_to_name || "Unassigned"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Item / Asset:</span>
              <p className="font-bold text-primary font-mono">{ticket.item_code || "General Item"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Location & Room:</span>
              <p className="font-bold text-foreground">
                {ticket.department_name || "General"} {ticket.room_no && `• ${ticket.room_no}`}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 border rounded-2xl bg-card space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Attached Photo / Document
                </a>
              </div>
            )}
          </div>

          {/* Updates Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" /> Activity & Resolution Log
            </h4>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {ticket.updates?.map((u) => (
                <div key={u.id} className="p-3 bg-muted/30 border rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground text-[11px]">
                    <span className="font-bold text-foreground">{u.updated_by_name}</span>
                    <span>{new Date(u.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-foreground">{u.notes}</p>
                  {u.status_to && u.status_from !== u.status_to && (
                    <span className="inline-block text-[10px] font-bold text-primary">
                      Status changed: {u.status_from} $\rightarrow$ {u.status_to}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Form */}
          <form onSubmit={handleUpdate} className="p-4 border rounded-2xl bg-card space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
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

            <div className="flex justify-end gap-2 pt-1">
              <Button type="submit" disabled={submitting} className="gap-1.5 text-xs font-semibold">
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
