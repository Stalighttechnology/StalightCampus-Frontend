import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Filter, FileText, ExternalLink, Calendar as CalendarIcon, Search, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  getSuperAdminDeveloperLeaves,
  actionSuperAdminDeveloperLeave,
  DeveloperLeaveAdminRecord
} from "../../utils/admin_api";

const getStatusBadge = (status: string, theme: string) => {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900/40 text-yellow-200 border border-yellow-700/40' : 'bg-yellow-100 text-yellow-700'}`}>
          Pending
        </span>
      );
    case "APPROVED":
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-green-900/40 text-green-200 border border-green-700/40' : 'bg-green-100 text-green-700'}`}>
          Approved
        </span>
      );
    case "REJECTED":
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-red-900/40 text-red-200 border border-red-700/40' : 'bg-red-100 text-red-700'}`}>
          Rejected
        </span>
      );
    case "CANCELLED":
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-gray-100 text-gray-700'}`}>
          Cancelled
        </span>
      );
    default:
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
          {status}
        </span>
      );
  }
};

const renderLeaveCategoryBadge = (leaveType: string, isHalfDay?: boolean, halfDaySession?: string | null) => {
  const normalizedType = (leaveType || 'casual').toLowerCase();

  let label = 'Casual (CL)';
  let colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';

  if (normalizedType === 'sick') {
    label = 'Sick / Medical (SL)';
    colorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  } else if (normalizedType === 'earned') {
    label = 'Earned (EL)';
    colorClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300';
  } else if (normalizedType === 'comp_off') {
    label = 'Comp Off';
    colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  } else if (normalizedType === 'short_permission') {
    label = 'Short Permission';
    colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
  } else if (normalizedType === 'lop') {
    label = 'Leave Without Pay (LOP)';
    colorClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
  }

  const showHalfDay = Boolean(isHalfDay || normalizedType === 'half_day');
  const sessionNormalized = (halfDaySession || '').toLowerCase();
  const sessionText = (sessionNormalized === 'forenoon' || sessionNormalized === 'morning') ? 'Morning' : 'Afternoon';

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded w-fit ${colorClass}`}>
        {label}
      </span>
      {showHalfDay && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 w-fit">
          Half-Day ({sessionText})
        </span>
      )}
    </div>
  );
};

const formatDateString = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (y && m && d) return `${d}-${m}-${y}`;
  return dateStr;
};

const DeveloperLeaveApprovals: React.FC = () => {
  const { theme } = useTheme();

  const [leaves, setLeaves] = useState<DeveloperLeaveAdminRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // View Reason / Details Modal
  const [selectedLeaveForReason, setSelectedLeaveForReason] = useState<DeveloperLeaveAdminRecord | null>(null);

  const fetchLeaves = async (targetPage: number, filterStatus: string, searchQuery: string) => {
    try {
      setLoading(true);
      const params: any = {
        page: targetPage,
        page_size: 10,
        status: filterStatus === "ALL" ? undefined : filterStatus,
        search: searchQuery.trim() || undefined,
      };

      const res = await getSuperAdminDeveloperLeaves(params);
      if (res.success && res.data) {
        setLeaves(res.data);
        setTotalPages(res.total_pages || 1);
        setTotalCount(res.count || (res.data ? res.data.length : 0));
      } else {
        setLeaves([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (e) {
      toast.error("Failed to load developer leave applications");
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves(currentPage, statusFilter, search);
  }, [currentPage, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLeaves(1, statusFilter, search);
  };

  const handleApprove = async (leave: DeveloperLeaveAdminRecord) => {
    const isShortPermission = leave.leave_type === "short_permission";
    const typeLabel = isShortPermission ? "Short Permission" : "Leave";

    const result = await Swal.fire({
      title: `Approve ${typeLabel}?`,
      text: `Are you sure you want to approve this ${typeLabel.toLowerCase()} request for ${leave.developer_name}?`,
      input: "textarea",
      inputPlaceholder: "Optional approval remarks for developer...",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#22c55e",
      cancelButtonColor: theme === "dark" ? "#3f3f46" : "#d1d5db",
      confirmButtonText: "Yes, Approve",
      background: theme === "dark" ? "#1c1c1e" : "#ffffff",
      color: theme === "dark" ? "#E4E4E7" : "#000000"
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const remarks = typeof result.value === "string" ? result.value.trim() : "";
      const res = await actionSuperAdminDeveloperLeave(leave.id, {
        action: "APPROVE",
        remarks
      });

      if (res.success) {
        toast.success(`Leave request for ${leave.developer_name} approved!`);
        fetchLeaves(currentPage, statusFilter, search);
        Swal.fire({
          icon: "success",
          title: `${typeLabel} Approved!`,
          text: `The ${typeLabel.toLowerCase()} request has been approved successfully.`,
          background: theme === "dark" ? "#1c1c1e" : "#ffffff",
          color: theme === "dark" ? "#E4E4E7" : "#000000",
          confirmButtonColor: "#22c55e"
        });
      } else {
        toast.error(res.message || "Failed to approve leave request");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (leave: DeveloperLeaveAdminRecord) => {
    const isShortPermission = leave.leave_type === "short_permission";
    const typeLabel = isShortPermission ? "Short Permission" : "Leave";

    const result = await Swal.fire({
      title: `Reject ${typeLabel}?`,
      text: `Are you sure you want to reject this ${typeLabel.toLowerCase()} request for ${leave.developer_name}?`,
      input: "textarea",
      inputPlaceholder: "Enter reason for rejection (required)...",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: theme === "dark" ? "#3f3f46" : "#d1d5db",
      confirmButtonText: "Yes, Reject",
      background: theme === "dark" ? "#1c1c1e" : "#ffffff",
      color: theme === "dark" ? "#E4E4E7" : "#000000",
      preConfirm: (val) => {
        if (!val || !val.trim()) {
          Swal.showValidationMessage("Please provide a rejection reason.");
          return false;
        }
        return val.trim();
      }
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const remarks = result.value || "";
      const res = await actionSuperAdminDeveloperLeave(leave.id, {
        action: "REJECT",
        remarks
      });

      if (res.success) {
        toast.success(`Leave request for ${leave.developer_name} rejected.`);
        fetchLeaves(currentPage, statusFilter, search);
        Swal.fire({
          icon: "error",
          title: `${typeLabel} Rejected`,
          text: `The ${typeLabel.toLowerCase()} request has been rejected.`,
          background: theme === "dark" ? "#1c1c1e" : "#ffffff",
          color: theme === "dark" ? "#E4E4E7" : "#000000",
          confirmButtonColor: "#ef4444"
        });
      } else {
        toast.error(res.message || "Failed to reject leave request");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full min-h-full ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card id="developer-leaves-card" className={theme === 'dark' ? 'bg-card border border-border flex flex-col w-full shadow-sm' : 'bg-white border border-gray-200 flex flex-col w-full shadow-sm'}>
        <CardHeader id="developer-leaves-header-section" className="leave-card-header border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <CardTitle className="text-lg sm:text-2xl font-semibold tracking-tight">Leave Requests</CardTitle>
              {totalCount > 0 && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center ${theme === 'dark' ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {totalCount} Total
                </span>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Review and approve leave and permission requests routed to you for approval
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search developer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-8 h-9 text-xs sm:text-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-300'}`}
              />
            </form>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
              <SelectTrigger className="leave-filter-select min-w-[100px] w-auto px-3 h-9 flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 [&>svg:last-child]:hidden [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:gap-2 shadow-sm font-medium text-sm">
                <Filter className="h-4 w-4" />
                <span>{statusFilter === "ALL" ? "Filter" : statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}</span>
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 px-2 sm:px-6 pt-3">
          <div className="border rounded-xl overflow-hidden shadow-sm">
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-3 p-2">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading leave requests...</p>
                </div>
              ) : leaves.length > 0 ? (
                leaves.map((leave) => (
                  <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-base break-all">{leave.developer_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            DEVELOPER
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">{leave.developer_email}</span>
                        </div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(leave.status, theme)}</div>
                    </div>

                    <div className="mt-2.5">
                      <div className="text-sm font-semibold text-foreground">{leave.title || "Leave Application"}</div>
                      {renderLeaveCategoryBadge(leave.leave_type, leave.is_half_day, leave.half_day_session)}
                      {leave.substitute_developer_name && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                          <span>Standby: <span className="font-semibold text-foreground">{leave.substitute_developer_name}</span></span>
                          {leave.substitute_status === 'ACCEPTED' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              ✓ Accepted
                            </span>
                          )}
                          {leave.substitute_status === 'DECLINED' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                              ✕ Declined
                            </span>
                          )}
                          {leave.substitute_status === 'PENDING' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              ⏳ Awaiting Standby
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 space-y-3">
                      <div className={`p-2.5 rounded-lg border text-sm flex flex-col gap-1 ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50/50 border-gray-100'}`}>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-primary/60" />
                          <span className="font-medium text-foreground">{formatDateString(leave.start_date)}</span>
                          {leave.start_date !== leave.end_date && (
                            <>
                              <span className="text-muted-foreground">to</span>
                              <span className="font-medium text-foreground">{formatDateString(leave.end_date)}</span>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto font-medium">({leave.days_count} {leave.days_count === 1 ? 'day' : 'days'})</span>
                        </div>
                        {leave.start_time && leave.end_time && (
                          <div className="text-xs font-semibold text-primary pl-6">
                            {leave.start_time} - {leave.end_time}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-full h-9 font-semibold transition border ${
                            theme === 'dark'
                              ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                              : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                          }`}
                          onClick={() => setSelectedLeaveForReason(leave)}
                        >
                          View Reason
                        </Button>

                        {leave.document_url && (
                          <a
                            href={leave.document_url}
                            target="_blank"
                            rel="noreferrer"
                            className={`w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md border shadow-sm transition-all ${
                              theme === 'dark'
                                ? 'border-sky-500/30 bg-sky-950/30 text-sky-300 hover:bg-sky-950/50'
                                : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                            }`}
                          >
                            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                            <span>View Attachment</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        )}
                      </div>

                      {leave.status === 'PENDING' ? (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <Button
                            variant="outline"
                            className={`text-xs flex items-center justify-center gap-1 ${
                              theme === 'dark'
                                ? 'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20'
                                : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                            }`}
                            onClick={() => handleApprove(leave)}
                            disabled={loading}
                          >
                            <CheckCircle size={16} /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            className={`text-xs flex items-center justify-center gap-1 ${
                              theme === 'dark'
                                ? 'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20'
                                : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                            }`}
                            onClick={() => handleReject(leave)}
                            disabled={loading}
                          >
                            <XCircle size={16} /> Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-2 text-center border-t border-border/30">
                          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            {leave.status === 'APPROVED' ? `Approved on ${formatDateString(leave.reviewed_at?.slice(0, 10) || '')}` : leave.status === 'REJECTED' ? `Rejected on ${formatDateString(leave.reviewed_at?.slice(0, 10) || '')}` : 'No action needed'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-white'}`}>
                  <CalendarIcon className="w-10 h-10 text-primary opacity-30 mb-3" />
                  <h3 className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Leave Requests</h3>
                  <p className={`text-xs text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>There are currently no leave requests to display for this period.</p>
                </div>
              )}
            </div>

            {/* Desktop / Tablet: table matching HODLeavesManagement */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left border-collapse">
                <thead className={`sticky top-0 z-10 border-b ${theme === 'dark' ? 'border-border bg-card shadow-sm' : 'border-gray-200 bg-gray-50 shadow-sm'}`}>
                  <tr>
                    <th className={`py-3 px-2 md:px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Applicant</th>
                    <th className={`py-3 px-2 md:px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Category / Title</th>
                    <th className={`py-3 px-4 md:px-6 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period & Time</th>
                    <th className={`py-3 px-2 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attachments</th>
                    <th className={`py-3 px-2 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                    <th className={`py-3 px-2 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                    <th className={`py-3 px-2 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground">Loading leave requests...</p>
                        </div>
                      </td>
                    </tr>
                  ) : leaves.length > 0 ? (
                    leaves.map((leave) => (
                      <tr
                        key={leave.id}
                        className={`transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-4 px-2 md:px-4 text-left">
                          <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.developer_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              DEVELOPER
                            </span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{leave.developer_email}</span>
                          </div>
                        </td>

                        <td className="py-4 px-2 md:px-4 text-left">
                          <div className={`font-medium text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.title || "Leave Application"}</div>
                          {renderLeaveCategoryBadge(leave.leave_type, leave.is_half_day, leave.half_day_session)}
                          {leave.substitute_developer_name && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                              <span>Standby: <span className="font-semibold text-foreground">{leave.substitute_developer_name}</span></span>
                              {leave.substitute_status === 'ACCEPTED' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  ✓ Accepted
                                </span>
                              )}
                              {leave.substitute_status === 'DECLINED' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                                  ✕ Declined
                                </span>
                              )}
                              {leave.substitute_status === 'PENDING' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                  ⏳ Awaiting Standby
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className={`py-4 px-2 md:px-4 text-sm text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          <div>
                            {formatDateString(leave.start_date)}
                            {leave.start_date !== leave.end_date && (
                              <>
                                {' '}<span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span>{' '}
                                {formatDateString(leave.end_date)}
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            ({leave.days_count} {leave.days_count === 1 ? 'day' : 'days'})
                          </div>
                          {leave.start_time && leave.end_time && (
                            <div className="text-xs font-semibold text-primary mt-0.5">
                              {leave.start_time} - {leave.end_time}
                            </div>
                          )}
                        </td>

                        {/* Attachments Column */}
                        <td className="py-4 px-2 md:px-4 text-sm text-center">
                          {leave.document_url ? (
                            <div className="flex flex-col items-center justify-center">
                              <a
                                href={leave.document_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors shrink-0 whitespace-nowrap"
                                title="View Attached Document Proof"
                              >
                                <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                <span>Attachment</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">—</span>
                          )}
                        </td>

                        {/* Reason Column */}
                        <td className="py-4 px-2 md:px-4 text-sm text-center">
                          <button
                            onClick={() => setSelectedLeaveForReason(leave)}
                            className={`text-sm font-medium px-2.5 py-1 rounded-md transition border ${
                              theme === 'dark'
                                ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                            }`}
                          >
                            View
                          </button>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-2 md:px-4 text-center">
                          {getStatusBadge(leave.status, theme)}
                        </td>

                        {/* Action Column */}
                        <td className="py-4 px-2 md:px-4 text-center">
                          {leave.status === 'PENDING' ? (
                            <div className="flex flex-col md:flex-row justify-center gap-2">
                              <Button
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                  theme === 'dark'
                                    ? 'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20'
                                    : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                                }`}
                                onClick={() => handleApprove(leave)}
                                disabled={loading}
                              >
                                <CheckCircle size={16} /> Approve
                              </Button>

                              <Button
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                  theme === 'dark'
                                    ? 'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20'
                                    : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                                }`}
                                onClick={() => handleReject(leave)}
                                disabled={loading}
                              >
                                <XCircle size={16} /> Reject
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                {leave.status === 'APPROVED'
                                  ? `Approved on ${formatDateString(leave.reviewed_at?.slice(0, 10) || '')}`
                                  : leave.status === 'REJECTED'
                                  ? `Rejected on ${formatDateString(leave.reviewed_at?.slice(0, 10) || '')}`
                                  : 'No action needed'}
                              </span>
                              {leave.admin_remarks && (
                                <span className="text-[11px] text-muted-foreground italic max-w-[140px] truncate" title={leave.admin_remarks}>
                                  "{leave.admin_remarks}"
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-20 px-4">
                        <div className="flex flex-col items-center justify-center">
                          <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                            <CalendarIcon className="w-10 h-10 text-primary opacity-50" />
                          </div>
                          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No leave requests</h3>
                          <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            There are currently no leave requests available for the selected filter.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>

        {/* Pagination Matching HODLeavesManagement */}
        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {currentPage}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* View Reason Dialog matching HODLeavesManagement */}
      <Dialog open={!!selectedLeaveForReason} onOpenChange={() => setSelectedLeaveForReason(null)}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Reason</DialogTitle>
          </DialogHeader>

          {selectedLeaveForReason && (
            <div className="space-y-4">
              <div className={`p-3 rounded-lg border text-xs space-y-1 ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50 border-gray-200'}`}>
                <div><strong>Developer:</strong> {selectedLeaveForReason.developer_name} ({selectedLeaveForReason.developer_email})</div>
                <div><strong>Period:</strong> {formatDateString(selectedLeaveForReason.start_date)} to {formatDateString(selectedLeaveForReason.end_date)} ({selectedLeaveForReason.days_count} days)</div>
                {selectedLeaveForReason.substitute_developer_name && (
                  <div>
                    <strong>Standby Colleague:</strong> {selectedLeaveForReason.substitute_developer_name}
                    {selectedLeaveForReason.substitute_status === 'ACCEPTED' && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        ✓ Accepted
                      </span>
                    )}
                    {selectedLeaveForReason.substitute_status === 'DECLINED' && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                        ✕ Declined
                      </span>
                    )}
                    {selectedLeaveForReason.substitute_status === 'PENDING' && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        ⏳ Awaiting Standby
                      </span>
                    )}
                    {selectedLeaveForReason.substitute_remarks && (
                      <div className="text-muted-foreground mt-0.5 pl-2 border-l-2 border-border text-[11px]">
                        Standby notes: {selectedLeaveForReason.substitute_remarks}
                      </div>
                    )}
                  </div>
                )}
                {selectedLeaveForReason.admin_remarks && (
                  <div className="text-amber-600 dark:text-amber-400 mt-2"><strong>Admin Remarks:</strong> {selectedLeaveForReason.admin_remarks}</div>
                )}
              </div>

              <div className={`p-3 text-sm leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto rounded-md border ${theme === 'dark' ? 'text-foreground bg-muted/10 border-border' : 'text-gray-900 bg-white border-gray-200'}`}>
                {selectedLeaveForReason.reason}
              </div>

              {selectedLeaveForReason.document_url && (
                <div className="pt-2">
                  <a
                    href={selectedLeaveForReason.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View uploaded supporting document proof</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              className={theme === 'dark' ?
                'text-foreground bg-card border border-border bg-primary hover:text-white hover:bg-primary/80' :
                'border border-gray-300 hover:bg-gray-50 bg-primary text-white hover:bg-primary/80 hover:text-white'}
              onClick={() => setSelectedLeaveForReason(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeveloperLeaveApprovals;
