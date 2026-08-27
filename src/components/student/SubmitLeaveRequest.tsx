import { useState, useEffect, useMemo, useRef } from "react";
import { getInstitutionType, translateTerminology } from "@/utils/institutionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Calendar } from "../ui/calendar";
import { PopoverTrigger, Popover, PopoverContent } from "../ui/popover";
import { CalendarIcon, CheckCircle2, Clock3, XCircle, Eye, Filter, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { useStudentLeaveRequestMutation, useStudentLeaveRequestsQuery, useStudentProfileQuery, useStudentDashboardOverviewQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from "../ui/badge";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { SkeletonList } from '../ui/skeleton';


const MySwal = withReactContent(Swal);

type LeaveStatusType = "PENDING" | "APPROVED" | "REJECTED" | "FORWARDED_TO_HOD";

// Interface for leave requests from the dedicated API endpoint
interface LeaveRequest {
  id: number | string;
  start_date: string;
  end_date: string;
  title: string;
  reason: string;
  status: string; // API returns string values
  submitted_at?: string;
  reviewed_at?: string;
  proctor_remarks?: string;
  hod_remarks?: string;
  reviewed_by_name?: string | null;
  reviewed_by_role?: string | null;
  hod_reviewed_by_name?: string | null;
  forwarded_by_name?: string | null;
  forwarded_at?: string | null;
  hod_reviewed_at?: string | null;
}

const getReviewerDetails = (item: LeaveRequest) => {
  const statusUpper = (item.status || '').toUpperCase();
  const instType = getInstitutionType();
  const proctorLabel = instType === 'school' ? 'Class Teacher' : 'Proctor';

  if (statusUpper === 'APPROVED') {
    if (item.hod_reviewed_by_name) {
      return `Approved by HoD (${item.hod_reviewed_by_name})`;
    }
    if (item.reviewed_by_name) {
      const roleLabel = item.reviewed_by_role === 'hod' ? 'HoD' : proctorLabel;
      return `Approved by ${roleLabel} (${item.reviewed_by_name})`;
    }
    return `Approved`;
  }

  if (statusUpper === 'FORWARDED_TO_HOD') {
    if (item.forwarded_by_name) {
      return `Forwarded to HoD by ${proctorLabel} (${item.forwarded_by_name})`;
    }
    return `Forwarded to HoD (Pending HoD Review)`;
  }

  if (statusUpper === 'PENDING') {
    return `Pending ${proctorLabel} Review`;
  }

  return null;
};

const getRejectionReviewerTitle = (item: LeaveRequest) => {
  const instType = getInstitutionType();
  const proctorLabel = instType === 'school' ? 'Class Teacher' : 'Proctor';

  if (item.hod_reviewed_by_name) {
    return `Rejected by HoD (${item.hod_reviewed_by_name})`;
  }
  if (item.reviewed_by_name) {
    const roleLabel = item.reviewed_by_role === 'hod' ? 'HoD' : proctorLabel;
    return `Rejected by ${roleLabel} (${item.reviewed_by_name})`;
  }
  return 'Rejected';
};

const getStatusStyles = (theme: string, status: string) => {
  const normalizedStatus = status.toUpperCase() as LeaveStatusType;

  const styles = {
    PENDING: {
      icon: <Clock3 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />,
      color: theme === 'dark' ? "text-yellow-400" : "text-yellow-600",
      bg: theme === 'dark' ? "bg-yellow-900/30" : "bg-yellow-100"
    },
    FORWARDED_TO_HOD: {
      icon: <Clock3 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />,
      color: theme === 'dark' ? "text-blue-400" : "text-blue-600",
      bg: theme === 'dark' ? "bg-blue-900/30" : "bg-blue-100"
    },
    APPROVED: {
      icon: <CheckCircle2 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />,
      color: theme === 'dark' ? "text-green-400" : "text-green-600",
      bg: theme === 'dark' ? "bg-green-900/30" : "bg-green-100"
    },
    REJECTED: {
      icon: <XCircle className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />,
      color: theme === 'dark' ? "text-red-400" : "text-red-600",
      bg: theme === 'dark' ? "bg-red-900/30" : "bg-red-100"
    }
  };

  return styles[normalizedStatus] || styles.PENDING;
};

const SubmitLeaveRequest = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const leaveRequestMutation = useStudentLeaveRequestMutation();
  const today = new Date();
  const { toast } = useToast();

  const { data: leavesResponse, isLoading: leavesLoading, isError: leavesError, refetch: refetchLeaves, pagination } = useStudentLeaveRequestsQuery();
  const { data: profileResponse, isLoading: profileLoading } = useStudentProfileQuery();
  const { data: dashboardResponse, isLoading: dashboardLoading } = useStudentDashboardOverviewQuery();
  const [filter, setFilter] = useState<string>('ALL');
  const [query, setQuery] = useState<string>('');
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [viewRejection, setViewRejection] = useState<{ reviewer: string; reason: string } | null>(null);

  // Filter state for dropdown
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const filteredLeaves = useMemo(() => {
    const q = query.trim().toLowerCase();
    const currentLeaves = (leavesResponse?.data || []) as LeaveRequest[];
    return currentLeaves.filter((l) => {
      if (statusFilter !== "All" && l.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
      if (!q) return true;
      return l.reason.toLowerCase().includes(q) || l.start_date && l.start_date.includes(q) || l.end_date && l.end_date.includes(q);
    });
  }, [leavesResponse, statusFilter, query]);

  // Close filter dropdown when clicking outside
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

  // Resolve proctor info from leavesResponse, student full profile, or dashboard data
  const proctorProfile = profileResponse?.profile?.proctor || profileResponse?.proctor;
  const proctorFromProfileName = proctorProfile ? `${proctorProfile.first_name || ''} ${proctorProfile.last_name || ''}`.trim() || proctorProfile.username || proctorProfile.name : null;
  const proctorFromDashboardName = dashboardResponse?.data?.student_profile?.proctor?.name;
  const proctorName = leavesResponse?.proctor?.name || proctorFromDashboardName || proctorFromProfileName;
  const isProctorAssigned = Boolean(proctorName);
  const isDataLoading = leavesLoading && profileLoading && dashboardLoading;

  const instType = getInstitutionType();
  const proctorRoleLabel = instType === 'school' ? 'Class Teacher' : 'Faculty (Proctor)';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isProctorAssigned) {
      setError(`No ${proctorRoleLabel} is currently assigned to you. Leave requests cannot be submitted without an assigned ${proctorRoleLabel.toLowerCase()}. Please contact the administration.`);
      return;
    }
    if (!dateRange?.from || !title.trim() || !reason.trim()) {
      setError("Please provide a valid date, title, and reason.");
      return;
    }

    setError(null);

    const startDate = dateRange.from;
    const endDate = dateRange.to || dateRange.from;
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    // Check for overlaps in local state (excluding REJECTED leaves)
    const hasOverlap = (leavesResponse?.data || []).some((l) => {
      if (l.status === 'REJECTED') return false;
      return startDateStr <= l.end_date && endDateStr >= l.start_date;
    });

    if (hasOverlap) {
      setError("You already have a leave request that overlaps with these dates.");
      return;
    }

    const requestData = {
      start_date: startDateStr,
      end_date: endDateStr,
      title: title.trim() || '',
      reason: reason.trim()
    };

    try {
      await leaveRequestMutation.mutateAsync(requestData);
      refetchLeaves();

      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Leave Request Submitted!',
        text: 'Your leave request has been successfully submitted.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });

      // Reset form
      setDateRange(undefined);
      setTitle("");
      setReason("");

      // Scroll to the leave status list to show the newly created request
      const el = document.getElementById('leave-status-list');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      let errorMessage = "Something went wrong. Please try again.";
      if (error instanceof Error) {
        try {
          if (error.message.includes('body: {')) {
            const bodyString = error.message.split('body: ')[1];
            const bodyJson = JSON.parse(bodyString);
            if (bodyJson && bodyJson.message) {
              errorMessage = bodyJson.message;
            } else {
              errorMessage = error.message;
            }
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          errorMessage = error.message;
        }
      }

      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Main Container with Flex Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Application Form - Left Side */}
        <Card id="leave-form-card" className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3 lg:min-h-[115px] flex flex-col justify-center">
            <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {isProctorAssigned ? (
                <>
                  Your leave request will be routed to your {proctorRoleLabel}: <span className="font-semibold text-primary">{proctorName}</span> for approval.
                </>
              ) : isDataLoading ? (
                <span>Loading assignment details...</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  No {proctorRoleLabel} assigned. You cannot submit leave requests until a {proctorRoleLabel.toLowerCase()} is assigned.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Warning when no proctor is assigned */}
            {!isDataLoading && !isProctorAssigned && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${theme === 'dark' ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                <div className="text-xs sm:text-sm space-y-1">
                  <p className="font-semibold">No {proctorRoleLabel} Assigned</p>
                  <p className="leading-relaxed opacity-90">
                    A {proctorRoleLabel.toLowerCase()} must be assigned to your profile before you can submit leave applications. Please contact the college administration or your department to have your {proctorRoleLabel.toLowerCase()} assigned.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error &&
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {error}
                </div>
              }

              <div className="space-y-2">
                <Label htmlFor="title" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Title <span className="text-red-500">*</span></Label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  disabled={!isProctorAssigned || leaveRequestMutation.isPending}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief title for your leave request"
                  className={theme === 'dark' ? 'w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed' : 'w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'}
                  required />

              </div>

              <div className="space-y-2">
                <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Date Range <span className="text-red-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!isProctorAssigned || leaveRequestMutation.isPending}
                      className={theme === 'dark' ? 'w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'}>

                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ?
                        dateRange.to ?
                          <>
                            {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                          </> :

                          format(dateRange.from, "PPP") :


                        <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Pick a date or date range</span>
                      }
                    </Button>
                  </PopoverTrigger>

                  {/* Calendar with theme support */}
                  <PopoverContent className={theme === 'dark' ? 'w-auto p-0 bg-background text-foreground border-border shadow-lg' : 'w-auto p-0 bg-white text-gray-900 border-gray-200 shadow-lg'}>
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) => date < today} // Disable dates before today
                      initialFocus
                      className={theme === 'dark' ? 'rounded-md bg-background text-foreground [&_.rdp-day:hover]:bg-accent [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed' : 'rounded-md bg-white text-gray-900 [&_.rdp-day:hover]:bg-gray-100 [&_.rdp-day_selected]:bg-blue-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed'} />

                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  id="reason"
                  value={reason}
                  disabled={!isProctorAssigned || leaveRequestMutation.isPending}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a detailed reason for your leave request"
                  className={theme === 'dark' ? 'min-h-[100px] bg-background text-foreground border-border disabled:opacity-50 disabled:cursor-not-allowed' : 'min-h-[100px] bg-white text-gray-900 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'}
                  required />

              </div>

              <Button
                type="submit"
                className={theme === 'dark' ? 'w-full text-white bg-primary hover:bg-[#9147e0] border-border disabled:opacity-50 disabled:cursor-not-allowed' : 'w-full text-white bg-primary hover:bg-[#9147e0] border-primary disabled:opacity-50 disabled:cursor-not-allowed'}
                disabled={!isProctorAssigned || leaveRequestMutation.isPending}>

                {leaveRequestMutation.isPending ? "Submitting..." : isProctorAssigned ? "Submit Request" : `Disabled (${proctorRoleLabel} Not Assigned)`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Your Leave Requests - Right Side */}
        <Card id="leave-status-list" className={theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}>
          <CardHeader className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3 lg:min-h-[115px] flex flex-col justify-center">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Your Leave Requests</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">Track and manage your submitted leave requests and their approval status.</CardDescription>
              </div>
              <div className="relative mt-1" ref={filterRef}>
                <Button
                  size="sm"
                  onClick={() => setShowFilter(!showFilter)}
                  className="bg-primary text-white flex items-center justify-center h-9 w-9 sm:h-9 sm:w-auto sm:px-3 rounded-lg shadow-sm">

                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1.5 text-sm">Filter</span>
                </Button>
                {showFilter &&
                  <div className={`absolute right-0 mt-2 w-52 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-md shadow-lg z-10`}>
                    <div className="py-1">
                      {[
                        { key: 'All', label: 'All' },
                        { key: 'PENDING', label: 'Pending' },
                        { key: 'FORWARDED_TO_HOD', label: 'Forwarded to HoD' },
                        { key: 'APPROVED', label: 'Approved' },
                        { key: 'REJECTED', label: 'Rejected' },
                      ].map((item) =>
                        <button
                          key={item.key}
                          className={`block w-full text-left px-4 py-2 text-sm hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-100'} ${statusFilter === item.key ? theme === 'dark' ? 'bg-accent text-accent-foreground' : 'bg-gray-100 text-gray-900' : theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}
                          onClick={() => {
                            setStatusFilter(item.key);
                            setShowFilter(false);
                          }}>

                          {item.label}
                        </button>
                      )}
                    </div>
                  </div>
                }
              </div>
            </div>
          </CardHeader>

          <CardContent className="max-h-[500px] overflow-y-auto thin-scrollbar">
            {/* Error Message */}
            {leavesError &&
              <div className={`p-3 rounded-lg mb-4 shadow ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                An error occurred while fetching leave requests.
                <Button
                  variant="link"
                  className="p-0 ml-2"
                  onClick={() => refetchLeaves()}>
                  Try again
                </Button>
              </div>
            }

            {/* Loading State */}
            {leavesLoading ? (
              <SkeletonList items={3} />
            ) :
              filteredLeaves.length === 0 ?
                <div className="py-24 flex flex-col items-center justify-center text-center">
                  <div className={`p-8 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} mb-6 shadow-sm`}>
                    <CalendarIcon className="h-16 w-16 text-primary/30" />
                  </div>
                  <h3 className={`text-xl font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Leave Requests</h3>
                  <p className={`text-base mt-2 max-w-sm mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    You haven't submitted any leave requests yet. Your future requests will appear here.
                  </p>
                </div> :

                <div className="space-y-4">
                  {/* Mobile View: Stacked Cards */}
                  <div className="md:hidden space-y-3">
                    {filteredLeaves.map((item) => {
                      const rejectionReason = (item.hod_remarks || item.proctor_remarks || '').trim();
                      const reviewerLabel = getReviewerDetails(item);
                      const rejectionTitle = getRejectionReviewerTitle(item);

                      return (
                        <div key={item.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{item.title && item.title.trim() && item.title !== 'N/A' ? item.title : 'Untitled'}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {item.start_date && item.end_date ?
                                  `${format(parseISO(item.start_date), 'MMM dd')} - ${format(parseISO(item.end_date), 'MMM dd, yyyy')}` :
                                  'N/A'}
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <Badge
                                className={`text-[12px] sm:text-xs font-medium px-2 py-0.5 rounded-full border-none flex items-center gap-2 w-fit ${getStatusStyles(theme, item.status).bg} ${getStatusStyles(theme, item.status).color}`}>
                                <div className="flex items-center gap-1">
                                  {getStatusStyles(theme, item.status).icon}
                                  {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                                </div>
                              </Badge>
                              {reviewerLabel && (
                                <span className={`text-[11px] font-medium text-right max-w-[200px] break-words ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {reviewerLabel}
                                </span>
                              )}
                              {item.status === 'REJECTED' && rejectionReason && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewRejection({ reviewer: rejectionTitle, reason: rejectionReason })}
                                  className="h-6 px-2 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-0 font-medium"
                                >
                                  View Rejection Reason
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <button
                              onClick={() => setViewReason(item.reason)}
                              className={`w-full text-center text-sm font-medium py-2 px-4 rounded-lg transition border ${theme === 'dark'
                                  ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                  : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                                }`}
                            >
                              View Reason
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop / Tablet View: Table */}
                  <div className="hidden md:block w-full overflow-x-auto custom-scrollbar pb-2">
                    <Table>
                      <TableHeader>
                        <TableRow className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                          <TableHead className={`font-semibold text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title</TableHead>
                          <TableHead className={`font-semibold text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</TableHead>
                          <TableHead className={`font-semibold text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</TableHead>
                          <TableHead className={`font-semibold text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody >
                        {filteredLeaves.map((item) => {
                          const rejectionReason = (item.hod_remarks || item.proctor_remarks || '').trim();
                          const reviewerLabel = getReviewerDetails(item);
                          const rejectionTitle = getRejectionReviewerTitle(item);

                          return (
                            <TableRow key={item.id} className={theme === 'dark' ? 'border-border hover:bg-accent/50' : 'border-gray-200 hover:bg-gray-50'}>
                              <TableCell className={`font-medium text-[14px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                {item.title && item.title.trim() && item.title !== 'N/A' ? item.title : 'Untitled'}
                              </TableCell>
                              <TableCell className={`text-[14px] sm:text-sm whitespace-nowrap ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                                {item.start_date && item.end_date ?
                                  `${format(parseISO(item.start_date), 'MMM dd')} - ${format(parseISO(item.end_date), 'MMM dd, yyyy')}` :
                                  'N/A'}
                              </TableCell>
                              <TableCell className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewReason(item.reason)}
                                  className={`h-8 px-2 text-[13px] sm:text-sm ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-700'}`}>

                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                              <TableCell className="align-top py-3">
                                <div className="flex flex-col items-start gap-1">
                                  <Badge
                                    className={`text-[12px] sm:text-xs font-medium px-2 py-0.5 rounded-full border-none flex items-center gap-2 w-fit ${getStatusStyles(theme, item.status).bg} ${getStatusStyles(theme, item.status).color}`}>

                                    <div className="flex items-center gap-1">
                                      {getStatusStyles(theme, item.status).icon}
                                      {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                                    </div>
                                  </Badge>
                                  {reviewerLabel && (
                                    <span className={`text-[11px] font-medium mt-0.5 max-w-xs break-words ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {reviewerLabel}
                                    </span>
                                  )}
                                  {item.status === 'REJECTED' && rejectionReason && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setViewRejection({ reviewer: rejectionTitle, reason: rejectionReason })}
                                      className="h-6 px-1.5 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-0 font-medium"
                                    >
                                      View Reason
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
            }
          </CardContent>

          {pagination && pagination.totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing {Math.min((pagination.page - 1) * 10 + 1, pagination.totalItems)} to {Math.min(pagination.page * 10, pagination.totalItems)} of {pagination.totalItems} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevious}
                  onClick={() => pagination.prevPage()}
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
                  disabled={!pagination.hasNext}
                  onClick={() => pagination.nextPage()}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* View Reason Dialog */}
      <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-2xl p-4 sm:p-6`}>
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
              className="bg-primary"
              onClick={() => setViewReason(null)}>

              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Rejection Reason Dialog */}
      <Dialog open={!!viewRejection} onOpenChange={() => setViewRejection(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-2xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold flex items-center gap-2 text-red-600 dark:text-red-400`}>
              <XCircle className="w-5 h-5" />
              Rejection Reason
            </DialogTitle>
            {viewRejection?.reviewer && (
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {viewRejection.reviewer}
              </p>
            )}
          </DialogHeader>

          <div
            className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto rounded-md border ${theme === 'dark' ? 'bg-red-950/20 text-red-300 border-red-900/40' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {viewRejection?.reason}
          </div>

          <DialogFooter>
            <Button
              className="bg-primary"
              onClick={() => setViewRejection(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default SubmitLeaveRequest;