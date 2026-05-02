import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle } from "lucide-react";
import { SkeletonTable, SkeletonCard } from "../ui/skeleton";
import Swal from 'sweetalert2';
import { manageLeaves, manageProfile, getFacultyLeavesBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeaveRequest {
  id: string;
  name: string;
  dept: string;
  period: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}

interface FacultyLeaveData {
  id: number;
  faculty_name: string;
  department: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
}

interface ProfileData {
  branch_id: string;
}

interface FacultyLeavesBootstrapResponse {
  profile: ProfileData;
  leaves: FacultyLeaveData[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

const LeaveManagement = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [branchId, setBranchId] = useState("");
  const [viewReason, setViewReason] = useState<string | null>(null);
  const { theme } = useTheme();
  const hasFetchedRef = useRef(false);
  const initialLoadRef = useRef(true);
  const isSilentOperationRef = useRef(false);

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

  // Fetch branch_id from manageProfile
  const fetchBranchId = async () => {
    try {
      const profileRes = await manageProfile({}, "GET");
      if (profileRes.success && profileRes.data?.branch_id) {
        setBranchId(profileRes.data.branch_id);
      } else {
        setErrors(["Failed to fetch branch ID: No branch assigned"]);
      }
    } catch (err) {
      console.error("Error fetching branch ID:", err);
      setErrors(["Failed to connect to backend for branch ID"]);
    }
  };

  // Fetch leave requests
  const fetchLeaveRequests = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const filters = {
        status: filterStatus !== "All" ? 
          (filterStatus === "Pending" ? "PENDING" : 
           filterStatus === "Approved" ? "APPROVED" : 
           filterStatus === "Rejected" ? "REJECTED" : undefined) : undefined,
        search: search || undefined,
        date_from: dateFrom ? `${dateFrom}T00:00:00Z` : undefined,
        date_to: dateTo ? `${dateTo}T23:59:59Z` : undefined,
        page,
        page_size: 50, // Match backend AdminPagination default
      };

      const response = await getFacultyLeavesBootstrap(undefined, filters); // No branch_id needed
      if (!response.results || !response.results.success || !response.results.data) {
        throw new Error(response.results?.message || response.message || "Failed to fetch data");
      }

      const data: FacultyLeavesBootstrapResponse = response.results.data;

      // Set branchId from response
      setBranchId(data.profile.branch_id);

      // Set leave requests
      // Client-side safety filtering according to FINAL RULE:
      const today = new Date();
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const sevenDaysAgo = new Date(todayDateOnly);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const processed = data.leaves
        .map((req: FacultyLeaveData) => ({
          raw: req,
          mapped: {
            id: req.id.toString(),
            name: req.faculty_name || "Unknown",
            dept: req.department || "Unknown",
            period: formatPeriod(req.start_date, req.end_date),
            reason: req.reason || "No reason provided",
            status: req.status === "APPROVED" ? "Approved" : req.status === "REJECTED" ? "Rejected" : "Pending",
          } as LeaveRequest
        }))
        .filter(item => {
          const r = item.raw;
          const status = (r.status || '').toUpperCase();

          if (status === 'PENDING') {
            try {
              const end = new Date(r.end_date);
              const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
              return endDateOnly >= todayDateOnly; // show only active/future pending
            } catch {
              return false;
            }
          }

          if (status === 'APPROVED' || status === 'REJECTED') {
            // Use reviewed_at if available else submitted_at
            const refDateStr = r.reviewed_at || r.submitted_at;
            if (!refDateStr) return false;
            const ref = new Date(refDateStr);
            const refDateOnly = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
            return refDateOnly >= sevenDaysAgo; // only recent approvals/rejections
          }

          return false;
        })
        .map(item => item.mapped) as LeaveRequest[];

      setLeaveRequests(processed);
      setTotalCount(response.count || 0);
      setTotalPages(Math.ceil((response.count || 0) / 50));
      setCurrentPage(page);
      setErrors([]);
      console.log("Processed leave requests:", processed);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
      console.error("Error fetching data:", err);
      setErrors([errorMessage]);
      setLeaveRequests([]);
    } finally {
      setIsLoading(false);
      isSilentOperationRef.current = false;
    }
  };

  // Handle approve
  const handleApprove = async (index: number) => {
    const leave = leaveRequests[index];
    const payload = {
      action: "update" as const,
      branch_id: branchId,
      leave_id: leave.id,
      status: "APPROVED" as const,
    };
    console.log("Approve payload:", payload); // Debug log
    try {
      const res = await manageLeaves(payload, "PATCH");
      if (res.success) {
        // Update local list without re-fetching
        setLeaveRequests(prev => prev.map((item, idx) => item.id === leave.id ? { ...item, status: 'Approved' } : item));
        Swal.fire('Approved!', 'The leave request has been approved.', 'success');
      } else {
        setErrors([res.message || "Failed to approve leave"]);
        Swal.fire('Error!', res.message || 'Failed to approve the leave request.', 'error');
      }
    } catch (err) {
      console.error("Error approving leave:", err);
      setErrors(["Failed to approve leave"]);
      Swal.fire('Error!', 'Failed to approve the leave request.', 'error');
    }
  };

  // Handle reject
  const handleReject = async (index: number) => {
    const leave = leaveRequests[index];
    const payload = {
      action: "update" as const,
      branch_id: branchId,
      leave_id: leave.id,
      status: "REJECTED" as const,
    };
    console.log("Reject payload:", payload); // Debug log
    Swal.fire({
      title: 'Are you sure?',
      text: 'You are about to reject this leave request. Are you sure you want to proceed?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject it!',
      cancelButtonText: 'No, keep it',
      customClass: {
        confirmButton: 'bg-red-600 text-white',
        cancelButton: 'bg-gray-300 text-black'
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await manageLeaves(payload, "PATCH");
          if (res.success) {
            // Update local list without re-fetching
            setLeaveRequests(prev => prev.map((item, idx) => item.id === leave.id ? { ...item, status: 'Rejected' } : item));
            Swal.fire('Rejected!', 'The leave request has been rejected.', 'success');
          } else {
            setErrors([res.message || "Failed to reject leave"]);
            Swal.fire('Error!', res.message || 'Failed to reject the leave request.', 'error');
          }
        } catch (err) {
          console.error("Error rejecting leave:", err);
          setErrors(["Failed to reject leave"]);
          Swal.fire('Error!', 'Failed to reject the leave request.', 'error');
        }
      }
    });
  };

  // Handle search changes - real-time search (only after initial load)
  useEffect(() => {
    if (initialLoadRef.current) return; // Don't search on initial load
    
    isSilentOperationRef.current = true;
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchLeaveRequests(1);
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Combined effect for initial load and filter changes
  useEffect(() => {
    const performFetch = async () => {
      if (initialLoadRef.current) {
        // Handle initial mount
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        await fetchLeaveRequests(1);
        initialLoadRef.current = false;
      } else {
        // Handle subsequent filter changes
        setCurrentPage(1);
        fetchLeaveRequests(1);
      }
    };

    performFetch();
  }, [filterStatus, dateFrom, dateTo]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLeaveRequests(page);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
        <CardHeader className="border-b">
          <CardTitle>Leave Approvals</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-6">
            <Input
              placeholder="Search faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 w-full text-sm ${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
            />
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value as "All" | "Pending" | "Approved" | "Rejected");
              }}
            >
              <SelectTrigger className={`w-full sm:w-auto min-w-[140px] text-sm font-medium ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className={`mb-4 p-3 rounded-md ${theme === 'dark' ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <ul className={`text-sm list-disc list-inside ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mobile: Stacked Cards View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} className="h-[200px]" />
        ))}
      </div>
            ) : leaveRequests.length === 0 ? (
              <div className={`text-center py-6 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                No leave requests found
              </div>
            ) : (
              leaveRequests.map((row, index) => (
                <div key={row.id} className={`p-3 sm:p-4 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-medium">{row.name}</div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{row.dept}</div>
                      <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{row.period}</div>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          row.status === "Pending"
                            ? theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                            : row.status === "Approved"
                            ? theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
                            : theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setViewReason(row.reason)}
                      className={`text-sm font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      View
                    </button>
                  </div>

                  {row.status === "Pending" ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        className={`px-3 py-1 text-xs flex items-center justify-center gap-1 w-full ${
                          theme === 'dark' 
                            ? 'text-green-400 border-green-400 hover:bg-green-900/20' 
                            : 'text-green-700 border-green-600 hover:bg-green-100'
                        }`}
                        onClick={() => handleApprove(index)}
                        disabled={isLoading}
                      >
                        <CheckCircle size={16} /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        className={`px-3 py-1 text-xs flex items-center justify-center gap-1 w-full ${
                          theme === 'dark' 
                            ? 'text-red-400 border-red-400 hover:bg-red-900/20' 
                            : 'text-red-700 border-red-600 hover:bg-red-100'
                        }`}
                        onClick={() => handleReject(index)}
                        disabled={isLoading}
                      >
                        <XCircle size={16} /> Reject
                      </Button>
                    </div>
                  ) : (
                    <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No action needed</span>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={`hidden md:block overflow-x-auto border rounded-lg ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
            {isLoading ? (
              <div className="p-4">
                <SkeletonTable rows={10} cols={5} />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-gray-50 text-gray-900'}`}>
                  <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                    <th className="px-4 py-3 text-left font-semibold">Faculty</th>
                    <th className="px-4 py-3 text-left font-semibold">Period</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`px-4 py-6 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        No leave requests found
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((row, index) => (
                      <tr key={row.id} className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          <div>
                            <p className="font-medium">{row.name}</p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{row.dept}</p>
                          </div>
                        </td>
                        <td className={`px-4 py-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{row.period}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setViewReason(row.reason)}
                            className={`text-sm font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                          >
                            View
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              row.status === "Pending"
                                ? theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                                : row.status === "Approved"
                                ? theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
                                : theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.status === "Pending" ? (
                            <div className="flex flex-col md:flex-row gap-2">
                              <Button
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                  theme === 'dark' 
                                    ? 'text-green-400 border-green-400 hover:bg-green-900/20' 
                                    : 'text-green-700 border-green-600 hover:bg-green-100'
                                }`}
                                onClick={() => handleApprove(index)}
                                disabled={isLoading}
                              >
                                <CheckCircle size={16} /> Approve
                              </Button>
                              <Button
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                  theme === 'dark' 
                                    ? 'text-red-400 border-red-400 hover:bg-red-900/20' 
                                    : 'text-red-700 border-red-600 hover:bg-red-100'
                                }`}
                                onClick={() => handleReject(index)}
                                disabled={isLoading}
                              >
                                <XCircle size={16} /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No action needed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-6 pt-6 border-t">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                variant="outline"
                size="sm"
                className={`w-full sm:w-auto ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-900 hover:bg-gray-100'}`}
              >
                Previous
              </Button>

              <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                Page {currentPage} of {totalPages}
              </span>

              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                variant="outline"
                size="sm"
                className={`w-full sm:w-auto ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-900 hover:bg-gray-100'}`}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
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
              variant="outline"
              className={theme === 'dark' 
                ? 'text-foreground bg-card border border-border hover:bg-accent' 
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
              onClick={() => setViewReason(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagement;