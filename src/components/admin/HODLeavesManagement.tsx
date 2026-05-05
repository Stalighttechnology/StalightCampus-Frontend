import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { manageHODLeaves } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import Swal from 'sweetalert2';
import { useTheme } from "../../context/ThemeContext";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { SkeletonTable } from "../ui/skeleton";

interface LeaveRequest {
  id: number;
  name: string;
  department: string;
  from: string;
  to: string;
  reason: string;
  status: string;
}

interface HODLeavesManagementProps {
  setError: (error: string | null) => void;
  toast: (options: any) => void;
}

const getStatusBadge = (status: string, theme: string) => {
  switch (status) {
    case "Pending":
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>Pending</span>;
    case "Approved":
    case "APPROVE":
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>Approved</span>;
    case "Rejected":
    case "REJECT":
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>Rejected</span>;
    default:
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>Unknown</span>;
  }
};

const HODLeavesManagement = ({ setError, toast }: HODLeavesManagementProps) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { theme } = useTheme();
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    try {
      return new Date(`${selectedMonth}-01`);
    } catch (e) {
      return new Date();
    }
  });

  const fetchLeaves = async (month?: string, page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, page_size: 10 };
      if (month) {
        params.month = month;
      }
      const response = await manageHODLeaves(params);
      console.log("Leaves API response:", response);
      
      // Handle invalid page due to filter changes
      if (!response.success && response.message && response.message.includes("Invalid page")) {
        setCurrentPage(1);
        return;
      }
      
      // Handle paginated response format where data might be nested under results
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);
      
      if (dataSource && dataSource.success) {
        const leaveData = Array.isArray(dataSource.leaves)
          ? dataSource.leaves.map((leave: any) => ({
              id: leave.id,
              name: leave.hod?.username || leave.hod_name || "N/A",
              department: leave.branch || "N/A",
              from: leave.start_date || "N/A",
              to: leave.end_date || "N/A",
              reason: leave.reason || "N/A",
              status: leave.status === "APPROVED" ? "Approved" :
                      leave.status === "REJECTED" ? "Rejected" :
                      leave.status === "PENDING" ? "Pending" :
                      (leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1).toLowerCase()) || "Unknown",
            }))
          : [];
        setLeaveRequests(leaveData);
        
        // Set pagination info if available
        const count = response.count || (dataSource && dataSource.count);
        if (count !== undefined) {
          setTotalPages(Math.ceil(count / 10)); // Assuming page_size is 10
          setTotalCount(count);
        }
      } else {
        setError(dataSource?.message || response?.message || "Failed to fetch leave requests");
        toast({
          variant: "destructive",
          title: "Error",
          description: dataSource?.message || response?.message || "Failed to fetch leave requests",
        });
      }
    } catch (err) {
      console.error("Fetch leaves error:", err);
      setError("Network error");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when month changes
    fetchLeaves(selectedMonth, 1);
  }, [setError, toast, selectedMonth]);

  const handleApprove = async (id: number) => {
    const result = await Swal.fire({
      title: 'Approve Leave?',
      text: "Are you sure you want to approve this leave request?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      cancelButtonColor: theme === 'dark' ? '#3f3f46' : '#d1d5db',
      confirmButtonText: 'Yes, Approve',
      background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: theme === 'dark' ? '#E4E4E7' : '#000000',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await manageHODLeaves({ leave_id: id, action: "APPROVED" }, "POST");
      console.log("Approve API response:", response);
      if (response.success) {
        if (response.leave) {
          setLeaveRequests(prevRequests =>
            prevRequests.map(leave =>
              leave.id === id
                ? {
                    ...leave,
                    status: response.leave.status === "APPROVED" ? "Approved" : leave.status
                  }
                : leave
            )
          );
        }
        Swal.fire({
          icon: 'success',
          title: 'Leave Approved!',
          text: 'The leave request has been approved successfully.',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
          confirmButtonColor: '#22c55e',
        });
      } else {
        setError(response.message || "Failed to approve leave");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to approve leave",
        });
      }
    } catch (err) {
      console.error("Approve leave error:", err);
      setError("Network error");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    const result = await Swal.fire({
      title: 'Reject Leave?',
      text: "Are you sure you want to reject this leave request?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: theme === 'dark' ? '#3f3f46' : '#d1d5db',
      confirmButtonText: 'Yes, Reject',
      background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: theme === 'dark' ? '#E4E4E7' : '#000000',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await manageHODLeaves({ leave_id: id, action: "REJECTED" }, "POST");
      console.log("Reject API response:", response);
      if (response.success) {
        if (response.leave) {
          setLeaveRequests(prevRequests =>
            prevRequests.map(leave =>
              leave.id === id
                ? {
                    ...leave,
                    status: response.leave.status === "REJECTED" ? "Rejected" : leave.status
                  }
                : leave
            )
          );
        }
        Swal.fire({
          icon: 'error',
          title: 'Leave Rejected',
          text: 'The leave request has been rejected.',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
          confirmButtonColor: '#ef4444',
        });
      } else {
        setError(response.message || "Failed to reject leave");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to reject leave",
        });
      }
    } catch (err) {
      console.error("Reject leave error:", err);
      setError("Network error");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading && leaveRequests.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={8} cols={5} />
      </div>
    );
  }

  return (
    <div className={`w-full min-h-full ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card border border-border flex flex-col w-full shadow-sm' : 'bg-white border border-gray-200 flex flex-col w-full shadow-sm'}>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className={`mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Requests</CardTitle>
              <div className="flex items-center gap-3">
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Review and approve leave requests from Heads of Departments</p>
                {totalCount > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {totalCount} Total
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Month:</label>
              <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={theme === 'dark' ? 'w-full sm:w-40 justify-start text-left font-normal bg-card text-foreground border-border' : 'w-full sm:w-40 justify-start text-left font-normal bg-white text-gray-900 border-gray-300'}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedMonth ? (
                      (() => {
                        try {
                          const d = new Date(`${selectedMonth}-01`);
                          return format(d, 'MMMM yyyy');
                        } catch (e) {
                          return selectedMonth;
                        }
                      })()
                    ) : (
                      <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Select month</span>
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className={theme === 'dark' ? 'w-64 p-3 bg-background text-foreground border-border shadow-lg' : 'w-64 p-3 bg-white text-gray-900 border-gray-200 shadow-lg'}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear() - 1, visibleMonth.getMonth(), 1))}
                        aria-label="Previous year"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="text-center font-medium">{format(visibleMonth, 'yyyy')}</div>

                      <button
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear() + 1, visibleMonth.getMonth(), 1))}
                        aria-label="Next year"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const monthDate = new Date(visibleMonth.getFullYear(), i, 1);
                        const monthLabel = format(monthDate, 'MMM');
                        const monthValue = `${visibleMonth.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedMonth(monthValue);
                              setMonthPickerOpen(false);
                            }}
                            className={`px-3 py-2 rounded-md text-sm text-left w-full ${selectedMonth === monthValue ? 'bg-primary text-primary-foreground' : theme === 'dark' ? 'bg-card hover:bg-accent text-foreground' : 'bg-white hover:bg-gray-100 text-gray-900'} `}
                          >
                            {monthLabel}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMonth('');
                          setMonthPickerOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 px-2 sm:px-6 pt-2">
          <div className="border rounded-xl overflow-hidden shadow-sm">
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-3 p-2">
              {Array.isArray(leaveRequests) && leaveRequests.length > 0 ? (
                leaveRequests.map((leave) => (
                  <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{leave.name}</div>
                        <div className="text-xs text-muted-foreground">{leave.department}</div>
                        <div className="text-sm mt-1">{leave.from} <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span> {leave.to}</div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(leave.status, theme)}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => setViewReason(leave.reason)}
                        className={`text-sm font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                      >
                        View
                      </button>
                      <div>
                        {leave.status === "Pending" ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => handleApprove(leave.id)}>Approve</Button>
                            <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={() => handleReject(leave.id)}>Reject</Button>
                          </div>
                        ) : (
                          <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No action needed</span>
                        )}
                      </div>
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

            {/* Desktop / Tablet: table */}
            <table className="hidden md:table w-full text-sm text-left border-collapse">
              <thead className={`sticky top-0 z-10 border-b ${theme === 'dark' ? 'border-border bg-card shadow-sm' : 'border-gray-200 bg-gray-50 shadow-sm'}`}>
                <tr>
                  <th className={`py-3 px-2 md:px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>HOD</th>
                  <th className={`py-3 px-4 md:px-12 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</th>
                  <th className={`py-3 px-2 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                  <th className={`py-3 px-2 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                  <th className={`py-3 px-2 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.isArray(leaveRequests) && leaveRequests.length > 0 ? (
                  leaveRequests.map((leave) => (
                    <tr
                      key={leave.id}
                      className={`transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-4 px-2 md:px-4">
                        <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.name}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{leave.department}</div>
                      </td>
                      <td className={`py-4 px-2 md:px-4 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {leave.from} <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span> {leave.to}
                      </td>
                      <td className="py-4 px-2 md:px-4 text-sm">
                        <button
                          onClick={() => setViewReason(leave.reason)}
                          className={`text-sm font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                          View
                        </button>
                      </td>
                      <td className="py-4 px-2 md:px-4">{getStatusBadge(leave.status, theme)}</td>
                      <td className="py-4 px-2 md:px-4">
                        {leave.status === "Pending" ? (
                          <div className="flex flex-col md:flex-row gap-2">
                            <Button
                              variant="outline"
                              className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                theme === 'dark' 
                                  ? 'text-green-400 border-green-400 hover:bg-green-900/20' 
                                  : 'text-green-700 border-green-600 hover:bg-green-100'
                              }`}
                              onClick={() => handleApprove(leave.id)}
                              disabled={loading}
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
                              onClick={() => handleReject(leave.id)}
                              disabled={loading}
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
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 px-4">
                      <div className="flex flex-col items-center justify-center">
                        <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                          <CalendarIcon className="w-10 h-10 text-primary opacity-50" />
                        </div>
                        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No leave requests</h3>
                        <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          There are currently no leave requests available for the selected period.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-border">
            <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
              Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} leave requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = currentPage - 1;
                  setCurrentPage(newPage);
                  fetchLeaves(selectedMonth, newPage);
                }}
                disabled={currentPage === 1 || loading}
                className={theme === 'dark' 
                  ? 'border-border text-foreground hover:bg-accent' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
              >
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCurrentPage(pageNum);
                        fetchLeaves(selectedMonth, pageNum);
                      }}
                      disabled={loading}
                      className={`w-8 h-8 p-0 ${currentPage === pageNum ? 'bg-primary hover:bg-primary/90 text-white' : ''}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = currentPage + 1;
                  setCurrentPage(newPage);
                  fetchLeaves(selectedMonth, newPage);
                }}
                disabled={currentPage === totalPages || loading}
                className={theme === 'dark' 
                  ? 'border-border text-foreground hover:bg-accent' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View Reason Dialog */}
      <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[70%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[70%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}>
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
                ? 'text-foreground bg-card border border-border bg-primary hover:text-white hover:bg-primary/80' 
                : 'border border-gray-300 hover:bg-gray-50 text bg-primary text-white hover:bg-primary/80 hover:text-white'}
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

export default HODLeavesManagement;