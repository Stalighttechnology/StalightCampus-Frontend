import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Filter, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Swal from 'sweetalert2';
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable, SkeletonCard } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/useOptimizations";
import { getHodStudentLeaves, manageHodStudentLeave, HodStudentLeave } from "@/utils/hod_api";

const PAGE_SIZE = 20;

interface DepartmentStudentLeavesProps {
  onPendingCountChange?: (count: number) => void;
}

export const DepartmentStudentLeaves = ({ onPendingCountChange }: DepartmentStudentLeavesProps) => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);

  const statusOptions = ["All", "FORWARDED_TO_HOD", "APPROVED", "REJECTED"];
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [page, setPage] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewDetailsLeave, setViewDetailsLeave] = useState<HodStudentLeave | null>(null);
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

  const queryKey = ['hodStudentLeaves', page, debouncedSearch, filterStatus];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getHodStudentLeaves({
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: filterStatus !== 'All' ? filterStatus : undefined,
    }),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (data?.pending_count !== undefined && onPendingCountChange) {
      onPendingCountChange(data.pending_count);
    }
  }, [data?.pending_count, onPendingCountChange]);

  const leaves: HodStudentLeave[] = data?.data ?? [];
  const paginationRaw = data?.pagination;
  const pagination = paginationRaw ? {
    page: paginationRaw.page,
    pageSize: paginationRaw.page_size,
    totalPages: paginationRaw.total_pages,
    totalItems: paginationRaw.total_count,
  } : undefined;

  const formatPeriod = (startDate: string | null, endDate: string | null): string => {
    if (!startDate || !endDate) return "N/A";
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FORWARDED_TO_HOD":
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === 'dark' ? 'bg-purple-900/60 text-purple-200 border border-purple-700/50' : 'bg-purple-100 text-purple-800 border border-purple-200'}`}>Pending HoD Review</span>;
      case "APPROVED":
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>Approved</span>;
      case "REJECTED":
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>Rejected</span>;
      default:
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>{status}</span>;
    }
  };

  const handleApprove = async (leaveId: string) => {
    const result = await Swal.fire({
      title: 'Approve Student Leave?',
      text: 'Are you sure you want to grant final HoD approval for this student leave request?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Approve',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#6b7280',
    });

    if (!result.isConfirmed) return;

    setActionLoading(leaveId + "APPROVE");
    try {
      const res = await manageHodStudentLeave({ leave_id: leaveId, action: "APPROVE" });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['hodStudentLeaves'] });
        window.dispatchEvent(new CustomEvent('leaves-updated'));
        Swal.fire({ title: 'Approved!', text: 'Student leave request has received final HoD approval.', icon: 'success', confirmButtonColor: '#22c55e' });
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
      const res = await manageHodStudentLeave({ leave_id: leaveId, action: "REJECT", rejection_reason: reason });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['hodStudentLeaves'] });
        setShowRejectModal(null);
        window.dispatchEvent(new CustomEvent('leaves-updated'));
        Swal.fire({ title: 'Rejected!', text: 'Student leave request rejected.', icon: 'info', confirmButtonColor: '#ef4444' });
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
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-row items-center gap-2 mb-4 w-full">
        <Input
          placeholder="Search student name or USN..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={`flex-1 text-sm ${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
        />

        <div className="relative shrink-0" ref={filterRef}>
          <Button
            onClick={() => setShowFilter(!showFilter)}
            className="h-10 text-sm font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 bg-primary text-white hover:bg-primary/90 px-3 sm:px-4"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">
              {filterStatus === "All" ? "All Status" : filterStatus === "FORWARDED_TO_HOD" ? "Pending Review" : filterStatus}
            </span>
          </Button>

          {showFilter && (
            <div className={`absolute right-0 mt-2 w-52 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-xl shadow-lg z-30 overflow-hidden`}>
              <div className="py-1">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`block w-full text-left px-4 py-2.5 text-sm hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-100'} ${filterStatus === status ? (theme === 'dark' ? 'bg-accent text-accent-foreground font-semibold' : 'bg-gray-100 text-gray-900 font-semibold') : (theme === 'dark' ? 'text-foreground' : 'text-gray-700')}`}
                    onClick={() => {
                      handleFilterChange(status);
                      setShowFilter(false);
                    }}
                  >
                    {status === "All" ? "All Status" : status === "FORWARDED_TO_HOD" ? "Pending HoD Review" : status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="md:hidden">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} className="h-[200px]" />
            ))}
          </div>
          <div className="hidden md:block">
            <SkeletonTable rows={8} cols={6} />
          </div>
        </div>
      ) : leaves.length === 0 ? (
        <div className={`border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-2xl ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
            <GraduationCap className="w-10 h-10" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {search ? 'No Matches Found' : 'No Student Leaves Awaiting Review'}
            </h3>
            <p className={`text-sm mt-1 leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              {search
                ? `No student leave requests match "${search}".`
                : 'There are currently no student leave requests forwarded by proctors in your department.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Stacked Cards View */}
          <div className="md:hidden space-y-3">
            {leaves.map((leave) => (
              <div key={leave.id} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-semibold text-base">{leave.student_name}</div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {leave.usn} {leave.semester && `• Sem ${leave.semester}`} {leave.section && `• Sec ${leave.section}`}
                    </div>
                    {leave.proctor_name && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                        Proctor: {leave.proctor_name}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(leave.status)}
                  </div>
                </div>

                <div className={`text-sm my-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {formatPeriod(leave.start_date, leave.end_date)}
                </div>

                {leave.proctor_remarks && (
                  <div className={`p-2.5 rounded-xl text-xs mb-3 border ${theme === 'dark' ? 'bg-purple-950/20 border-purple-800/40 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'}`}>
                    <span className="font-semibold block mb-0.5">Proctor Note:</span>
                    {leave.proctor_remarks}
                  </div>
                )}

                <Button
                  onClick={() => setViewDetailsLeave(leave)}
                  className={`w-full mb-3 h-10 rounded-xl font-medium transition-all duration-200 ${theme === 'dark'
                    ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                    : 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:text-primary'
                    }`}
                  variant="outline"
                >
                  View Full Details
                </Button>

                {leave.status === "FORWARDED_TO_HOD" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className={`flex items-center justify-center gap-1.5 h-10 rounded-xl font-medium ${theme === 'dark'
                        ? 'bg-green-950/20 text-green-400 border-green-500/30 hover:bg-green-950/40'
                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        }`}
                      onClick={() => handleApprove(leave.id)}
                      disabled={!!actionLoading}
                    >
                      <CheckCircle size={16} /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      className={`flex items-center justify-center gap-1.5 h-10 rounded-xl font-medium ${theme === 'dark'
                        ? 'bg-red-950/20 text-red-400 border-red-500/30 hover:bg-red-950/40'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
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
                    {leave.hod_reviewed_by && (
                      <span className="text-xs text-muted-foreground font-medium">by HoD ({leave.hod_reviewed_by})</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className={`hidden md:block overflow-x-auto border rounded-xl ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
            <table className="w-full text-sm">
              <thead className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-gray-50 text-gray-900'}`}>
                <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                  <th className="px-4 py-3 text-left font-semibold">Student</th>
                  <th className="px-4 py-3 text-left font-semibold">Period</th>
                  <th className="px-4 py-3 text-left font-semibold">Proctor & Remarks</th>
                  <th className="px-4 py-3 text-left font-semibold">Reason</th>
                  <th className="px-4 py-3 text-left font-semibold text-center">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-100'}`}>
                {leaves.map((leave) => (
                  <tr key={leave.id} className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{leave.student_name}</div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        {leave.usn} {leave.semester && `• Sem ${leave.semester}`} {leave.section && `• Sec ${leave.section}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {formatPeriod(leave.start_date, leave.end_date)}
                      </div>
                      {leave.submitted_at && (
                        <div className="text-xs text-muted-foreground mt-0.5">Applied: {leave.submitted_at}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {leave.proctor_name || 'Assigned Proctor'}
                      </div>
                      {leave.proctor_remarks ? (
                        <div className="text-xs text-muted-foreground truncate" title={leave.proctor_remarks}>
                          "{leave.proctor_remarks}"
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">No proctor notes</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        onClick={() => setViewDetailsLeave(leave)}
                        className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${theme === 'dark'
                          ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                          : 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:text-primary'
                          }`}
                        variant="outline"
                      >
                        View Details
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(leave.status)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {leave.status === "FORWARDED_TO_HOD" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleApprove(leave.id)}
                            size="sm"
                            variant="outline"
                            className={`px-3 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                              ? 'bg-green-950/20 text-green-400 border-green-500/30 hover:bg-green-950/40'
                              : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              }`}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === leave.id + "APPROVE" ? "..." : <CheckCircle size={15} />}
                            <span className="ml-1">Approve (Final)</span>
                          </Button>
                          <Button
                            onClick={() => setShowRejectModal(leave.id)}
                            size="sm"
                            variant="outline"
                            className={`px-3 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                              ? 'bg-red-950/20 text-red-400 border-red-500/30 hover:bg-red-950/40'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              }`}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === leave.id + "REJECT" ? "..." : <XCircle size={15} />}
                            <span className="ml-1">Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs text-muted-foreground italic">Processed</span>
                          {leave.hod_reviewed_by && (
                            <span className="text-xs text-muted-foreground">by HoD ({leave.hod_reviewed_by})</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-4 py-3 border-t border-border mt-4">
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
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewDetailsLeave} onOpenChange={() => setViewDetailsLeave(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[90%] sm:max-w-lg mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Student Leave Request Details</DialogTitle>
          </DialogHeader>

          {viewDetailsLeave && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2 text-sm p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <span className="text-xs text-muted-foreground block">Student:</span>
                  <span className="font-semibold">{viewDetailsLeave.student_name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">USN:</span>
                  <span className="font-medium">{viewDetailsLeave.usn}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Semester & Section:</span>
                  <span className="font-medium">
                    {viewDetailsLeave.semester ? `Sem ${viewDetailsLeave.semester}` : 'N/A'} {viewDetailsLeave.section ? `(${viewDetailsLeave.section})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Proctor:</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">{viewDetailsLeave.proctor_name || 'N/A'}</span>
                </div>
                <div className="col-span-2 mt-1">
                  <span className="text-xs text-muted-foreground block">Leave Period:</span>
                  <span className="font-medium">{formatPeriod(viewDetailsLeave.start_date, viewDetailsLeave.end_date)}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Student Leave Reason:</span>
                <div className={`p-3 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-xl border ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                  {viewDetailsLeave.reason}
                </div>
              </div>

              {viewDetailsLeave.proctor_remarks && (
                <div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">Proctor Recommendation / Note:</span>
                  <div className={`p-3 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-xl border ${theme === 'dark' ? 'bg-purple-950/20 border-purple-800/40 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'}`}>
                    {viewDetailsLeave.proctor_remarks}
                  </div>
                </div>
              )}

              {viewDetailsLeave.hod_remarks && (
                <div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">HoD Final Remarks:</span>
                  <div className={`p-3 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-xl border ${theme === 'dark' ? 'bg-blue-950/20 border-blue-800/40 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                    {viewDetailsLeave.hod_remarks}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              className="bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-200 px-6"
              onClick={() => setViewDetailsLeave(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectModal} onOpenChange={() => setShowRejectModal(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} w-[90%] max-w-[90%] sm:max-w-lg mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle>Reject Student Leave Request</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium">Rejection Reason (Optional)</label>
            <textarea
              id="hod-rejection-reason"
              className={`w-full p-3 border rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20 ${theme === 'dark' ? 'bg-background border-border text-foreground focus:border-primary' : 'bg-white border-gray-200 text-gray-900 focus:border-primary'
                }`}
              placeholder="Provide a reason for rejection..."
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRejectModal(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const reason = (document.getElementById('hod-rejection-reason') as HTMLTextAreaElement)?.value || '';
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
