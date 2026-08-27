import { useState, useEffect, useRef } from "react";
import { manageStudentLeave, getProctorStudentLeaves, ProctorStudentLeave } from "@/utils/faculty_api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CheckCircle, XCircle, CalendarCheck2, Filter, Send } from "lucide-react";
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

  const statusOptions = ["All", "PENDING", "FORWARDED_TO_HOD", "APPROVED", "REJECTED"];
  const [filterStatus, setFilterStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewDetailsLeave, setViewDetailsLeave] = useState<ProctorStudentLeave | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inDesktop = filterRef.current && filterRef.current.contains(target);
      const inMobile = mobileFilterRef.current && mobileFilterRef.current.contains(target);
      if (!inDesktop && !inMobile) {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>Pending</span>;
      case "FORWARDED_TO_HOD":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-purple-900/60 text-purple-200 border border-purple-700/50' : 'bg-purple-100 text-purple-800 border border-purple-200'}`}>Forwarded to HoD</span>;
      case "APPROVED":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>Approved</span>;
      case "REJECTED":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>Rejected</span>;
      default:
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>{status}</span>;
    }
  };

  const handleApprove = async (leaveId: string) => {
    const result = await Swal.fire({
      title: 'Approve Student Leave?',
      text: 'Are you sure you want to approve this student leave request?',
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
      const res = await manageStudentLeave({ leave_id: leaveId, action: "APPROVE" });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['proctorStudentLeaves'] });
        window.dispatchEvent(new CustomEvent('leaves-updated'));
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

  const handleForward = async (leaveId: string, remarks: string) => {
    setActionLoading(leaveId + "FORWARD");
    try {
      const res = await manageStudentLeave({ leave_id: leaveId, action: "FORWARD", remarks });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['proctorStudentLeaves'] });
        setShowForwardModal(null);
        window.dispatchEvent(new CustomEvent('leaves-updated'));
        Swal.fire({ title: 'Forwarded!', text: 'Leave request forwarded to HoD for final review.', icon: 'success', confirmButtonColor: '#8b5cf6' });
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
        window.dispatchEvent(new CustomEvent('leaves-updated'));
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
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
            <div className="flex flex-col gap-0.5 w-full">
              <div className="flex items-start justify-between gap-4 w-full">
                <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Approvals</CardTitle>

                {/* Search + Filter container (Laptop/Desktop only) */}
                <div className="hidden lg:flex items-start gap-3 shrink-0">
                  <div className="w-64">
                    <Input
                      placeholder="Search student..."
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className={`text-sm h-10 ${theme === 'dark' ? 'bg-background border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
                    />
                  </div>

                  {/* Filter Button */}
                  <div className="relative" ref={filterRef}>
                    <Button
                      onClick={() => setShowFilter(!showFilter)}
                      className="bg-primary hover:bg-[#9147e0] text-white flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg font-medium shadow-sm transition-colors text-sm whitespace-nowrap"
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filter</span>
                    </Button>
                    {showFilter && (
                      <div className={`absolute right-0 mt-2 w-48 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-xl shadow-lg z-20 overflow-hidden`}>
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
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Review and approve leave requests <br className="block sm:hidden" /> submitted by your students
              </p>
            </div>
          </CardHeader>
          {/* Search + Filter Bar (Mobile/Tablet only: lg:hidden) */}
          <div className="p-4 sm:p-6 pb-4 lg:hidden">
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1">
                <Input
                  placeholder="Search student..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className={`w-full text-sm h-10 ${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
                />
              </div>
              <div className="relative" ref={mobileFilterRef}>
                <Button
                  onClick={() => setShowFilter(!showFilter)}
                  className="bg-primary hover:bg-[#9147e0] text-white flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg font-medium shadow-sm transition-colors text-xs whitespace-nowrap"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </Button>
                {showFilter && (
                  <div className={`absolute right-0 mt-2 w-48 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-xl shadow-lg z-20 overflow-hidden`}>
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
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-4 sm:p-6 pt-0 lg:pt-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="md:hidden">
                {[...Array(3)].map((_, i) => (
                  <SkeletonCard key={i} className="h-[200px]" />
                ))}
              </div>
              <div className="hidden md:block">
                <SkeletonTable rows={10} cols={5} />
              </div>
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
            <>
              {/* Mobile: Stacked Cards View */}
              <div className="md:hidden space-y-3">
                {leaves.map((leave) => (
                  <div key={leave.id} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-semibold text-base">{leave.student_name}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{leave.usn}</div>
                        {leave.submitted_at && (
                          <div className={`text-[10px] mt-0.5 italic ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>
                            Applied: {leave.submitted_at}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(leave.status)}
                      </div>
                    </div>

                    <div className={`text-sm my-3 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {formatPeriod(leave.start_date, leave.end_date)}
                    </div>

                    <Button
                      onClick={() => setViewDetailsLeave(leave)}
                      className={`w-full mb-3 h-10 rounded-xl font-medium transition-all duration-200 ${theme === 'dark'
                        ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                        : 'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 hover:text-primary'
                        }`}
                      variant="outline"
                    >
                      View Details
                    </Button>

                    {leave.status === "PENDING" ? (
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          className={`flex items-center justify-center gap-1 h-10 rounded-xl font-medium text-xs ${theme === 'dark'
                            ? 'bg-green-950/20 text-green-400 border-green-500/30 hover:bg-green-950/40'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                          onClick={() => handleApprove(leave.id)}
                          disabled={!!actionLoading}
                        >
                          <CheckCircle size={14} /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          className={`flex items-center justify-center gap-1 h-10 rounded-xl font-medium text-xs ${theme === 'dark'
                            ? 'bg-purple-950/20 text-purple-400 border-purple-500/30 hover:bg-purple-950/40'
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            }`}
                          onClick={() => setShowForwardModal(leave.id)}
                          disabled={!!actionLoading}
                        >
                          <Send size={14} /> Forward
                        </Button>
                        <Button
                          variant="outline"
                          className={`flex items-center justify-center gap-1 h-10 rounded-xl font-medium text-xs ${theme === 'dark'
                            ? 'bg-red-950/20 text-red-400 border-red-500/30 hover:bg-red-950/40'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                          onClick={() => setShowRejectModal(leave.id)}
                          disabled={!!actionLoading}
                        >
                          <XCircle size={14} /> Reject
                        </Button>
                      </div>
                    ) : leave.status === "FORWARDED_TO_HOD" ? (
                      <div className="flex flex-col items-start gap-1 pt-2 border-t mt-2">
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Forwarded to HoD (Pending HoD Approval)</span>
                        {leave.forwarded_at && (
                          <span className="text-[11px] text-muted-foreground">at {leave.forwarded_at}</span>
                        )}
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
                ))}
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
                    {leaves.map((leave) => (
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
                        <td className="px-4 py-3 text-right">
                          {leave.status === "PENDING" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleApprove(leave.id)}
                                size="sm"
                                variant="outline"
                                className={`px-2.5 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                                  ? 'bg-green-950/20 text-green-400 border-green-500/30 hover:bg-green-950/40'
                                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                  }`}
                                disabled={!!actionLoading}
                              >
                                {actionLoading === leave.id + "APPROVE" ? "..." : <CheckCircle size={15} />}
                                <span className="ml-1 hidden sm:inline">Approve</span>
                              </Button>
                              <Button
                                onClick={() => setShowForwardModal(leave.id)}
                                size="sm"
                                variant="outline"
                                className={`px-2.5 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                                  ? 'bg-purple-950/20 text-purple-400 border-purple-500/30 hover:bg-purple-950/40'
                                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                  }`}
                                disabled={!!actionLoading}
                              >
                                {actionLoading === leave.id + "FORWARD" ? "..." : <Send size={14} />}
                                <span className="ml-1 hidden sm:inline">Forward to HoD</span>
                              </Button>
                              <Button
                                onClick={() => setShowRejectModal(leave.id)}
                                size="sm"
                                variant="outline"
                                className={`px-2.5 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                                  ? 'bg-red-950/20 text-red-400 border-red-500/30 hover:bg-red-950/40'
                                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  }`}
                                disabled={!!actionLoading}
                              >
                                {actionLoading === leave.id + "REJECT" ? "..." : <XCircle size={15} />}
                                <span className="ml-1 hidden sm:inline">Reject</span>
                              </Button>
                            </div>
                          ) : leave.status === "FORWARDED_TO_HOD" ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Forwarded to HoD</span>
                              <span className="text-[11px] text-muted-foreground italic">Pending HoD Review</span>
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
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
        {pagination && pagination.totalPages > 1 && (
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

      {/* View Reason / Details Dialog */}
      <Dialog open={!!viewDetailsLeave} onOpenChange={() => setViewDetailsLeave(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[90%] sm:max-w-lg mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Request Details</DialogTitle>
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
                <div className="col-span-2 mt-1">
                  <span className="text-xs text-muted-foreground block">Period:</span>
                  <span className="font-medium">{formatPeriod(viewDetailsLeave.start_date, viewDetailsLeave.end_date)}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Student Reason:</span>
                <div className={`p-3 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-xl border ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                  {viewDetailsLeave.reason}
                </div>
              </div>

              {viewDetailsLeave.proctor_remarks && (
                <div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">Proctor Remarks / Note:</span>
                  <div className={`p-3 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-xl border ${theme === 'dark' ? 'bg-purple-950/20 border-purple-800/40 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'}`}>
                    {viewDetailsLeave.proctor_remarks}
                  </div>
                </div>
              )}

              {viewDetailsLeave.hod_remarks && (
                <div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">HoD Review Remarks:</span>
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

      {/* Forward to HoD Dialog */}
      <Dialog open={!!showForwardModal} onOpenChange={() => setShowForwardModal(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} w-[90%] max-w-[90%] sm:max-w-lg mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Forward to Department HoD
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Forward this student leave application to your department HoD for final decision and sanction.
            </p>
            <label className="text-sm font-medium block">Proctor Recommendation / Note (Optional)</label>
            <textarea
              id="forward-remarks"
              className={`w-full p-3 border rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-purple-500/20 ${theme === 'dark' ? 'bg-background border-border text-foreground focus:border-purple-500' : 'bg-white border-gray-200 text-gray-900 focus:border-purple-500'
                }`}
              placeholder="e.g., Medical certificate verified; requires HoD approval for absence during tests..."
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowForwardModal(null)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                const remarks = (document.getElementById('forward-remarks') as HTMLTextAreaElement)?.value || '';
                if (showForwardModal) handleForward(showForwardModal, remarks);
              }}
            >
              Forward to HoD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectModal} onOpenChange={() => setShowRejectModal(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} w-[90%] max-w-[90%] sm:max-w-lg mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium">Rejection Reason (Optional)</label>
            <textarea
              id="rejection-reason"
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
                const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement)?.value || '';
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