import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from
  "../ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "../ui/select";
import { manageDepartmentAdminLeaves } from "../../utils/admin_api";
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
  role?: string;
  reviewed_by?: string | null;
}

interface DepartmentAdminLeavesManagementProps {
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

const DepartmentAdminLeavesManagement = ({ setError, toast }: DepartmentAdminLeavesManagementProps) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewLeave, setViewLeave] = useState<LeaveRequest | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { theme } = useTheme();
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  const filteredLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    if (selectedMonth) {
      const d = new Date(`${selectedMonth}-01`);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    return new Date();
  });

  useEffect(() => {
    if (selectedMonth) {
      const d = new Date(`${selectedMonth}-01`);
      if (!isNaN(d.getTime())) {
        setVisibleMonth(d);
      }
    }
  }, [selectedMonth]);

  const fetchLeaves = async (month?: string, page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, page_size: 10 };
      if (month) {
        params.month = month;
      }
      if (statusFilter !== "All") {
        params.status = statusFilter;
      }
      if (roleFilter !== "All") {
        params.role = roleFilter;
      }
      const response = await manageDepartmentAdminLeaves(params);


      // Handle invalid page due to filter changes
      if (!response.success && response.message && response.message.includes("Invalid page")) {
        setCurrentPage(1);
        return;
      }

      // Handle paginated response format where data might be nested under results
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : response as any;

      if (dataSource && dataSource.success) {
        const leaveData = Array.isArray(dataSource.leaves) ?
          dataSource.leaves.map((leave: any) => ({
            id: leave.id,
            name: leave.name || "N/A",
            role: leave.role || "N/A",
            department: leave.department || "N/A",
            from: leave.start_date || "N/A",
            to: leave.end_date || "N/A",
            reason: leave.reason || "N/A",
            status: leave.status === "APPROVED" ? "Approved" :
              leave.status === "REJECTED" ? "Rejected" :
                leave.status === "PENDING" ? "Pending" :
                  leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1).toLowerCase() || "Unknown",
            reviewed_by: leave.reviewed_by || null
          })) :
          [];
        setLeaveRequests(leaveData);

        // Set pagination info if available
        const count = response.count || dataSource && dataSource.count;
        if (count !== undefined) {
          setTotalPages(Math.ceil(count / 10)); // Assuming page_size is 10
          setTotalCount(count);
        }
      } else {
        setError(dataSource?.message || response?.message || "Failed to fetch leave requests");
        toast({
          variant: "destructive",
          title: "Error",
          description: dataSource?.message || response?.message || "Failed to fetch leave requests"
        });
      }
    } catch (err) {

      setError("Network error");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves(selectedMonth, currentPage);
  }, [selectedMonth, currentPage, statusFilter, roleFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, statusFilter, roleFilter]);

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
      color: theme === 'dark' ? '#E4E4E7' : '#000000'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await manageDepartmentAdminLeaves({ leave_id: id, action: "APPROVED" }, "POST");

      if (response.success) {
        setLeaveRequests((prevRequests) =>
          prevRequests.map((leave) =>
            leave.id === id ?
              {
                ...leave,
                status: "Approved"
              } :
              leave
          )
        );
        Swal.fire({
          icon: 'success',
          title: 'Leave Approved!',
          text: 'The leave request has been approved successfully.',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
          confirmButtonColor: '#22c55e'
        });
      } else {
        setError(response.message || "Failed to approve leave");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to approve leave"
        });
      }
    } catch (err) {

      setError("Network error");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error"
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
      color: theme === 'dark' ? '#E4E4E7' : '#000000'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await manageDepartmentAdminLeaves({ leave_id: id, action: "REJECTED" }, "POST");

      if (response.success) {
        setLeaveRequests((prevRequests) =>
          prevRequests.map((leave) =>
            leave.id === id ?
              {
                ...leave,
                status: "Rejected"
              } :
              leave
          )
        );
        Swal.fire({
          icon: 'error',
          title: 'Leave Rejected',
          text: 'The leave request has been rejected.',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
          confirmButtonColor: '#ef4444'
        });
      } else {
        setError(response.message || "Failed to reject leave");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to reject leave"
        });
      }
    } catch (err) {

      setError("Network error");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error"
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading && leaveRequests.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={8} cols={5} />
      </div>);

  }

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .leave-card-header { padding: 16px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .leave-card-title { font-size: 1.25rem !important; }
          .leave-card-desc { font-size: 0.8125rem !important; margin-top: 4px !important; }
          .leave-item-card { padding: 16px !important; border-radius: 12px !important; }
          .leave-actions-mobile { width: 100% !important; margin-top: 12px !important; gap: 8px !important; flex-direction: row !important; }
          .leave-action-btn { flex: 1 !important; height: 38px !important; font-size: 12px !important; font-weight: 600 !important; }
          .leave-view-btn { width: 100% !important; height: 38px !important; justify-content: center !important; }
        }
      `}</style>

      <div className={`w-full min-h-full ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <Card id="Transport Admin-leaves-card" className={theme === 'dark' ? 'bg-card border border-border flex flex-col w-full shadow-sm' : 'bg-white border border-gray-200 flex flex-col w-full shadow-sm'}>
          <CardHeader id="Transport Admin-leaves-header-section" className="leave-card-header pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <CardTitle className={`leave-card-title ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Requests</CardTitle>
                  {totalCount > 0 &&
                    <span className={`text-xs font-medium px-2.5 py-0.5 mt-1 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                      {totalCount} Total
                    </span>
                  }
                </div>
                <p className={`leave-card-desc text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Review and approve leave requests from Department Admins
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <label className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'} shrink-0`}>Month:</label>
                  <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`flex-1 sm:w-40 justify-start text-left font-normal h-9 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>

                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedMonth ?
                          (() => {
                            try {
                              const d = new Date(`${selectedMonth}-01`);
                              return format(d, 'MMMM yyyy');
                            } catch (e) {
                              return selectedMonth;
                            }
                          })() :

                          <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Select month</span>
                        }
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className={theme === 'dark' ? 'w-64 p-3 bg-background text-foreground border-border shadow-lg' : 'w-64 p-3 bg-white text-gray-900 border-gray-200 shadow-lg'}>
                      <div>
                        <div className="flex items-center justify-center mb-3">
                          <Select
                            value={visibleMonth.getFullYear().toString()}
                            onValueChange={(val) => setVisibleMonth(new Date(Number(val), visibleMonth.getMonth(), 1))}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 11 }, (_, i) => {
                                const year = (new Date().getFullYear() - i).toString();
                                return (
                                  <SelectItem key={year} value={year} className="text-xs">
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 12 }).map((_, i) => {
                            const monthDate = new Date(visibleMonth.getFullYear(), i, 1);
                            const monthLabel = format(monthDate, 'MMM');
                            const monthValue = `${visibleMonth.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
                            const today = new Date();
                            const isFutureMonth = visibleMonth.getFullYear() > today.getFullYear() ||
                              (visibleMonth.getFullYear() === today.getFullYear() && i > today.getMonth());
                            return (
                              <button
                                key={i}
                                disabled={isFutureMonth}
                                onClick={() => {
                                  setSelectedMonth(monthValue);
                                  setMonthPickerOpen(false);
                                }}
                                className={`px-3 py-2 rounded-md text-sm text-left w-full disabled:opacity-30 disabled:cursor-not-allowed ${selectedMonth === monthValue ? 'bg-primary text-primary-foreground' : theme === 'dark' ? 'bg-card hover:bg-accent text-foreground' : 'bg-white hover:bg-gray-100 text-gray-900'} `}>

                                {monthLabel}
                              </button>);

                          })}
                        </div>

                        <div className="mt-3 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMonth('');
                              setMonthPickerOpen(false);
                            }}>

                            Clear
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="flex-1 sm:w-[140px] px-3 h-9 flex items-center gap-2 rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 [&>svg:last-child]:hidden shadow-sm font-medium text-sm">
                      <Filter className="h-4 w-4" />
                      <span>Role</span>
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                      <SelectItem value="All">All Roles</SelectItem>
                      <SelectItem value="transport_admin">Transport Admin</SelectItem>
                      <SelectItem value="library_admin">Library Admin</SelectItem>
                      <SelectItem value="hms_admin">Hostel Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="flex-1 sm:w-[120px] px-3 h-9 flex items-center gap-2 rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 [&>svg:last-child]:hidden shadow-sm font-medium text-sm">
                      <Filter className="h-4 w-4" />
                      <span>Status</span>
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                      <SelectItem value="All">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 px-2 sm:px-6 pt-2">
            <div className="border rounded-xl overflow-hidden shadow-sm">
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-3 p-2">
                {Array.isArray(filteredLeaveRequests) && filteredLeaveRequests.length > 0 ?
                  filteredLeaveRequests.map((leave) =>
                    <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-base">{leave.name}</div>
                          <div className="text-xs text-muted-foreground font-medium flex gap-1">
                            <span>{leave.role === 'transport_admin' ? 'Transport Admin' : leave.role === 'library_admin' ? 'Library Admin' : leave.role === 'hms_admin' ? 'Hostel Admin' : leave.role}</span>
                            <span>•</span>
                            <span>{leave.department}</span>
                          </div>
                        </div>
                        <div className="shrink-0">{getStatusBadge(leave.status, theme)}</div>
                      </div>

                      <div className="mt-3 space-y-3">
                        <div className={`p-2.5 rounded-lg border text-sm flex items-center gap-2 ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50/50 border-gray-100'}`}>
                          <CalendarIcon className="w-4 h-4 text-primary/60" />
                          <span className="font-medium text-foreground">{leave.from}</span>
                          <span className="text-muted-foreground">to</span>
                          <span className="font-medium text-foreground">{leave.to}</span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className={`leave-view-btn w-full h-9 font-semibold ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                          onClick={() => setViewLeave(leave)}>

                          View Reason
                        </Button>

                        {leave.status === "Pending" ? (
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <Button
                              variant="outline"
                              className={`text-xs flex items-center justify-center gap-1 ${theme === 'dark'
                                  ? 'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20'
                                  : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                                }`}
                              onClick={() => handleApprove(leave.id)}
                              disabled={loading}
                            >
                              <CheckCircle size={16} /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              className={`text-xs flex items-center justify-center gap-1 ${theme === 'dark'
                                  ? 'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20'
                                  : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                                }`}
                              onClick={() => handleReject(leave.id)}
                              disabled={loading}
                            >
                              <XCircle size={16} /> Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-2 border-t border-border/20 mt-2">
                            <span className="text-xs text-muted-foreground italic">Processed</span>
                            {leave.reviewed_by && (
                              <span className="text-xs text-muted-foreground font-medium">by {leave.reviewed_by}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) :

                  <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-white'}`}>
                    <CalendarIcon className="w-10 h-10 text-primary opacity-30 mb-3" />
                    <h3 className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Leave Requests</h3>
                    <p className={`text-xs text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>There are currently no leave requests to display for this period.</p>
                  </div>
                }
              </div>

              {/* Desktop / Tablet: table */}
              <table className="hidden md:table w-full text-sm text-left border-collapse">
                <thead className={`sticky top-0 z-10 border-b ${theme === 'dark' ? 'border-border bg-card shadow-sm' : 'border-gray-200 bg-gray-50 shadow-sm'}`}>
                  <tr>
                    <th className={`py-3 px-2 md:px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Admin</th>
                    <th className={`py-3 px-4 md:px-12 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</th>
                    <th className={`py-3 px-2 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                    <th className={`py-3 px-2 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                    <th className={`py-3 px-2 text-right font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Array.isArray(filteredLeaveRequests) && filteredLeaveRequests.length > 0 ?
                    filteredLeaveRequests.map((leave) =>
                      <tr
                        key={leave.id}
                        className={`transition-colors duration-200 border-b ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>

                        <td className="py-4 px-2 md:px-4">
                          <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.name}</div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            {leave.role === 'transport_admin' ? 'Transport Admin' : leave.role === 'library_admin' ? 'Library Admin' : leave.role === 'hms_admin' ? 'Hostel Admin' : leave.role} • {leave.department}
                          </div>
                        </td>
                        <td className={`py-4 px-2 md:px-4 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {leave.from} <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span> {leave.to}
                        </td>
                        <td className="py-4 px-2 md:px-4 text-sm">
                          <button
                            onClick={() => setViewLeave(leave)}
                            className={`text-sm font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>

                            View
                          </button>
                        </td>
                        <td className="py-4 px-2 md:px-4">{getStatusBadge(leave.status, theme)}</td>
                        <td className="py-4 px-2 md:px-4 text-right">
                          {leave.status === "Pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleApprove(leave.id)}
                                size="sm"
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                                    ? 'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20'
                                    : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                                  }`}
                                disabled={loading}
                              >
                                <CheckCircle size={16} />
                                <span className="ml-1 hidden sm:inline">Approve</span>
                              </Button>
                              <Button
                                onClick={() => handleReject(leave.id)}
                                size="sm"
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 ${theme === 'dark'
                                    ? 'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20'
                                    : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                                  }`}
                                disabled={loading}
                              >
                                <XCircle size={16} />
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
                    ) :

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
                  }
                </tbody>
              </table>
            </div>
          </CardContent>

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
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
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
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* View Reason Dialog */}
        <Dialog open={!!viewLeave} onOpenChange={() => setViewLeave(null)}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[70%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[70%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}>
            <DialogHeader>
              <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Reason</DialogTitle>
            </DialogHeader>

            <div
              className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>

              {viewLeave?.reason}
            </div>



            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                className={theme === 'dark' ?
                  'text-foreground bg-card border border-border bg-primary hover:text-white hover:bg-primary/80' :
                  'border border-gray-300 hover:bg-gray-50 text bg-primary text-white hover:bg-primary/80 hover:text-white'}
                onClick={() => setViewLeave(null)}>

                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>);

};

export default DepartmentAdminLeavesManagement;
