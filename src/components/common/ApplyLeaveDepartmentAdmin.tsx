import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { PopoverTrigger, Popover, PopoverContent } from '../ui/popover';
import { CalendarIcon, Circle, CalendarCheck2, CalendarX2, Filter, Eye, Clock3, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { applyDepartmentAdminLeave, getDepartmentAdminApplyLeaveBootstrap } from '../../utils/admin_api';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonList } from '../ui/skeleton';
import { usePagination } from '../../hooks/useOptimizations';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Badge } from '../ui/badge';

const MySwal = withReactContent(Swal);

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

const getStatusStyles = (theme: string, status: string) => {
  const normalizedStatus = status.toUpperCase();

  const styles = {
    PENDING: {
      icon: <Clock3 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />,
      color: theme === 'dark' ? "text-yellow-400" : "text-yellow-600",
      bg: theme === 'dark' ? "bg-yellow-900/30" : "bg-yellow-100"
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

// Interface to match the original mock data structure
interface LeaveRequestDisplay {
  id: string;
  title: string;
  from?: string;
  to?: string;
  date?: string;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
}

const ApplyLeaveDepartmentAdmin = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const [branches, setBranches] = useState<{ id: number; name: string; }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const pagination = usePagination({
    queryKey: ['department-adminLeaves'],
    pageSize: 10
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const today = new Date();
  const [leaveList, setLeaveList] = useState<LeaveRequestDisplay[]>([]);

  // Fetch branches and leave history
  useEffect(() => {
    setLoading(true);
    let qs = `?page=${pagination.page}&page_size=${pagination.pageSize}`;
    if (filterStatus !== 'All') {
      qs += `&status=${filterStatus}`;
    }
    getDepartmentAdminApplyLeaveBootstrap(qs).
      then((res) => {
        if (res.success && res.data) {
          const { leave_requests, branches } = res.data;

          // Set branches only once or update if needed
          if (branches) {
            setBranches(branches);
            if (branches.length > 0 && !selectedBranch) setSelectedBranch(branches[0].id.toString());
          }

          // Transform backend data to match original mock structure
          const transformedLeaves: LeaveRequestDisplay[] = leave_requests.map((leave: any) => {
            const mappedStatus = (leave.status === 'PENDING' ? 'Pending' :
              leave.status === 'APPROVED' ? 'Approved' :
                leave.status === 'REJECTED' ? 'Rejected' : 'Pending') as LeaveStatus;

            return {
              id: leave.id,
              title: leave.title || `Leave Request ${leave.id}`,
              from: leave.start_date,
              to: leave.end_date,
              reason: leave.reason,
              status: mappedStatus,
              appliedOn: leave.applied_on
            };
          });
          setLeaveList(transformedLeaves);
          pagination.updatePagination(res);
        } else {
          setError(res.message || 'Failed to load data');
        }
      }).
      catch(() => setError('Failed to load data')).
      finally(() => setLoading(false));
  }, [pagination.page, pagination.pageSize, filterStatus]);

  // Derived filtered list for UI
  const filteredLeaveList = leaveList;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dateRange?.from || !dateRange?.to || !reason.trim()) {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Missing Information',
        text: 'Please provide a valid title, date range, and reason.',
        icon: 'warning',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
      return;
    }

    setError(null);

    const startDateStr = format(dateRange.from, "yyyy-MM-dd");
    const endDateStr = format(dateRange.to, "yyyy-MM-dd");

    // Check for overlaps in local state (excluding Rejected leaves)
    const hasOverlap = leaveList.some((l) => {
      if (l.status === 'Rejected') return false;
      // Handle both formats (from/to and date string)
      const lStart = l.from || l.date?.split(' to ')[0];
      const lEnd = l.to || l.date?.split(' to ')[1] || l.date;
      if (!lStart || !lEnd) return false;
      return startDateStr <= lEnd && endDateStr >= lStart;
    });

    if (hasOverlap) {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Date Overlap',
        text: 'You already have a leave request that overlaps with these dates.',
        icon: 'warning',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
      return;
    }

    const requestData = {
      title: title.trim(),
      start_date: startDateStr,
      end_date: endDateStr,
      reason: reason.trim()
    };

    // Debug log

    try {
      setSubmitting(true);
      const res = await applyDepartmentAdminLeave(requestData);

      if (res.success) {
        // Show success alert with theme-aware styling
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
        setTitle("");
        setDateRange(undefined);
        setReason("");

        // Optimistically update the leave list instead of making another API call
        const selectedBranchName = branches.find((b) => b.id.toString() === selectedBranch)?.name || 'Unknown Branch';
        const newLeave: LeaveRequestDisplay = {
          id: `temp-${Date.now()}`, // Temporary ID
          title: title.trim(),
          from: format(dateRange.from, "yyyy-MM-dd"),
          to: format(dateRange.to, "yyyy-MM-dd"),
          reason: reason.trim(),
          status: 'Pending',
          appliedOn: new Date().toLocaleString()
        };
        setLeaveList((prev) => [newLeave, ...prev]);
      } else {
        throw new Error(res.message || 'Failed to apply for leave');
      }
    } catch (error) {

      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");

      // Show error alert with theme-aware styling
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

      await MySwal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    if (newDateRange && newDateRange.from && !newDateRange.to) {
      // If only start date is selected, set end date to be the same (single-day leave)
      setDateRange({ from: newDateRange.from, to: newDateRange.from });
    } else {
      setDateRange(newDateRange);
    }
  };

  const renderStatus = (status: LeaveStatus) => {
    const styles = getStatusStyles(theme, status);
    return (
      <Badge
        className={`text-[12px] sm:text-xs font-medium px-2 py-0.5 rounded-full border-none flex items-center gap-2 w-fit ${styles.bg} ${styles.color}`}>
        <div className="flex items-center gap-1">
          {styles.icon}
          {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
        </div>
      </Badge>
    );
  };

  return (
    <div ref={ref}>
      {/* Main Container with Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-6 lg:gap-8">
        {/* Leave Application Form - Left Side */}
        <Card id="apply-leave-form-card" className={`flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} rounded-lg`}>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className={`sm:text-2xl text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
                <p className={`text-sm mt-1 font-normal ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Your leave request will be routed to the <span className="font-semibold text-primary">{props.routedTo || "Dean"}</span> for approval.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 pt-4">


            {/* Title */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label htmlFor="title" className={`text-md sm:text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title <span className="text-red-500">*</span></Label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter leave request title"
                className={`w-full text-xs sm:text-sm h-8 sm:h-9 lg:h-10 px-3 rounded-md border ${theme === 'dark' ? 'bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]' : 'bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]'}`}
                required />

            </div>

            {/* Date Range */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date Range <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal text-xs sm:text-sm h-8 sm:h-9 lg:h-10 ${theme === 'dark' ? 'bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}`}>

                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ?
                      dateRange.from.getTime() === dateRange.to?.getTime() ?
                        // Single date (same from and to)
                        format(dateRange.from, "PPP") :
                        dateRange.to ?
                          // Date range
                          <>
                            {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                          </> :

                          // Only from date selected
                          format(dateRange.from, "PPP") :


                      <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Pick a date range</span>
                    }
                  </Button>
                </PopoverTrigger>

                {/* Calendar with theme support */}
                <PopoverContent className={theme === 'dark' ? 'w-auto p-0 bg-background text-foreground border-border shadow-lg' : 'w-auto p-0 bg-white text-gray-900 border-gray-200 shadow-lg'}>
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    disabled={(date) => date < today}
                    initialFocus
                    className={theme === 'dark' ? 'rounded-md bg-background text-foreground [&_.rdp-day:hover]:bg-accent [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed' : 'rounded-md bg-white text-gray-900 [&_.rdp-day:hover]:bg-gray-100 [&_.rdp-day_selected]:bg-blue-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed'} />

                </PopoverContent>
              </Popover>
            </div>

            {/* Reason */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label htmlFor="reason" className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason <span className="text-red-500">*</span></Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your leave request"
                className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] text-xs sm:text-sm ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}
                required />

            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              onClick={handleSubmit}
              className={`w-full text-md h-8 sm:h-9 lg:h-10 ${theme === 'dark' ? 'text-white bg-primary hover:bg-primary/90 border-primary' : 'text-white bg-primary hover:bg-primary/90 border-primary'}`}
              disabled={submitting}>

              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Leave Requests List - Right Side */}
        <Card id="recent-leaves-card" className={`flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} rounded-lg`}>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-row items-center justify-between gap-4 w-full">
              <div>
                <CardTitle className={`sm:text-2xl text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Recent Leave Applications
                </CardTitle>
                <p className={`text-sm mt-1 font-normal ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and track your leave requests</p>
              </div>

              {/* Filter Button */}
              <div className="flex-shrink-0 mt-2 sm:mt-0">
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md h-9 w-9 sm:h-9 sm:w-auto sm:px-3 whitespace-nowrap rounded-lg"
                    >
                      <Filter className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1.5 text-sm">Filter</span>
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className={`w-40 sm:w-48 p-2 sm:p-3 lg:p-4 ${theme === 'dark' ?
                    'bg-card text-foreground border-border' :
                    'bg-white text-gray-900 border-gray-200'}`
                  }>
                    <div className="space-y-1 sm:space-y-2">
                      <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Filter Status</p>
                      {['All', 'Pending', 'Approved', 'Rejected'].map((status) =>
                        <Button
                          key={status}
                          variant={filterStatus === status ? "default" : "ghost"}
                          className={`w-full justify-start text-xs h-8 px-2 transition-all duration-200 ${filterStatus === status ?
                            'bg-primary text-white hover:bg-primary/90' :
                            'hover:bg-primary/10 hover:text-primary'}`
                          }
                          onClick={() => {
                            setFilterStatus(status as any);
                            setFilterOpen(false);
                          }}>

                          {status}
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 pt-6 sm:pt-6 max-h-[500px] overflow-y-auto custom-scrollbar">
            <div className="overflow-x-auto thin-scrollbar">
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-3">
                {loading ? (
                  <SkeletonList count={3} />
                ) : filteredLeaveList.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                    <div className={`p-3 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                      <CalendarCheck2 className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No applications</h3>
                    <p className={`text-xs text-center max-w-[250px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      You haven't submitted any leave requests recently.
                    </p>
                  </div>
                ) : (
                  filteredLeaveList.map((leave) => (
                    <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{leave.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {leave.from && leave.to ? `${leave.from} to ${leave.to}` : leave.date}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {renderStatus(leave.status)}
                        </div>
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => setViewReason(leave.reason)}
                          className={`w-full text-center text-sm font-semibold py-2 px-4 rounded-lg transition border ${theme === 'dark'
                              ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                              : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100'
                            }`}
                        >
                          View Reason
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop / Tablet: table */}
              <table className="hidden md:table w-full text-sm text-left border-collapse">
                <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                  <tr>
                    <th className={`py-2 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title</th>
                    <th className={`py-2 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</th>
                    <th className={`py-2 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                    <th className={`py-2 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-4">
                        <SkeletonList count={3} />
                      </td>
                    </tr>
                  ) : filteredLeaveList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 px-4">
                        <div className="flex flex-col items-center justify-center">
                          <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                            <CalendarCheck2 className="w-10 h-10 text-primary opacity-50" />
                          </div>
                          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No applications found</h3>
                          <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            {filterStatus === 'All'
                              ? 'Your leave history is currently empty. Any applications you submit will appear here.'
                              : `There are no ${filterStatus.toLowerCase()} requests matching your filter.`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeaveList.map((leave) => (
                      <tr
                        key={leave.id}
                        className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className={`py-3 px-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.title}</td>
                        <td className={`py-3 px-4 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {leave.from && leave.to ? `${leave.from} to ${leave.to}` : leave.date}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewReason(leave.reason)}
                            className={`h-8 px-2 text-[13px] sm:text-sm ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </td>
                        <td className="py-3 px-4">
                          {renderStatus(leave.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          {pagination.paginationState.totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing {pagination.paginationState.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.paginationState.totalItems)} of {pagination.paginationState.totalItems} requests
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.goToPage(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1 || loading}
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
                  onClick={() => pagination.goToPage(Math.min(pagination.paginationState.totalPages, pagination.page + 1))}
                  disabled={pagination.page >= pagination.paginationState.totalPages || loading}
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
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Leave Reason</DialogTitle>
          </DialogHeader>

          {/* Scrollable reason */}
          <div
            className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words
                    max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            {viewReason}
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setViewReason(null)}
              className={theme === 'dark' ?
                'text-white bg-primary border border-primary hover:bg-primary/70 hover:text-white' :
                'text-white bg-primary border border-primary hover:bg-primary/90 hover:text-white'}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

});

export default ApplyLeaveDepartmentAdmin;
