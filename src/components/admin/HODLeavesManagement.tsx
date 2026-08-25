import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, FileText, ExternalLink } from "lucide-react";
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
  title: string;
  name: string;
  role: string;
  department: string;
  leave_type: string;
  start_time?: string | null;
  end_time?: string | null;
  is_half_day?: boolean;
  half_day_session?: string | null;
  from: string;
  to: string;
  reason: string;
  status: string;
  initial_document_url?: string | null;
  completion_document_url?: string | null;
  od_purpose_category?: string | null;
  od_completion_verified?: boolean;
  current_stage?: string;
  alternate_faculty_name?: string | null;
  alternate_duty_status?: string;
  alternate_duty_remarks?: string;
  hod_approval_status?: string;
  hod_reviewed_by_name?: string | null;
  intermediate_approval_status?: string;
  intermediate_reviewed_by_name?: string | null;
  principal_approval_status?: string;
}

interface HODLeavesManagementProps {
  setError: (error: string | null) => void;
  toast: (options: any) => void;
  userRole?: string;
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

const renderLeaveCategoryBadge = (leaveType: string, isHalfDay?: boolean, halfDaySession?: string | null, odCategory?: string | null) => {
  const normalizedType = (leaveType || 'casual').toLowerCase();
  
  let label = 'Casual (CL)';
  let colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
  
  if (normalizedType === 'od' || normalizedType === 'on_duty') {
    label = 'On Duty (OD)';
    colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  } else if (normalizedType === 'short_permission') {
    label = 'Short Permission';
    colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
  } else if (normalizedType === 'earned' || normalizedType === 'el') {
    label = 'Earned (EL)';
    colorClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300';
  } else if (normalizedType === 'vacation') {
    label = 'Vacation Leave';
    colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
  } else if (normalizedType === 'rh' || normalizedType === 'restricted_holiday') {
    label = 'Holiday (RH)';
    colorClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
  } else if (normalizedType === 'maternity' || normalizedType === 'ml') {
    label = 'Maternity (ML)';
    colorClass = 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300';
  }

  const showHalfDay = Boolean(isHalfDay || normalizedType === 'half_day');
  const sessionNormalized = (halfDaySession || '').toLowerCase();
  const sessionText = (sessionNormalized === 'forenoon' || sessionNormalized === 'morning') ? 'Morning' : 'Afternoon';

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded w-fit ${colorClass}`}>
        {label}
      </span>
      {odCategory && (
        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 w-fit">
          OD: {odCategory.replace(/_/g, ' ').toUpperCase()}
        </span>
      )}
      {showHalfDay && (
        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 w-fit">
          Half-Day ({sessionText})
        </span>
      )}
    </div>
  );
};

const HODLeavesManagement = ({ setError, toast, userRole }: HODLeavesManagementProps) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { theme } = useTheme();
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  const canTakeAction = (leave: LeaveRequest) => {
    if (leave.status !== "Pending") return false;
    const role = (userRole || "").toLowerCase();
    const stage = (leave.current_stage || "").toLowerCase();

    if (role === "hod") {
      return stage === "hod" && leave.hod_approval_status !== "APPROVED";
    }
    if (role === "dean") {
      return stage === "dean" && leave.intermediate_approval_status !== "APPROVED";
    }
    if (!role || ["principal", "org_admin", "superadmin", "admin"].includes(role)) {
      return stage === "principal" && leave.principal_approval_status !== "APPROVED";
    }
    if (stage === role && leave.intermediate_approval_status !== "APPROVED") {
      return true;
    }
    return false;
  };

  const getActionPendingLabel = (leave: LeaveRequest) => {
    if (leave.status !== "Pending") return null;
    const role = (userRole || "").toLowerCase();
    const stage = (leave.current_stage || "").toLowerCase();

    if (role === "hod" && leave.hod_approval_status === "APPROVED") {
      return "Endorsed (Pending Principal)";
    }
    if (role === "dean" && leave.intermediate_approval_status === "APPROVED") {
      return "Endorsed (Pending Principal)";
    }
    if (stage === "alternate_duty") {
      return "Awaiting Substitute";
    }
    if (stage === "hod" && role !== "hod") {
      return "Awaiting HOD";
    }
    if (stage === "principal" && role !== "principal" && role !== "org_admin" && role !== "admin" && Boolean(role)) {
      return "Awaiting Principal";
    }
    return "No action needed";
  };

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
      const response = await manageHODLeaves(params);


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
            title: leave.title || (leave.leave_type === 'short_permission' ? 'Short Permission' : 'Leave Request'),
            name: leave.applicant_name || ((leave.hod?.first_name || leave.hod?.last_name)
              ? `${leave.hod?.first_name || ""} ${leave.hod?.last_name || ""}`.trim()
              : leave.hod?.username || leave.hod_name || "N/A"),
            role: leave.role || "staff",
            department: leave.branch || "N/A",
            leave_type: leave.leave_type || "casual",
            start_time: leave.start_time,
            end_time: leave.end_time,
            is_half_day: leave.is_half_day,
            half_day_session: leave.half_day_session,
            from: leave.start_date || "N/A",
            to: leave.end_date || "N/A",
            reason: leave.reason || "N/A",
            initial_document_url: leave.initial_document_url || null,
            completion_document_url: leave.completion_document_url || null,
            od_purpose_category: leave.od_purpose_category || null,
            od_completion_verified: Boolean(leave.od_completion_verified),
            current_stage: leave.current_stage,
            alternate_faculty_name: leave.alternate_faculty_name,
            alternate_duty_status: leave.alternate_duty_status,
            alternate_duty_remarks: leave.alternate_duty_remarks,
            hod_approval_status: leave.hod_approval_status,
            hod_reviewed_by_name: leave.hod_reviewed_by_name,
            intermediate_approval_status: leave.intermediate_approval_status,
            intermediate_reviewed_by_name: leave.intermediate_reviewed_by_name,
            principal_approval_status: leave.principal_approval_status,
            status: leave.status === "APPROVED" ? "Approved" :
              leave.status === "REJECTED" ? "Rejected" :
                leave.status === "PENDING" ? "Pending" :
                  leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1).toLowerCase() || "Unknown"
          })) :
          [];
        setLeaveRequests(leaveData);

        // Set pagination info if available
        const total = typeof response.count === 'number' ? response.count : (typeof dataSource?.count === 'number' ? dataSource.count : (response.total_pages ? response.total_pages * 10 : (dataSource?.total_pages ? dataSource.total_pages * 10 : leaveData.length)));
        const pages = typeof response.total_pages === 'number' ? response.total_pages : (typeof dataSource?.total_pages === 'number' ? dataSource.total_pages : Math.ceil(total / 10));
        setTotalPages(Math.max(1, pages));
        setTotalCount(total);

        // Real-time synchronization of pending approvals count to sidebar
        const pendingCount = typeof (response as any).pending_count === 'number'
          ? (response as any).pending_count
          : (typeof dataSource?.pending_count === 'number' ? dataSource.pending_count : leaveData.filter((l: any) => l.status === 'Pending').length);
        window.dispatchEvent(new CustomEvent('leave-approvals-updated', { detail: { pending_count: pendingCount } }));
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
    const leaveItem = leaveRequests.find((l) => l.id === id);
    const isShortPermission = leaveItem?.leave_type === 'short_permission';
    const typeLabel = isShortPermission ? 'Short Permission' : 'Leave';

    const result = await Swal.fire({
      title: `Approve ${typeLabel}?`,
      text: `Are you sure you want to approve this ${typeLabel.toLowerCase()} request?`,
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
      const response = await manageHODLeaves({ leave_id: id, action: "APPROVED" }, "POST");

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
        window.dispatchEvent(new CustomEvent('leaves-updated'));
        fetchLeaves(selectedMonth, currentPage);
        Swal.fire({
          icon: 'success',
          title: `${typeLabel} Approved!`,
          text: `The ${typeLabel.toLowerCase()} request has been approved successfully.`,
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
          confirmButtonColor: '#22c55e'
        });
      } else {
        setError(response.message || `Failed to approve ${typeLabel.toLowerCase()}`);
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || `Failed to approve ${typeLabel.toLowerCase()}`
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
    const leaveItem = leaveRequests.find((l) => l.id === id);
    const isShortPermission = leaveItem?.leave_type === 'short_permission';
    const typeLabel = isShortPermission ? 'Short Permission' : 'Leave';

    const result = await Swal.fire({
      title: `Reject ${typeLabel}?`,
      text: `Are you sure you want to reject this ${typeLabel.toLowerCase()} request?`,
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
      const response = await manageHODLeaves({ leave_id: id, action: "REJECTED" }, "POST");

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
        window.dispatchEvent(new CustomEvent('leaves-updated'));
        fetchLeaves(selectedMonth, currentPage);
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


  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d}-${m}-${y}`;
    return dateStr;
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
        @media (max-width: 640px) {
          .leave-card-header { padding: 12px 14px !important; gap: 10px !important; }
          .leave-filter-container { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; gap: 6px !important; width: 100% !important; }
          .leave-month-wrapper { flex: 1 1 0% !important; min-width: 0 !important; }
          .leave-month-picker { width: 100% !important; height: 36px !important; font-size: 12px !important; padding: 0 6px !important; }
          .leave-role-select { flex: 1 1 0% !important; min-width: 0 !important; width: 100% !important; height: 36px !important; font-size: 12px !important; padding: 0 6px !important; }
          .leave-filter-select { flex: 0 0 auto !important; height: 36px !important; font-size: 12px !important; padding: 0 10px !important; min-width: 76px !important; }
          .leave-item-card { padding: 14px !important; border-radius: 12px !important; }
          .leave-actions-mobile { width: 100% !important; margin-top: 10px !important; gap: 8px !important; flex-direction: row !important; }
          .leave-action-btn { flex: 1 !important; height: 36px !important; font-size: 12px !important; font-weight: 600 !important; }
          .leave-view-btn { width: 100% !important; height: 36px !important; justify-content: center !important; }
        }
      `}</style>

      <div className={`w-full min-h-full ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <Card id="hod-leaves-card" className={theme === 'dark' ? 'bg-card border border-border flex flex-col w-full shadow-sm' : 'bg-white border border-gray-200 flex flex-col w-full shadow-sm'}>
          <CardHeader id="hod-leaves-header-section" className="leave-card-header border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <CardTitle className="text-lg sm:text-2xl font-semibold tracking-tight">Leave Requests</CardTitle>
                {totalCount > 0 &&
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center ${theme === 'dark' ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {totalCount} Total
                  </span>
                }
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {translateTerminology("Review and approve leave and permission requests routed to you for approval")}
              </CardDescription>
            </div>
            <div className="leave-filter-container flex items-center justify-start sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="leave-month-wrapper flex items-center">
                  <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`leave-month-picker ${theme === 'dark' ? 'w-36 sm:w-40 justify-start text-left font-normal bg-card text-foreground border-border' : 'w-36 sm:w-40 justify-start text-left font-normal bg-white text-gray-900 border-gray-300'}`}>
                        <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate">
                        {selectedMonth ?
                          (() => {
                            try {
                              const d = new Date(`${selectedMonth}-01`);
                              return format(d, 'MMMM yyyy');
                            } catch (e) {
                              return selectedMonth;
                            }
                          })() :
                          <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Month</span>
                        }
                        </span>
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
                            className="bg-primary text-white hover:bg-primary/90 hover:text-white"
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

                {/* Role Filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className={`leave-role-select w-[130px] sm:w-[140px] h-9 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900'}>
                    <SelectItem value="All">All Roles</SelectItem>
                    {userRole === 'dean' ? (
                      <>
                        <SelectItem value="principal">Principal</SelectItem>
                        <SelectItem value="teacher">Faculty / Teacher</SelectItem>
                        <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                        <SelectItem value="coe">COE</SelectItem>
                        <SelectItem value="fees_manager">Fees Manager</SelectItem>
                        <SelectItem value="hms_admin">HMS Admin</SelectItem>
                        <SelectItem value="warden">Hostel Warden</SelectItem>
                        <SelectItem value="caretaker">Hostel Caretaker</SelectItem>
                        <SelectItem value="transport_admin">Transport Admin</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="library_admin">Library Admin</SelectItem>
                        <SelectItem value="placement_officer">Placement Officer</SelectItem>
                        <SelectItem value="counsellor">Counsellor</SelectItem>
                        <SelectItem value="admission_manager">Admission Manager</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="teacher">Faculty / Teacher</SelectItem>
                        <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                        <SelectItem value="dean">Dean</SelectItem>
                        <SelectItem value="coe">COE</SelectItem>
                        <SelectItem value="fees_manager">Fees Manager</SelectItem>
                        <SelectItem value="hms_admin">HMS Admin</SelectItem>
                        <SelectItem value="warden">Hostel Warden</SelectItem>
                        <SelectItem value="caretaker">Hostel Caretaker</SelectItem>
                        <SelectItem value="transport_admin">Transport Admin</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="library_admin">Library Admin</SelectItem>
                        <SelectItem value="placement_officer">Placement Officer</SelectItem>
                        <SelectItem value="counsellor">Counsellor</SelectItem>
                        <SelectItem value="admission_manager">Admission Manager</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="leave-filter-select min-w-[100px] w-auto px-3 h-9 flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 [&>svg:last-child]:hidden [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:gap-2 shadow-sm font-medium text-sm">
                    <Filter className="h-4 w-4" />
                    <span>{statusFilter === "All" ? "Filter" : statusFilter}</span>
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </CardHeader>
          <CardContent className="flex-1 px-2 sm:px-6 pt-3">
            <div className="border rounded-xl overflow-hidden shadow-sm">
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-3 p-2">
                {Array.isArray(filteredLeaveRequests) && filteredLeaveRequests.length > 0 ?
                  filteredLeaveRequests.map((leave) =>
                    <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-base break-all">{leave.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {leave.role?.replace('_', ' ')}
                            </span>
                            {(['teacher', 'faculty', 'hod'].includes(leave.role?.toLowerCase()) && leave.department && leave.department !== 'General' && leave.department !== 'N/A') && (
                              <span className="text-xs text-muted-foreground font-medium">{leave.department}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">{getStatusBadge(leave.status, theme)}</div>
                      </div>

                      <div className="mt-2.5">
                        <div className="text-sm font-semibold text-foreground">{leave.title}</div>
                        {renderLeaveCategoryBadge(leave.leave_type, leave.is_half_day, leave.half_day_session, leave.od_purpose_category)}
                        {leave.hod_approval_status === "APPROVED" && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                            ✓ Endorsed by HOD{leave.hod_reviewed_by_name ? ` (${leave.hod_reviewed_by_name})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-3">
                        <div className={`p-2.5 rounded-lg border text-sm flex flex-col gap-1 ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50/50 border-gray-100'}`}>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-primary/60" />
                            <span className="font-medium text-foreground">{formatDateString(leave.from)}</span>
                            {leave.from !== leave.to && (
                              <>
                                <span className="text-muted-foreground">to</span>
                                <span className="font-medium text-foreground">{formatDateString(leave.to)}</span>
                              </>
                            )}
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
                            className={`leave-view-btn w-full h-9 font-semibold transition border ${theme === 'dark'
                                ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                              }`}
                            onClick={() => setViewReason(leave.reason)}>
                            View Reason
                          </Button>

                          {(leave.initial_document_url || leave.completion_document_url) && (
                            <>
                              {leave.initial_document_url && (
                                <a
                                  href={leave.initial_document_url}
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
                              {leave.completion_document_url && (
                                <a
                                  href={leave.completion_document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md border shadow-sm transition-all ${
                                    theme === 'dark'
                                      ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>View Attendance Certificate</span>
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                              )}
                            </>
                          )}
                        </div>

                        {canTakeAction(leave) ?
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <Button
                              variant="outline"
                              className={`text-xs flex items-center justify-center gap-1 ${theme === 'dark'
                                  ? 'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20'
                                  : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                                }`}
                              onClick={() => handleApprove(leave.id)}
                              disabled={loading}>
                              <CheckCircle size={16} /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              className={`text-xs flex items-center justify-center gap-1 ${theme === 'dark'
                                  ? 'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20'
                                  : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                                }`}
                              onClick={() => handleReject(leave.id)}
                              disabled={loading}>
                              <XCircle size={16} /> Reject
                            </Button>
                          </div> :

                          <div className="pt-2 text-center border-t border-border/30">
                            <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              {getActionPendingLabel(leave) || "No action needed"}
                            </span>
                          </div>
                        }
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
                    {Array.isArray(filteredLeaveRequests) && filteredLeaveRequests.length > 0 ?
                      filteredLeaveRequests.map((leave) =>
                        <tr
                          key={leave.id}
                          className={`transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'}`}>

                          <td className="py-4 px-2 md:px-4 text-left">
                            <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                {leave.role?.replace('_', ' ')}
                              </span>
                              {(['teacher', 'faculty', 'hod'].includes(leave.role?.toLowerCase()) && leave.department && leave.department !== 'General' && leave.department !== 'N/A') && (
                                <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{leave.department}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-2 md:px-4 text-left">
                            <div className={`font-medium text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.title}</div>
                            {renderLeaveCategoryBadge(leave.leave_type, leave.is_half_day, leave.half_day_session, leave.od_purpose_category)}
                            {leave.alternate_faculty_name && (
                              <div className="text-[11px] text-muted-foreground mt-1">
                                Sub: <span className="font-medium text-foreground">{leave.alternate_faculty_name}</span> ({leave.alternate_duty_status})
                              </div>
                            )}
                            {leave.hod_approval_status === "APPROVED" && (
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium flex items-center gap-1">
                                <span>✓ Endorsed by HOD{leave.hod_reviewed_by_name ? ` (${leave.hod_reviewed_by_name})` : ''}</span>
                              </div>
                            )}
                            {leave.intermediate_approval_status === "APPROVED" && (
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium flex items-center gap-1">
                                <span>✓ Endorsed by Section Head{leave.intermediate_reviewed_by_name ? ` (${leave.intermediate_reviewed_by_name})` : ''}</span>
                              </div>
                            )}
                          </td>
                          <td className={`py-4 px-2 md:px-4 text-sm text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            <div>{formatDateString(leave.from)} {leave.from !== leave.to && <><span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span> {formatDateString(leave.to)}</>}</div>
                            {leave.start_time && leave.end_time && (
                              <div className="text-xs font-semibold text-primary mt-0.5">
                                {leave.start_time} - {leave.end_time}
                              </div>
                            )}
                          </td>

                          {/* Attachments Column */}
                          <td className="py-4 px-2 md:px-4 text-sm text-center">
                            {leave.initial_document_url || leave.completion_document_url ? (
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                {leave.initial_document_url && (
                                  <a
                                    href={leave.initial_document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors shrink-0 whitespace-nowrap"
                                    title="View Attached Order / Document Proof"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                    <span>Attachment</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </a>
                                )}
                                {leave.completion_document_url && (
                                  <a
                                    href={leave.completion_document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shrink-0 whitespace-nowrap"
                                    title="View Attendance Certificate"
                                  >
                                    <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Attendance Cert</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">—</span>
                            )}
                          </td>

                          <td className="py-4 px-2 md:px-4 text-sm text-center">
                            <button
                              onClick={() => setViewReason(leave.reason)}
                              className={`text-sm font-medium px-2.5 py-1 rounded-md transition border ${theme === 'dark'
                                  ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                  : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                                }`}
                            >
                              View
                            </button>
                          </td>
                          <td className="py-4 px-2 md:px-4 text-center">{getStatusBadge(leave.status, theme)}</td>
                          <td className="py-4 px-2 md:px-4 text-center">
                            {canTakeAction(leave) ?
                              <div className="flex flex-col md:flex-row justify-center gap-2">
                                <Button
                                  variant="outline"
                                  className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${theme === 'dark' ?
                                    'text-green-400 border-green-400 hover:bg-green-900/20' :
                                    'text-green-700 border-green-600 hover:bg-green-100'}`
                                  }
                                  onClick={() => handleApprove(leave.id)}
                                  disabled={loading}>

                                  <CheckCircle size={16} /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${theme === 'dark' ?
                                    'text-red-400 border-red-400 hover:bg-red-900/20' :
                                    'text-red-700 border-red-600 hover:bg-red-100'}`
                                  }
                                  onClick={() => handleReject(leave.id)}
                                  disabled={loading}>

                                  <XCircle size={16} /> Reject
                                </Button>
                              </div> :

                              <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                {getActionPendingLabel(leave) || "No action needed"}
                              </span>
                            }
                          </td>
                        </tr>
                      ) :

                      <tr>
                        <td colSpan={7} className="py-20 px-4">
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
          </div>
        </CardContent>

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
          )}
        </Card>

        {/* View Reason Dialog */}
        <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}>
            <DialogHeader>
              <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Reason</DialogTitle>
            </DialogHeader>

            <div
              className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>

              {viewReason}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className={theme === 'dark' ?
                  'text-foreground bg-card border border-border bg-primary hover:text-white hover:bg-primary/80' :
                  'border border-gray-300 hover:bg-gray-50 text bg-primary text-white hover:bg-primary/80 hover:text-white'}
                onClick={() => setViewReason(null)}>

                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>);

};

export default HODLeavesManagement;