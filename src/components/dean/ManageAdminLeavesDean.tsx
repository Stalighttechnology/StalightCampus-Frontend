import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "../../context/ThemeContext";
import { CheckCircle, XCircle, Filter as FilterIcon, Loader2, Calendar as CalendarIcon, Check, X, Clock } from 'lucide-react';
import { manageAllLeaves } from "../../utils/dean_api";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { SkeletonTable, SkeletonList, SkeletonPageHeader } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { normalizePaginatedResponse } from "../../utils/normalizePagination";

const MySwal = withReactContent(Swal);

interface UnifiedLeave {
  id: number;
  title?: string;
  faculty_name: string;
  department: string;
  faculty_type: string;
  leave_type?: string;
  start_time?: string | null;
  end_time?: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
}

const ManageAdminLeavesDean = () => {
  const { theme } = useTheme();

  // Pending leaves state
  const [pendingLeaves, setPendingLeaves] = useState<UnifiedLeave[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPagination, setPendingPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [pendingLoading, setPendingLoading] = useState(false);

  // Recent leaves state
  const [recentLeaves, setRecentLeaves] = useState<UnifiedLeave[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentPagination, setRecentPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [recentLoading, setRecentLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<UnifiedLeave | null>(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending' | 'Rejected'>('All');
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  // Fetch pending leaves
  useEffect(() => {
    const fetchPending = async () => {
      setPendingLoading(true);
      try {
        const response = await manageAllLeaves({ status_type: 'PENDING' }, 'GET', pendingPage);
        if (response.success) {
          const normalized = normalizePaginatedResponse(response, 'data');
          setPendingLeaves(normalized.items);
          setPendingPagination({
            currentPage: normalized.meta.currentPage || pendingPage,
            totalPages: normalized.meta.totalPages || 1,
            totalItems: normalized.meta.totalItems || 0
          });
        }
      } catch (err) {
        setError("Failed to fetch pending leaves");
      } finally {
        setPendingLoading(false);
      }
    };
    fetchPending();
  }, [pendingPage]);

  // Fetch recent leaves
  useEffect(() => {
    const fetchRecent = async () => {
      setRecentLoading(true);
      try {
        const response = await manageAllLeaves({ status_type: 'PROCESSED' }, 'GET', recentPage);
        if (response.success) {
          const normalized = normalizePaginatedResponse(response, 'data');
          setRecentLeaves(normalized.items);
          setRecentPagination({
            currentPage: normalized.meta.currentPage || recentPage,
            totalPages: normalized.meta.totalPages || 1,
            totalItems: normalized.meta.totalItems || 0
          });
        }
      } catch (err) {
        setError("Failed to fetch recent history");
      } finally {
        setRecentLoading(false);
      }
    };
    fetchRecent();
  }, [recentPage]);

  const handleAction = async (leaveId: number, action: 'APPROVED' | 'REJECTED') => {
    const isApprove = action === 'APPROVED';
    const actionText = isApprove ? 'Approve' : 'Reject';
    const confirmColor = isApprove ? '#10B981' : '#EF4444';

    const confirmResult = await MySwal.fire({
      title: `${actionText} Leave Request?`,
      text: `Are you sure you want to ${actionText.toLowerCase()} this leave request?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionText}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: confirmColor,
      background: theme === 'dark' ? '#1e293b' : '#ffffff',
      color: theme === 'dark' ? '#f8fafc' : '#0f172a',
    });

    if (!confirmResult.isConfirmed) return;

    setActionLoading(leaveId);
    try {
      const response = await manageAllLeaves(
        { leave_id: leaveId, status: action },
        'PATCH'
      );

      if (response.success && response.updated_leave) {
        // Find the item in pending leaves to move it to recent history
        const movedItem = pendingLeaves.find(l => l.id === leaveId);

        if (movedItem) {
          // Update both lists locally for immediate feedback
          setPendingLeaves(prev => prev.filter(l => l.id !== leaveId));
          setRecentLeaves(prev => [
            { ...movedItem, status: action, reviewed_at: response.updated_leave?.reviewed_at || null } as UnifiedLeave,
            ...prev
          ].slice(0, 20)); // Keep recent list manageable
        }

        MySwal.fire({
          title: 'Success!',
          text: `Leave request has been ${action.toLowerCase()} successfully.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: theme === 'dark' ? '#1e293b' : '#ffffff',
          color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        });
      } else {
        MySwal.fire({
          title: 'Error',
          text: response.message || "Failed to update leave request.",
          icon: 'error',
          background: theme === 'dark' ? '#1e293b' : '#ffffff',
          color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        });
      }
    } catch (err) {
      MySwal.fire({
        title: 'Error',
        text: "Failed to update leave request due to a network or server error.",
        icon: 'error',
        background: theme === 'dark' ? '#1e293b' : '#ffffff',
        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered recent leaves according to statusFilter
  const filteredRecentLeaves: UnifiedLeave[] = recentLeaves.filter(l => {
    if (statusFilter === 'All') return true;
    return l.status === statusFilter.toUpperCase();
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    if (showFilter) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilter]);

  return (
    <div id="dean-admin-leaves-container" className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>

      <div>
        <div className="mb-6">
          <Card className={`flex-1 ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader id="dean-pending-leaves" className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Pending Leave Requests {pendingPagination.totalItems > 0 && `(${pendingPagination.totalItems})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 overflow-x-auto">
              <div className="overflow-x-auto max-w-full custom-scrollbar">
                {/* Mobile: stacked cards */}
                <div className="md:hidden space-y-3">
                  {pendingLoading ? (
                    <div className="space-y-3">
                      <SkeletonList items={3} />
                    </div>
                  ) : pendingLeaves.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-12 px-6 sm:px-8 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                      <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                        <FilterIcon className="w-8 h-8 text-primary opacity-50" />
                      </div>
                      <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        No Pending Leave Requests
                      </h3>
                      <p className={`text-center max-w-sm text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        Everything is up to date! There are currently no leave requests awaiting your approval.
                      </p>
                    </div>
                  ) : (
                    pendingLeaves.map((leave) => (
                      <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-base">{leave.faculty_name}</div>
                            <div className="text-xs text-muted-foreground font-medium flex gap-1">
                              <span>{leave.faculty_type === 'principal' ? 'Administration' : leave.department}</span>
                              <span>•</span>
                              <span>{leave.faculty_type.toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>Pending</span>
                          </div>
                        </div>

                        <div className="mt-3 space-y-3">
                          <div className={`p-2.5 rounded-lg border text-sm flex items-center gap-2 ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50/50 border-gray-100'}`}>
                            <CalendarIcon className="w-4 h-4 text-primary/60" />
                            <span className="font-medium text-foreground">{leave.start_date}</span>
                            <span className="text-muted-foreground">to</span>
                            <span className="font-medium text-foreground">{leave.end_date}</span>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full h-9 font-semibold transition border ${
                              theme === 'dark'
                                ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                            }`}
                            onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}
                          >
                            View Reason
                          </Button>

                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`px-3 py-1 text-xs flex items-center justify-center gap-1 w-full ${theme === 'dark'
                                ? 'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20'
                                : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                                }`}
                              onClick={() => handleAction(leave.id, 'APPROVED')}
                              disabled={actionLoading === leave.id}
                            >
                              {actionLoading === leave.id ? '...' : <><CheckCircle size={16} /> Approve</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`px-3 py-1 text-xs flex items-center justify-center gap-1 w-full ${theme === 'dark'
                                ? 'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20'
                                : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                                }`}
                              onClick={() => handleAction(leave.id, 'REJECTED')}
                              disabled={actionLoading === leave.id}
                            >
                              {actionLoading === leave.id ? '...' : <><XCircle size={16} /> Reject</>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Tablet/Laptop: table */}
                <div className="hidden md:block">
                  {pendingLoading ? (
                    <SkeletonTable rows={5} cols={6} />
                  ) : pendingLeaves.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                      <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                        <FilterIcon className="w-8 h-8 text-primary opacity-50" />
                      </div>
                      <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        No Pending Leave Requests
                      </h3>
                      <p className={`text-center max-w-sm text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        Everything is up to date! There are currently no leave requests awaiting your approval.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                        <tr>
                          <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Applicant</th>
                          <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title</th>
                          <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</th>
                          <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period & Time</th>
                          <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                          <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                          <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingLeaves.map((leave) => (
                          <tr key={leave.id} className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <td className="py-3 px-2 md:px-4 font-medium">
                              <div>{leave.faculty_name}</div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                {leave.faculty_type?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <div className="font-medium text-sm">{leave.title || 'Leave Request'}</div>
                              {leave.leave_type === 'short_permission' ? (
                                <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded ${theme === 'dark' ? 'bg-purple-950/40 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                                  Short Permission
                                </span>
                              ) : (
                                <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded ${theme === 'dark' ? 'bg-blue-950/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                                  Standard Leave
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 md:px-4">{leave.faculty_type === 'principal' ? 'Administration' : leave.department}</td>
                            <td className="py-3 px-2 md:px-4">
                              <div>{leave.start_date} {leave.start_date !== leave.end_date && <><span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span> {leave.end_date}</>}</div>
                              {leave.start_time && leave.end_time && (
                                <div className="text-xs font-semibold text-primary mt-0.5">
                                  {leave.start_time} - {leave.end_time}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className={`text-xs ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}
                              >
                                View
                              </Button>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>Pending</span>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <div className="flex flex-col md:flex-row gap-2">
                                <Button
                                  variant="outline"
                                  className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${theme === 'dark'
                                    ? 'text-green-400 border-green-400 hover:bg-green-900/20'
                                    : 'text-green-700 border-green-600 hover:bg-green-100'
                                    }`}
                                  onClick={() => handleAction(leave.id, 'APPROVED')}
                                  disabled={actionLoading === leave.id}
                                >
                                  {actionLoading === leave.id ? '...' : <><CheckCircle size={16} /> Approve</>}
                                </Button>
                                <Button
                                  variant="outline"
                                  className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${theme === 'dark'
                                    ? 'text-red-400 border-red-400 hover:bg-red-900/20'
                                    : 'text-red-700 border-red-600 hover:bg-red-100'
                                    }`}
                                  onClick={() => handleAction(leave.id, 'REJECTED')}
                                  disabled={actionLoading === leave.id}
                                >
                                  {actionLoading === leave.id ? '...' : <><XCircle size={16} /> Reject</>}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </CardContent>
            {pendingPagination.totalPages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto w-full">
                <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Showing {Math.min((pendingPage - 1) * 20 + 1, pendingPagination.totalItems)} to {Math.min(pendingPage * 20, pendingPagination.totalItems)} of {pendingPagination.totalItems} requests
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingPage === 1 || pendingLoading}
                    onClick={() => setPendingPage(p => p - 1)}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {pendingPage}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingPage === pendingPagination.totalPages || pendingLoading}
                    onClick={() => setPendingPage(p => p + 1)}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
      <div className="flex flex-col">
        {/* Recent Leave History (Past 7 Days) */}
        <Card className={`flex-1 ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader id="dean-recent-leaves">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Recent Leave History
              </CardTitle>
              <div className="relative" ref={filterRef}>
                <Button
                  onClick={() => setShowFilter(v => !v)}
                  className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 px-2.5 sm:px-4 h-9 shadow-sm"
                  aria-label="Filter recent leaves"
                >
                  <FilterIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
                {showFilter && (
                  <div className={`absolute right-0 mt-2 w-36 rounded shadow-lg z-10 border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                    {['All', 'Approved', 'Pending', 'Rejected'].map((status) => (
                      <div
                        key={status}
                        onClick={() => { setStatusFilter(status as any); setShowFilter(false); }}
                        className={`${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'} px-4 py-2 cursor-pointer ${statusFilter === status ? 'font-semibold' : ''}`}
                      >
                        {status}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 overflow-x-auto">
            {recentLoading && recentLeaves.length === 0 ? (
              <div className="space-y-3">
                <SkeletonList items={3} />
              </div>
            ) : filteredRecentLeaves.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-12 px-6 sm:px-8 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                  <CheckCircle className="w-8 h-8 text-primary opacity-50" />
                </div>
                <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  No Recent History Found
                </h3>
                <p className={`text-center max-w-sm text-sm px-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  No processed leave requests match your current filters in the past 7 days.
                </p>
              </div>
            ) : (
            <div className="overflow-x-auto max-w-full custom-scrollbar">
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-3 pl-4">
                {filteredRecentLeaves.map((leave) => (
                    <div
                      key={`${leave.faculty_type}-${leave.id}`}
                      className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>{leave.title || `Leave on ${leave.start_date}`}</h3>
                          <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            {leave.start_date === leave.end_date ? leave.start_date : `${leave.start_date} to ${leave.end_date}`}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            leave.status.toUpperCase() === 'APPROVED' 
                              ? 'text-green-700 bg-green-100 dark:bg-green-950/30 dark:text-green-400' 
                              : leave.status.toUpperCase() === 'REJECTED' 
                                ? 'text-red-700 bg-red-100 dark:bg-red-950/30 dark:text-red-400' 
                                : 'text-yellow-700 bg-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-400'
                          }`}>
                            {leave.status.toUpperCase() === 'APPROVED' && <Check className="w-3.5 h-3.5" />}
                            {leave.status.toUpperCase() === 'REJECTED' && <X className="w-3.5 h-3.5" />}
                            {leave.status.toUpperCase() === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                            {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}
                          variant="outline"
                          size="sm"
                          className={`w-full h-9 font-semibold transition border ${
                            theme === 'dark'
                              ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                              : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                          }`}
                        >
                          View Reason
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

              {/* Tablet/Laptop: table */}
              <div className="hidden md:block">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                    <tr>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reviewed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentLeaves.map((leave) => (
                      <tr key={leave.id} className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className="py-3 px-2 md:px-4 font-medium">{leave.faculty_name}</td>
                        <td className="py-3 px-2 md:px-4">{leave.faculty_type === 'principal' ? 'Administration' : leave.department}</td>
                        <td className="py-3 px-2 md:px-4">{leave.start_date} <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span> {leave.end_date}</td>
                        <td className="py-3 px-2 md:px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-50'}`}
                            onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}
                          >
                            View Reason
                          </Button>
                        </td>
                        <td className="py-3 px-2 md:px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${leave.status === 'APPROVED' ? (theme === 'dark' ? 'bg-green-700 text-green-50' : 'bg-green-100 text-green-700') :
                            leave.status === 'REJECTED' ? (theme === 'dark' ? 'bg-red-700 text-red-50' : 'bg-red-100 text-red-700') :
                              (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700')
                            }`}>{leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}</span>
                        </td>
                        <td className="py-3 px-2 md:px-4 text-sm text-muted-foreground">
                          {new Date(leave.start_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </CardContent>
          {recentPagination.totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto w-full">
              <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Showing {Math.min((recentPage - 1) * 20 + 1, recentPagination.totalItems)} to {Math.min(recentPage * 20, recentPagination.totalItems)} of {recentPagination.totalItems} requests
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recentPage === 1 || recentLoading}
                  onClick={() => setRecentPage(p => p - 1)}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Previous
                </Button>
                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {recentPage}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recentPage === recentPagination.totalPages || recentLoading}
                  onClick={() => setRecentPage(p => p + 1)}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-card-foreground border-border w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border-gray-200 w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>
              Leave Reason
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>
              {selectedLeave && `Reason for: Leave on ${selectedLeave.start_date}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            <p className={`text-sm ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-700'} whitespace-pre-wrap`}>
              {selectedLeave?.reason}
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button 
              className="bg-primary hover:bg-primary/90 text-white hover:text-white" 
              onClick={() => setShowReasonDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageAdminLeavesDean;