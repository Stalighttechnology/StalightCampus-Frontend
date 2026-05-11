import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { PopoverTrigger, Popover, PopoverContent } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
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
  Rejected: 'text-red-700 bg-red-100',
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
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const pagination = usePagination({
    queryKey: ['facultyLeaves'],
    pageSize: 10,
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
    getApplyLeaveBootstrap({ page: pagination.page, page_size: pagination.pageSize })
      .then((res) => {
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
              appliedOn: leave.applied_on,
            };
          });
          setLeaveList(transformedLeaves);
          pagination.updatePagination(res);
        } else {
          setError(res.message || 'Failed to load data');
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.pageSize]);

  // Derived filtered list for UI
  const filteredLeaveList = filterStatus === 'All'
    ? leaveList
    : leaveList.filter(leave => leave.status === filterStatus);

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
        color: currentTheme === 'dark' ? '#ffffff' : '#000000',
      });
      return;
    }

    setError(null);

    const startDateStr = format(dateRange.from, "yyyy-MM-dd");
    const endDateStr = format(dateRange.to, "yyyy-MM-dd");

    // Check for overlaps in local state (excluding Rejected leaves)
    const hasOverlap = leaveList.some(l => {
      if (l.status === 'Rejected') return false;
      // Handle both formats (from/to and date string)
      const lStart = l.from || (l.date?.split(' to ')[0]);
      const lEnd = l.to || (l.date?.split(' to ')[1] || l.date);
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
        color: currentTheme === 'dark' ? '#ffffff' : '#000000',
      });
      return;
    }

    const requestData = {
      title: title.trim(),
      branch_ids: [parseInt(selectedBranch)],
      start_date: startDateStr,
      end_date: endDateStr,
      reason: reason.trim(),
    };

    console.log("Submitting leave request with data:", requestData); // Debug log

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
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
        });

        // Reset form
        setTitle("");
        setDateRange(undefined);
        setReason("");

        // Optimistically update the leave list instead of making another API call
        const selectedBranchName = branches.find(b => b.id.toString() === selectedBranch)?.name || 'Unknown Branch';
        const newLeave: LeaveRequestDisplay = {
          id: `temp-${Date.now()}`, // Temporary ID
          title: title.trim(),
          from: format(dateRange.from, "yyyy-MM-dd"),
          to: format(dateRange.to, "yyyy-MM-dd"),
          reason: reason.trim(),
          status: 'Pending',
          appliedOn: new Date().toLocaleString(),
        };
        setLeaveList(prev => [newLeave, ...prev]);
      } else {
        throw new Error(res.message || 'Failed to apply for leave');
      }
    } catch (error) {
      console.error("Failed to submit leave request:", error);
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
        color: currentTheme === 'dark' ? '#ffffff' : '#000000',
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
    console.log('Rendering status:', status);
    const baseClass = 'flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-semibold whitespace-nowrap uppercase tracking-tight';
    switch (status) {
      case 'Pending':
        return (
          <div className={`${baseClass} ${theme === 'dark' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-yellow-100 text-yellow-800'}`}>
            <Circle className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${theme === 'dark' ? 'text-yellow-500' : 'text-yellow-500'}`} fill="currentColor" />
            <span>Pending</span>
          </div>
        );
      case 'Approved':
        return (
          <div className={`${baseClass} ${theme === 'dark' ? 'bg-green-900/30 text-green-500' : 'bg-green-100 text-green-700'}`}>
            <CalendarCheck2 className={`w-3 h-3 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'}`} />
            <span>Approved</span>
          </div>
        );
      case 'Rejected':
        return (
          <div className={`${baseClass} ${theme === 'dark' ? 'bg-red-900/30 text-red-500' : 'bg-red-100 text-red-700'}`}>
            <CalendarX2 className={`w-3 h-3 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`} />
            <span>Rejected</span>
          </div>
        );
      default:
        console.log('Unknown status:', status);
        return (
          <div className={`${baseClass} ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
            <Circle className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`} fill="currentColor" />
            <span>{status || 'Unknown'}</span>
          </div>
        );
    }
  };

  return (
    <div ref={ref}>
      {/* Main Container with Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-6 lg:gap-8">
        {/* Leave Application Form - Left Side */}
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} rounded-lg`}>
          <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-4 lg:p-6 gap-1 sm:gap-2 min-h-fit">
            <CardTitle>Leave Application Form</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">


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
                required
              />
            </div>

            {/* Branch Selection */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger
                  className={`text-xs sm:text-sm h-8 sm:h-9 lg:h-10 ${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}
                >
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}>
                  {branches.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id.toString()}
                      className={`text-xs sm:text-sm ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'}`}
                    >
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal text-xs sm:text-sm h-8 sm:h-9 lg:h-10 ${theme === 'dark' ? 'bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.from.getTime() === dateRange.to?.getTime() ? (
                        // Single date (same from and to)
                        format(dateRange.from, "PPP")
                      ) : dateRange.to ? (
                        // Date range
                        <>
                          {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                        </>
                      ) : (
                        // Only from date selected
                        format(dateRange.from, "PPP")
                      )
                    ) : (
                      <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Pick a date range</span>
                    )}
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
                    className={theme === 'dark' ? 'rounded-md bg-background text-foreground [&_.rdp-day:hover]:bg-accent [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed' : 'rounded-md bg-white text-gray-900 [&_.rdp-day:hover]:bg-gray-100 [&_.rdp-day_selected]:bg-blue-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed'}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Reason */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label htmlFor="reason" className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your leave request"
                className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] text-xs sm:text-sm ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              onClick={handleSubmit}
              className={`w-full text-md h-8 sm:h-9 lg:h-10 ${theme === 'dark' ? 'text-white bg-primary hover:bg-primary/90 border-primary' : 'text-white bg-primary hover:bg-primary/90 border-primary'}`}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Leave Requests List - Right Side */}
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} rounded-lg`}>
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2">
            {/* Title */}
            <CardTitle
            >
              Leave Requests
            </CardTitle>

            {/* Filter Button */}
            <div className="flex-shrink-0">
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-0.5 sm:gap-1 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md text-xs sm:text-sm h-7 sm:h-8 lg:h-9 px-1.5 sm:px-2 lg:px-3 whitespace-nowrap"
                  >
                    <Filter className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                    <span className="hidden sm:inline">Filter</span>
                  </Button>
                </PopoverTrigger>

                <PopoverContent className={`w-40 sm:w-48 p-2 sm:p-3 lg:p-4 ${theme === 'dark'
                    ? 'bg-card text-foreground border-border'
                    : 'bg-white text-gray-900 border-gray-200'
                  }`}>
                  <div className="space-y-1 sm:space-y-2">
                    <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Filter Status</p>
                    {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                      <Button
                        key={status}
                        variant={filterStatus === status ? "default" : "ghost"}
                        className={`w-full justify-start text-xs h-8 px-2 transition-all duration-200 ${filterStatus === status
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : 'hover:bg-primary/10 hover:text-primary'
                          }`}
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

          </CardHeader>
          <CardContent className="p-2 sm:p-4 lg:p-6">
            {loading ? (
              <SkeletonList count={3} />
            ) : filteredLeaveList.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <CalendarCheck2 className="w-10 h-10" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {filterStatus === 'All' ? 'No Leave Requests' : `No ${filterStatus} Requests`}
                </h3>
                <p className={`text-sm max-w-[280px] mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {filterStatus === 'All'
                    ? "Your leave history is currently empty. Any applications you submit will appear here."
                    : `There are currently no ${filterStatus.toLowerCase()} requests matching your filter.`}
                </p>
              </div>
            ) : (
              <div className="max-h-[480px] sm:max-h-[480px] lg:max-h-[520px] overflow-y-auto custom-scrollbar space-y-4 sm:space-y-3 lg:space-y-4 pr-2">
                {filteredLeaveList.map((leave) => {
                  return (
                    <div key={leave.id} className={`p-4 sm:p-3 lg:p-4 border rounded-xl ${theme === 'dark' ? 'bg-background border-border hover:bg-accent/50' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} transition-all duration-200 shadow-sm hover:shadow-md`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <div>
                            <div className={`font-semibold mb-1 text-md sm:text-base ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              {leave.title}
                            </div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'} flex flex-col gap-1`}>
                              {leave.from && leave.to ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">From:</span> {leave.from} <span className="font-medium ml-1">To:</span> {leave.to}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Date:</span> {leave.date}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={`text-xs mt-1 font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            Applied: {leave.appliedOn}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex flex-col justify-between items-end gap-2">
                          <div className="flex-shrink-0">
                            {renderStatus(leave.status)}
                          </div>
                          <button
                            onClick={() => setViewReason(leave.reason)}
                            className={`text-xs px-2 py-1 rounded-md transition-all duration-200 ${theme === 'dark'
                                ? 'bg-muted/10 text-foreground border border-border hover:bg-muted/20'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
                              }`}
                          >
                            View Reason
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {pagination.paginationState.totalPages > 1 && (
                  <div className="flex flex-row items-center justify-between text-sm text-muted-foreground mt-6 pt-6 border-t border-border">
                    <div className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
                      Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.paginationState.totalItems)} to {Math.min(pagination.page * pagination.pageSize, pagination.paginationState.totalItems)} of {pagination.paginationState.totalItems}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pagination.goToPage(Math.max(1, pagination.page - 1))}
                        disabled={pagination.page === 1 || loading}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-3 sm:h-9 sm:px-4 transition-all shadow-md shadow-primary/20 text-xs sm:text-sm"
                      >
                        Previous
                      </Button>

                      <div className="flex items-center justify-center min-w-[1.5rem] sm:min-w-[2rem]">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {pagination.page}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pagination.goToPage(Math.min(pagination.paginationState.totalPages, pagination.page + 1))}
                        disabled={pagination.page >= pagination.paginationState.totalPages || loading}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-3 sm:h-9 sm:px-4 transition-all shadow-md shadow-primary/20 text-xs sm:text-sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
              className="bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-200 shadow-lg shadow-primary/20 px-6"
              onClick={() => setViewReason(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default LeaveRequests;