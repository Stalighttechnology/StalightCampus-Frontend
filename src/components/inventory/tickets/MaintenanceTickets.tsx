import React, { useState, useEffect } from "react";
import {
  InventoryTicket,
  fetchInventoryTicketsPaginated,
} from "../../../utils/inventory_api";
import { RaiseTicketModal } from "./RaiseTicketModal";
import { TicketDetailDrawer } from "./TicketDetailDrawer";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/card";
import {
  Wrench,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

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
      pending: { label: "PENDING", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
      in_progress: { label: "IN PROGRESS", bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" },
      procure_in_progress: { label: "PROCUREMENT", bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800" },
      waiting_for_user: { label: "WAITING INFO", bg: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800" },
      resolved: { label: "RESOLVED", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" },
      closed: { label: "CLOSED", bg: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" },
    };
    const s = map[status] || { label: (status || "").toUpperCase(), bg: "bg-muted text-muted-foreground border-border" };
    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const getPriorityChip = (priority: string, due?: string) => {
    const map: Record<string, { label: string; bg: string }> = {
      urgent: { label: "URGENT (12H)", bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" },
      high: { label: "HIGH (24H)", bg: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800" },
      medium: { label: "MEDIUM (48H)", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
      low: { label: "LOW (72H)", bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" },
    };
    const p = map[priority] || { label: (priority || "MEDIUM").toUpperCase(), bg: "bg-muted text-muted-foreground border-border" };
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${p.bg}`}>
          {p.label}
        </span>
        {due && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> Due: {new Date(due).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  };

  const formatCategory = (cat: string) => {
    if (!cat) return "--";
    return cat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="w-full text-sm sm:text-base">
      <Card className="w-full bg-white dark:bg-card border border-gray-200 dark:border-border flex flex-col min-h-[620px] md:min-h-[700px] shadow-sm rounded-xl overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col">
          <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
            <div className="shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl sm:text-2xl font-semibold">Maintenance & Service Tickets</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Track hardware repairs, equipment issues, SLAs, and resolution progress
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowRaiseModal(true)}
                className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Report Issue</span>
              </Button>
            </div>
          </CardHeader>

          {/* Search & Filters */}
          <div className="px-3 sm:px-5 pt-3 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 sm:flex-initial sm:w-72">
                <Input
                  placeholder="Search tickets, assets, reporter..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white dark:bg-card text-foreground py-1 pr-12 text-xs sm:text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="procure_in_progress">Part Procurement</SelectItem>
                  <SelectItem value="waiting_for_user">Waiting for Info</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low (72h SLA)</SelectItem>
                  <SelectItem value="medium">Medium (48h SLA)</SelectItem>
                  <SelectItem value="high">High (24h SLA)</SelectItem>
                  <SelectItem value="urgent">Urgent (12h SLA)</SelectItem>
                </SelectContent>
              </Select>

              {(search || selectedStatus !== "all" || selectedPriority !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedStatus("all");
                    setSelectedPriority("all");
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="flex-1 overflow-hidden flex flex-col px-3 sm:px-5 pt-0 pb-3">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading maintenance tickets...
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block flex-1 overflow-y-auto overflow-x-auto border rounded-xl mb-2 relative shadow-inner">
                <table className="w-full text-base md:text-sm text-left table-auto border-collapse">
                  <thead className="sticky top-0 z-20 border-b text-sm md:text-xs uppercase font-bold tracking-wider bg-slate-50/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-border shadow-sm backdrop-blur-md">
                    <tr>
                      <th className="py-3.5 px-4 text-left font-bold">Ticket No</th>
                      <th className="py-3.5 px-4 font-bold">Asset / Equipment</th>
                      <th className="py-3.5 px-4 font-bold">Category</th>
                      <th className="py-3.5 px-4 font-bold">Department</th>
                      <th className="py-3.5 px-4 font-bold">Issue Description</th>
                      <th className="py-3.5 px-4 font-bold text-center">Priority</th>
                      <th className="py-3.5 px-4 font-bold">Reported By</th>
                      <th className="py-3.5 px-4 font-bold text-center">Status</th>
                      <th className="py-3.5 px-4 text-right font-bold w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-muted-foreground">
                          No maintenance tickets found.
                        </td>
                      </tr>
                    ) : (
                      tickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="transition-colors duration-200 hover:bg-blue-50/40 dark:hover:bg-accent/70 text-foreground cursor-pointer"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          {/* Ticket Number */}
                          <td className="py-3.5 px-4 align-middle font-medium whitespace-nowrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {ticket.ticket_number}
                            </span>
                          </td>

                          {/* Asset / Equipment */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="break-words font-semibold text-foreground text-sm">
                              {ticket.item_code || "General Asset"}
                            </div>
                            {ticket.inventory_item && (
                              <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                                Item #{ticket.inventory_item}
                              </div>
                            )}
                          </td>

                          {/* Category Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="text-xs font-medium text-foreground">
                              {formatCategory(ticket.issue_category)}
                            </div>
                          </td>

                          {/* Department Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="text-xs font-medium text-foreground">
                              {ticket.department_name || "--"}
                            </div>
                            {ticket.room_no && (
                              <div className="text-[11px] text-muted-foreground">Room: {ticket.room_no}</div>
                            )}
                          </td>

                          {/* Issue Description */}
                          <td className="py-3.5 px-4 align-middle max-w-xs">
                            <p className="text-xs text-foreground truncate" title={ticket.issue_description}>
                              {ticket.issue_description}
                            </p>
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                            {getPriorityChip(ticket.priority, ticket.sla_due_date)}
                          </td>

                          {/* Reported By */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <div className="text-xs font-medium text-foreground">
                              {ticket.reported_by_name || "Staff"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                            {getStatusChip(ticket.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedTicket(ticket)}
                                className="gap-1 text-xs font-semibold h-8"
                                title="View & Manage Ticket"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-3 md:hidden mb-2">
                {tickets.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground bg-card/30 rounded-lg border border-dashed border-border">
                    No maintenance tickets found.
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 rounded-xl border bg-white dark:bg-card border-gray-200 dark:border-border text-foreground flex flex-col gap-3 shadow-sm"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {ticket.ticket_number}
                            </span>
                            {getStatusChip(ticket.status)}
                          </div>
                          <h3 className="font-semibold text-sm text-foreground mt-1">
                            {ticket.item_code || "General Equipment"}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {ticket.issue_description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
                        <div>
                          <span className="text-muted-foreground">Category:</span>{" "}
                          <strong className="text-foreground">{formatCategory(ticket.issue_category)}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Department:</span>{" "}
                          <strong className="text-foreground">{ticket.department_name || "--"}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reported By:</span>{" "}
                          <span className="text-foreground">{ticket.reported_by_name || "Staff"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Priority:</span>{" "}
                          <span className="font-bold text-foreground uppercase">{ticket.priority}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTicket(ticket)}
                          className="gap-1 text-xs font-semibold h-8 w-full"
                        >
                          <Eye className="w-3.5 h-3.5" /> View & Manage
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>

        {/* Pagination Bar - only displayed when data is more than 10 */}
        {!loading && (totalCount > pageSize || totalPages > 1) && (
          <div className="px-4 py-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
            <div>
              Showing <span className="font-bold text-foreground">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-foreground">
                {Math.min(startIndex + pageSize, totalCount || tickets.length)}
              </span>{" "}
              of <span className="font-bold text-foreground">{totalCount || tickets.length}</span> Ticket(s)
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
      </Card>

      {/* Raise Ticket Modal */}
      <RaiseTicketModal
        isOpen={showRaiseModal}
        onClose={() => setShowRaiseModal(false)}
        onSuccess={() => loadTickets(1)}
        branches={branches}
      />

      {/* Ticket Details & Stepper Drawer / Modal */}
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
