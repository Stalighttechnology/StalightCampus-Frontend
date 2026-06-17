import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { PopoverTrigger, Popover, PopoverContent } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { applyLeave, getApplyLeaveBootstrap } from '../../utils/faculty_api';
import { useTheme } from '@/context/ThemeContext';
import { SkeletonList } from '@/components/ui/skeleton';
import { usePagination } from '@/hooks/useOptimizations';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Circle, CalendarCheck2, CalendarX2, Filter } from 'lucide-react';

const MySwal = withReactContent(Swal);

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

const statusStyles = {
  Pending: 'text-yellow-700 bg-yellow-100',
  Approved: 'text-green-700 bg-green-100',
  Rejected: 'text-red-700 bg-red-100'
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

const LeaveRequests = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const [branches, setBranches] = useState<{ id: number; name: string; }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const pagination = usePagination({
    queryKey: ['facultyLeaves'],
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
    getApplyLeaveBootstrap({ page: pagination.page, page_size: pagination.pageSize }).
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
  }, [pagination.page, pagination.pageSize]);

  // Derived filtered list for UI
  const filteredLeaveList = filterStatus === 'All' ?
    leaveList :
    leaveList.filter((leave) => leave.status === filterStatus);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !selectedBranch || !dateRange?.from || !dateRange?.to || !reason.trim()) {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      await MySwal.fire({
        title: 'Missing Information',
        text: 'Please provide a valid title, branch, date range, and reason.',
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
      branch_ids: [parseInt(selectedBranch)],
      start_date: startDateStr,
      end_date: endDateStr,
      reason: reason.trim()
    };

    // Debug log

    try {
      setSubmitting(true);
      const res = await applyLeave(requestData);

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
    const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const bgClass = status === 'Approved' ? 'text-green-700 bg-green-100' :
      status === 'Rejected' ? 'text-red-700 bg-red-100' :
        'text-yellow-700 bg-yellow-100';

    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full inline-block whitespace-nowrap ${bgClass}`}>
        {displayStatus}
      </span>
    );
  };

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .apply-leave-card { border-radius: 12px !important; }
          .apply-leave-title { font-size: 1.25rem !important; margin-bottom: 4px !important; }
          .apply-leave-desc { font-size: 0.8125rem !important; }
          .apply-leave-label { font-size: 0.875rem !important; font-weight: 600 !important; }
          .apply-leave-input { font-size: 14px !important; height: 44px !important; }
          .apply-leave-btn { height: 44px !important; font-size: 15px !important; font-weight: 600 !important; }
          .calendar-popover-content { 
            width: 92vw !important; 
            max-width: 340px !important; 
            padding: 0 !important; 
            margin: 0 auto !important;
            overflow: hidden !important;
          }
          .rdp { margin: 0 !important; width: 100% !important; }
          .rdp-months { width: 100% !important; }
          .rdp-month { width: 100% !important; }
          .rdp-table { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      <div ref={ref} className={` ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        {/* Main Container with Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leave Application Form - Left Side */}
          <Card id="apply-leave-form-card" className={`apply-leave-card flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
              <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`p-3 rounded-lg border text-xs sm:text-sm ${theme === 'dark' ? 'bg-blue-900/10 border-blue-800/50 text-blue-300' : 'bg-blue-50/50 border-blue-200 text-blue-800'}`}>
                Your leave request will be routed to your <span className="font-semibold text-primary">Head of Department (HOD)</span> for approval.
              </div>
              {/* Error Message */}
              {error && (
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {error}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title for Leave *</Label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your leave"
                  disabled={submitting}
                  className={`apply-leave-input ${theme === 'dark' ? 'w-full bg-background text-foreground border-border focus:ring-primary/30' : 'w-full bg-white text-gray-900 border-gray-300 focus:ring-primary/20'}`}
                  required />
              </div>

              {/* Branch Selection */}
              <div className="space-y-2">
                <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{translateTerminology("Branch")}</Label>
                <div
                  className={`apply-leave-input ${theme === 'dark' ? 'w-full bg-muted text-muted-foreground border-border flex items-center px-3 rounded-md border text-xs sm:text-sm h-8 sm:h-9 lg:h-10' : 'w-full bg-gray-100 text-gray-500 border-gray-300 flex items-center px-3 rounded-md border text-xs sm:text-sm h-8 sm:h-9 lg:h-10'}`}>
                  {branches.length > 0 ? (branches.find((b) => b.id.toString() === selectedBranch)?.name || branches[0].name) : "No branch assigned"}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date Range *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`apply-leave-input ${theme === 'dark' ? 'w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span className="truncate">
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                            </>
                          ) : (
                            format(dateRange.from, "PPP")
                          )
                        ) : (
                          <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Pick a date range</span>
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>

                  {/* Calendar with theme support and disabled past dates */}
                  <PopoverContent
                    className="calendar-popover-content w-auto p-0 bg-background text-foreground border-border shadow-xl"
                    align="center"
                    side="bottom"
                    sideOffset={4}
                  >
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
              <div className="space-y-2">
                <Label htmlFor="reason" className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason for Leave *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a detailed reason for your leave request"
                  className={`apply-leave-input ${theme === 'dark' ? 'min-h-[100px] bg-background text-foreground border-border focus:ring-primary/30' : 'min-h-[100px] bg-white text-gray-900 border-gray-300 focus:ring-primary/20'}`}
                  required
                  disabled={submitting} />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                onClick={handleSubmit}
                className={`apply-leave-btn ${theme === 'dark' ? 'w-full text-white bg-primary hover:bg-primary/90 border-border' : 'w-full text-white bg-primary hover:bg-primary/90 border-primary'}`}
                disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </CardContent>
          </Card>

          {/* Leave Requests List - Right Side */}
          <Card id="recent-leaves-card" className={`apply-leave-card flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
              <div className="flex flex-row items-start sm:items-center justify-between gap-4 w-full">
                <div className="flex flex-col gap-1">
                  <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    Recent Leave Applications
                  </CardTitle>
                  <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    View and track your leave requests
                  </p>
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

                    <PopoverContent
                      className={`w-40 sm:w-48 p-2 sm:p-3 lg:p-4 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}
                    >
                      <div className="space-y-1 sm:space-y-2">
                        <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          Filter Status
                        </p>
                        {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                          <Button
                            key={status}
                            variant={filterStatus === status ? "default" : "ghost"}
                            className={`w-full justify-start text-xs h-8 px-2 transition-all duration-200 ${filterStatus === status ? 'bg-primary text-white hover:bg-primary/90' : 'hover:bg-primary/10 hover:text-primary'}`}
                            onClick={() => {
                              setFilterStatus(status as any);
                              setFilterOpen(false);
                            }}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 pt-2 sm:pt-0 max-h-[500px] overflow-y-auto custom-scrollbar">
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
                            className={`w-full text-center text-sm font-medium py-2 px-4 rounded-lg transition border ${
                              theme === 'dark'
                                ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
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
                              size="sm"
                              variant="outline"
                              className={`${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                              onClick={() => setViewReason(leave.reason)}>
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
      </div>
    </>);

});

export default LeaveRequests;