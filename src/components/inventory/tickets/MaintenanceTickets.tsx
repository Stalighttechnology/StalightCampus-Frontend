import React, { useState, useEffect } from "react";
import {
  InventoryTicket,
  fetchInventoryTickets,
  fetchInventoryTicketsPaginated,
} from "../../../utils/inventory_api";
import { RaiseTicketModal } from "./RaiseTicketModal";
import { TicketDetailDrawer } from "./TicketDetailDrawer";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card } from "../../ui/card";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Props {
  role?: string;
  branches?: Array<{ id: number; name: string }>;
  users?: Array<{ id: number; name: string }>;
}

export const MaintenanceTickets: React.FC<Props> = ({ role = "admin", branches = [], users = [] }) => {
  const [tickets, setTickets] = useState<InventoryTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modals
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<InventoryTicket | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    const handler = setTimeout(() => {
      loadTickets(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search, selectedStatus, selectedPriority]);

  const loadTickets = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== "all") params.status = selectedStatus;
      if (selectedPriority !== "all") params.priority = selectedPriority;

      const res = await fetchInventoryTicketsPaginated(params);
      if (res && Array.isArray(res.results)) {
        setTickets(res.results);
        setTotalCount(res.count ?? res.results.length);
        setTotalPages(res.total_pages ?? (Math.ceil((res.count || res.results.length) / pageSize) || 1));
      } else if (Array.isArray(res)) {
        setTickets(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
      } else {
        setTickets([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load maintenance tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadTickets(page);
  };

  const startIndex = (currentPage - 1) * pageSize;

  const getStatusChip = (status: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      pending: { label: "Pending", bg: "bg-amber-50 text-amber-700 border-amber-200" },
      in_progress: { label: "In Progress", bg: "bg-blue-50 text-blue-700 border-blue-200" },
      procure_in_progress: { label: "Part Procurement", bg: "bg-purple-50 text-purple-700 border-purple-200" },
      waiting_for_user: { label: "Waiting for Info", bg: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      resolved: { label: "Resolved", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      closed: { label: "Closed", bg: "bg-gray-50 text-gray-700 border-gray-200" },
    };
    const s = map[status] || { label: status, bg: "bg-muted", text: "text-muted-foreground" };
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar with Integrated Actions */}
      <Card className="p-3.5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full sm:w-auto sm:flex-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets, assets, reporter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9 rounded-xl"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="text-xs h-9 rounded-xl">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="procure_in_progress">Part Procurement</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="text-xs h-9 rounded-xl">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              size="sm"
              onClick={() => setShowRaiseModal(true)}
              className="h-9 gap-1.5 text-xs font-semibold shadow-sm w-full sm:w-auto rounded-xl px-4"
            >
              <Plus className="w-3.5 h-3.5" /> Report Issue
            </Button>
          </div>
        </div>
      </Card>

      {/* Tickets Table */}
      <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 w-16 text-center whitespace-nowrap">Sl No</th>
                <th className="py-3 px-4">Ticket No</th>
                <th className="py-3 px-4">Asset / Category</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Reported By</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-500" />
                    No active maintenance tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((t, idx) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono font-semibold text-muted-foreground whitespace-nowrap">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-primary whitespace-nowrap">
                      {t.ticket_number}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{t.item_code || "General"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.issue_category.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-foreground truncate">{t.issue_description}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-foreground uppercase">{t.priority}</span>
                      {t.sla_due_date && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Due: {new Date(t.sla_due_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      <div className="font-medium text-foreground">{t.reported_by_name}</div>
                      <div className="text-[10px]">{new Date(t.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusChip(t.status)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTicket(t)}
                        className="h-7 text-xs font-semibold"
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!loading && tickets.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-bold text-foreground">
              {startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-foreground">
              {Math.min(startIndex + pageSize, totalCount || tickets.length)}
            </span>{" "}
            of <span className="font-bold text-foreground">{totalCount || tickets.length}</span> ticket(s)
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1 px-2 font-medium">
              Page <span className="font-bold text-foreground">{currentPage}</span> of{" "}
              <span className="font-bold text-foreground">{totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Raise Ticket Modal */}
      <RaiseTicketModal
        isOpen={showRaiseModal}
        onClose={() => setShowRaiseModal(false)}
        onSuccess={() => loadTickets(1)}
        branches={branches}
      />

      {/* Ticket Details & Stepper Drawer */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onRefresh={() => loadTickets(currentPage)}
        users={users}
        role={role}
      />
    </div>
  );
};
