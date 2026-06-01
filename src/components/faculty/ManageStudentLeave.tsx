import { useState, useEffect, useRef } from "react";
import { manageStudentLeave, getProctorStudentLeaves, ProctorStudentLeave } from "@/utils/faculty_api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CheckCircle, XCircle, CalendarCheck2, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import Swal from 'sweetalert2';
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable, SkeletonCard } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/useOptimizations";

const PAGE_SIZE = 20;

const ManageStudentLeave = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);

  const statusOptions = ["All", "PENDING", "APPROVED", "REJECTED"];
  const [filterStatus, setFilterStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    };

    if (showFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilter]);

  // Format date range to "MMM DD, YYYY to MMM DD, YYYY"
  const formatPeriod = (startDate: string, endDate: string): string => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const options: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit", year: "numeric" };
      const startStr = start.toLocaleDateString("en-US", options);
      const endStr = end.toLocaleDateString("en-US", options);
      return `${startStr} to ${endStr}`;
    } catch {
      return "Invalid date";
    }
  };

  const queryKey = ['proctorStudentLeaves', page, debouncedSearch, filterStatus];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getProctorStudentLeaves({
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: filterStatus !== 'All' ? filterStatus : undefined,
    }),
    staleTime: 15_000,
  });

  const leaves: ProctorStudentLeave[] = data?.data ?? [];
  const paginationRaw = data?.pagination;
  const pagination = paginationRaw ? {
    page: paginationRaw.page,
    pageSize: paginationRaw.page_size,
    totalPages: paginationRaw.total_pages,
    totalItems: paginationRaw.total_count,
  } : undefined;

  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>Pending</span>;
      case "APPROVED":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>Approved</span>;
      case "REJECTED":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>Rejected</span>;
      default:
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>Unknown</span>;
    }
  };

  const handleApprove = async (leaveId: string) => {
    setActionLoading(leaveId + "APPROVE");
    try {
      const res = await manageStudentLeave({ leave_id: leaveId, action: "APPROVE" });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['proctorStudentLeaves'] });
        Swal.fire({ title: 'Approved!', text: 'Leave request approved successfully.', icon: 'success', confirmButtonColor: '#22c55e' });
      } else {
        throw new Error(res.message || "Action failed");
      }
    } catch (e: unknown) {
      Swal.fire({ title: 'Error!', text: e instanceof Error ? e.message : "An unexpected error occurred.", icon: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (leaveId: string, reason: string) => {
    setActionLoading(leaveId + "REJECT");
    try {
      const res = await manageStudentLeave({ leave_id: leaveId, action: "REJECT", rejection_reason: reason });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['proctorStudentLeaves'] });
        setShowRejectModal(null);
        Swal.fire({ title: 'Rejected!', text: 'Leave request rejected.', icon: 'info', confirmButtonColor: '#ef4444' });
      } else {
        throw new Error(res.message || "Action failed");
      }
    } catch (e: unknown) {
      Swal.fire({ title: 'Error!', text: e instanceof Error ? e.message : "An unexpected error occurred.", icon: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card id="manage-student-leave-card" className={`${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div id="manage-student-leave-header-section">
          <CardHeader className="border-b">
            <CardTitle>Leave Approvals</CardTitle>
          </CardHeader>
          <div className="p-4 sm:p-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                placeholder="Search student..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`flex-1 w-full text-sm ${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
              />
              <div className="relative w-full sm:w-auto" ref={filterRef}>
                <Button
                  onClick={() => setShowFilter(!showFilter)}
                  className="bg-primary hover:bg-[#9147e0] text-white flex items-center justify-center gap-2 h-10 px-4 rounded-xl font-medium shadow-sm transition-colors w-full sm:w-auto"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
                {showFilter && (
                  <div className={`absolute right-0 mt-2 w-48 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-xl shadow-lg z-10 overflow-hidden`}>
                    <div className="py-1">
                      {statusOptions.map((status) => (
                        <button
                          key={status}
                          className={`block w-full text-left px-4 py-2 text-sm hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-100'} ${filterStatus === status ? theme === 'dark' ? 'bg-accent text-accent-foreground' : 'bg-gray-100 text-gray-900 font-semibold' : theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}
                          onClick={() => {
                            handleFilterChange(status);
                            setShowFilter(false);
                          }}
                        >
                          {status === 'All' ? 'All Status' : status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-4 sm:p-6 pt-0">
          {/* Mobile: Stacked Cards View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <SkeletonCard key={i} className="h-[200px]" />
                ))}
              </div>
            ) : leaves.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <CalendarCheck2 className="w-10 h-10" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {search ? 'No Matches Found' : 'No Leave Requests'}
                </h3>
                <p className={`text-sm max-w-[280px] mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {search
                    ? `We couldn't find any leave requests matching "${search}". Please try a different search term.`
                    : "There are no active leave requests currently pending your review."}
                </p>
              </div>
            ) : (
              leaves.map((leave) => (
                <div key={leave.id} className={`p-4 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-medium">{leave.student_name}</div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{leave.usn}</div>
                      <div className={`text-sm mt-2 font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {formatPeriod(leave.start_date, leave.end_date)}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(leave.status)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-muted-foreground">
                      Applied: {leave.submitted_at || '—'}
                    </div>
                    <button
                      onClick={() => setViewReason(leave.reason)}
                      className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${theme === 'dark'
                          ? 'bg-muted/10 text-foreground border border-border hover:bg-muted/20'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      View Reason
                    </button>
                  </div>

                  {leave.status === "PENDING" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className={`text-xs flex items-center justify-center gap-1 ${theme === 'dark'
                            ? 'text-green-400 border-green-400 hover:bg-green-900/20'
                            : 'text-green-700 border-green-600 hover:bg-green-100'
                          }`}
                        onClick={() => handleApprove(leave.id)}
                        disabled={!!actionLoading}
                      >
                        <CheckCircle size={16} /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        className={`text-xs flex items-center justify-center gap-1 ${theme === 'dark'
                            ? 'text-red-400 border-red-400 hover:bg-red-900/20'
                            : 'text-red-700 border-red-600 hover:bg-red-100'
                          }`}
                        onClick={() => setShowRejectModal(leave.id)}
                        disabled={!!actionLoading}
                      >
                        <XCircle size={16} /> Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                      <span className="text-xs text-muted-foreground italic">Processed</span>
                      {leave.reviewed_by && (
                        <span className="text-xs text-muted-foreground font-medium">by {leave.reviewed_by}</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className={`hidden md:block overflow-x-auto border rounded-lg ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
            <table className="w-full text-sm">
              <thead className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-gray-50 text-gray-900'}`}>
                <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                  <th className="px-4 py-3 text-left font-semibold">Student</th>
                  <th className="px-4 py-3 text-left font-semibold">Period</th>
                  <th className="px-4 py-3 text-left font-semibold">Reason</th>
                  <th className="px-4 py-3 text-left font-semibold text-center">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-100'}`}>
                {isLoading ? (
                  <tr><td colSpan={5} className="p-4"><SkeletonTable rows={10} cols={5} /></td></tr>
                ) : leaves.map((leave) => (
                  <tr key={leave.id} className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{leave.student_name}</div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{leave.usn}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {formatPeriod(leave.start_date, leave.end_date)}
                      </div>
                      {leave.submitted_at && (
                        <div className="text-xs text-muted-foreground mt-0.5">Applied: {leave.submitted_at}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewReason(leave.reason)}
                        className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${theme === 'dark'
                            ? 'bg-muted/10 text-foreground border border-border hover:bg-muted/20'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        View
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(leave.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {leave.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleApprove(leave.id)}
                            size="sm"
                            variant="outline"
                            className={`px-3 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                                ? 'text-green-400 border-green-400 hover:bg-green-900/20'
                                : 'text-green-700 border-green-600 hover:bg-green-100'
                              }`}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === leave.id + "APPROVE" ? "..." : <CheckCircle size={16} />}
                            <span className="ml-1 hidden sm:inline">Approve</span>
                          </Button>
                          <Button
                            onClick={() => setShowRejectModal(leave.id)}
                            size="sm"
                            variant="outline"
                            className={`px-3 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                                ? 'text-red-400 border-red-400 hover:bg-red-900/20'
                                : 'text-red-700 border-red-600 hover:bg-red-100'
                              }`}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === leave.id + "REJECT" ? "..." : <XCircle size={16} />}
                            <span className="ml-1 hidden sm:inline">Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs text-muted-foreground italic">Processed</span>
                          {leave.reviewed_by && (
                            <span className="text-xs text-muted-foreground">by {leave.reviewed_by}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && leaves.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16">
                      <div className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                          <CalendarCheck2 className="w-10 h-10" />
                        </div>
                        <h3 className={`text-xl font-semibold mb-2 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {search ? 'No Matches Found' : 'No Leave Requests'}
                        </h3>
                        <p className={`text-sm max-w-[280px] mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {search
                            ? `We couldn't find any leave requests matching "${search}". Please try a different search term.`
                            : "There are no active leave requests currently pending your review."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </CardContent>
        {pagination && pagination.totalItems > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.totalItems)} to {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1 || isLoading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {pagination.page}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* View Reason Dialog */}
      <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[80%] sm:max-w-md mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Reason</DialogTitle>
          </DialogHeader>

          <div
            className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}
          >
            {viewReason}
          </div>

          <DialogFooter>
            <Button
              className="bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-200 shadow-lg shadow-primary/20 px-6"
              onClick={() => setViewReason(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectModal} onOpenChange={() => setShowRejectModal(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} rounded-2xl`}>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium">Rejection Reason (Optional)</label>
            <textarea
              id="rejection-reason"
              className={`w-full p-3 border rounded-lg text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20 ${theme === 'dark' ? 'bg-background border-border text-foreground focus:border-primary' : 'bg-white border-gray-200 text-gray-900 focus:border-primary'
                }`}
              placeholder="Provide a reason for rejection..."
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRejectModal(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement).value;
                if (showRejectModal) handleReject(showRejectModal, reason);
              }}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageStudentLeave;