import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { PopoverTrigger, Popover, PopoverContent } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { useTheme } from '@/context/ThemeContext';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Circle, CalendarCheck2, CalendarX2, Filter } from 'lucide-react';
import { API_ENDPOINT } from '@/utils/config';
import { fetchWithTokenRefresh } from '@/utils/authService';
import { SkeletonList } from '../ui/skeleton';
import { toast } from 'sonner';

const MySwal = withReactContent(Swal);

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

const statusStyles = {
  Pending: 'text-yellow-700 bg-yellow-100',
  Approved: 'text-green-700 bg-green-100',
  Rejected: 'text-red-700 bg-red-100'
};

// Interface to match the backend data structure
interface LeaveRequestDisplay {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  applied_on: string;
}

const COEApplyLeave = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [title, setTitle] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');
  const [leaveList, setLeaveList] = useState<LeaveRequestDisplay[]>([]);
  const [filteredLeaveList, setFilteredLeaveList] = useState<LeaveRequestDisplay[]>([]);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useTheme();
  const today = new Date();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0, has_next: false, has_previous: false });
  const itemsPerPage = 10;

  // Fetch leave history on mount
  useEffect(() => {
    fetchLeaveRequests(1);
  }, []);

  const fetchLeaveRequests = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/leaves/?page=${page}&page_size=${itemsPerPage}`, {
        method: 'GET'
      });

      const data = await response.json();
      let leaveData = null;
      let meta = { page, total_pages: 1, total: 0, has_next: false, has_previous: false };

      if (data.success && data.data && Array.isArray(data.data.results)) {
        leaveData = data.data.results;
        meta = {
          page: data.data.page || page,
          total_pages: data.data.total_pages || Math.ceil((data.data.count || 0) / itemsPerPage),
          total: data.data.count || 0,
          has_next: !!data.data.next,
          has_previous: !!data.data.previous
        };
      } else if (data.success && Array.isArray(data.data)) {
        leaveData = data.data;
        meta = {
          page: data.current_page || page,
          total_pages: data.total_pages || Math.ceil((data.count || leaveData.length) / itemsPerPage),
          total: data.count || leaveData.length,
          has_next: !!data.next,
          has_previous: !!data.previous
        };
      } else if (data.results && Array.isArray(data.results)) {
        leaveData = data.results;
        meta = {
          page: page,
          total_pages: Math.ceil((data.count || leaveData.length) / itemsPerPage),
          total: data.count || leaveData.length,
          has_next: !!data.next,
          has_previous: !!data.previous
        };
      } else if (Array.isArray(data)) {
        leaveData = data;
      }

      if (leaveData) {
        const transformedLeaves: LeaveRequestDisplay[] = leaveData.map((leave: any) => {
          const mappedStatus = (leave.status === 'PENDING' ? 'Pending' :
          leave.status === 'APPROVED' ? 'Approved' :
          leave.status === 'REJECTED' ? 'Rejected' : 'Pending') as 'Pending' | 'Approved' | 'Rejected';

          return {
            id: leave.id,
            title: leave.title || `Leave Request ${leave.id}`,
            start_date: leave.start_date,
            end_date: leave.end_date,
            reason: leave.reason,
            status: mappedStatus,
            applied_on: leave.applied_on
          };
        });
        setLeaveList(transformedLeaves);
        setPagination(meta);
        setCurrentPage(page);
      } else {
        toast.error('Failed to load leave requests');
      }
    } catch (error) {

      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Update filtered leave list when leave list or filter changes
  useEffect(() => {
    if (filterStatus === 'All') {
      setFilteredLeaveList(leaveList);
    } else {
      setFilteredLeaveList(leaveList.filter((leave) => leave.status === filterStatus));
    }
  }, [leaveList, filterStatus]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dateRange?.from || !dateRange?.to || !reason.trim()) {
      toast.error("Please provide a valid title, date range and reason.");
      return;
    }

    const startDateStr = format(dateRange.from, "yyyy-MM-dd");
    const endDateStr = format(dateRange.to, "yyyy-MM-dd");

    // Check for overlaps in local state (excluding Rejected leaves)
    const hasOverlap = leaveList.some((l) => {
      if (l.status === 'Rejected') return false;
      return startDateStr <= l.end_date && endDateStr >= l.start_date;
    });

    if (hasOverlap) {
      toast.error("You already have a leave request that overlaps with these dates.");
      return;
    }

    const requestData = {
      title: title.trim(),
      start_date: startDateStr,
      end_date: endDateStr,
      reason: reason.trim()
    };



    try {
      setSubmitting(true);
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/leaves/apply/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const res = await response.json();

      if (res.success) {
        // Show success alert with theme-aware styling
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

        await MySwal.fire({
          title: 'Leave Request Submitted!',
          text: 'Your leave request has been successfully submitted to the dean.',
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
        const now = new Date();
        const newLeave: LeaveRequestDisplay = {
          id: `temp-${Date.now()}`, // Temporary ID
          title: title.trim(),
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: format(dateRange.to, "yyyy-MM-dd"),
          reason: reason.trim(),
          status: 'Pending',
          applied_on: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}, ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`
        };
        setLeaveList((prev) => [newLeave, ...prev]);
      } else {
        throw new Error(res.message || 'Failed to apply for leave');
      }
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";

      // Show error alert with theme-aware styling
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
    <div ref={ref} id="coe-apply-leave-container" className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Main Container with Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Leave Application Form - Left Side */}
        <Card id="coe-leave-application-form" className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} rounded-lg`}>
          <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
            <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
            <div className={`p-3 rounded-lg border text-sm sm:text-sm ${theme === 'dark' ? 'bg-blue-900/10 border-blue-800/50 text-blue-300' : 'bg-blue-50/50 border-blue-200 text-blue-800'}`}>
              Your leave request will be routed to the <span className="font-semibold text-primary">Dean</span> for approval.
            </div>
            {/* Title */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label htmlFor="title" className={`text-base sm:text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title <span className="text-red-500">*</span></Label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter leave request title"
                className={`w-full text-base sm:text-sm h-12 sm:h-10 px-3 rounded-md border ${theme === 'dark' ? 'bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]' : 'bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]'}`}
                required />
              
            </div>

            {/* Date Range */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label className={`text-base sm:text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date Range <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal text-base sm:text-sm h-12 sm:h-10 ${theme === 'dark' ? 'bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}`}>
                    
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
              <Label htmlFor="reason" className={`text-base sm:text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason <span className="text-red-500">*</span></Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your leave request"
                className={`min-h-[100px] lg:min-h-[120px] text-base sm:text-sm ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}
                required />
              
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              onClick={handleSubmit}
              className={`w-full text-base sm:text-sm h-12 sm:h-10 font-semibold ${theme === 'dark' ? 'text-white bg-primary hover:bg-primary/90 border-primary shadow-md' : 'text-white bg-primary hover:bg-primary/90 border-primary shadow-md'}`}
              disabled={submitting}>
              
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Leave Requests List - Right Side */}
        <Card id="coe-recent-leave-applications" className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} rounded-lg`}>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 lg:p-6 border-b h-14 sm:h-16 lg:h-20">
            <div>
              <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Recent Leave Applications</CardTitle>
              <p className={`text-sm hidden sm:block ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and track your leave requests</p>
            </div>

            {/* Filter Button */}
            <div className="flex-shrink-0">
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md text-base sm:text-sm h-10 sm:h-9 px-3 sm:px-4 whitespace-nowrap">
                    
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filter</span>
                  </Button>
                </PopoverTrigger>

                <PopoverContent className={`w-40 sm:w-48 p-2 sm:p-3 lg:p-4 ${theme === 'dark' ?
                'bg-card text-foreground border-border' :
                'bg-white text-gray-900 border-gray-200'}`
                }>
                  <div className="space-y-2">

                    {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) =>
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status);
                        setFilterOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-xs sm:text-sm hover:bg-accent transition-colors ${filterStatus === status ?
                      theme === 'dark' ?
                      'bg-accent text-accent-foreground' :
                      'bg-gray-100 text-gray-900' :
                      theme === 'dark' ?
                      'text-foreground' :
                      'text-gray-700'}`
                      }>
                      
                        {status}
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

          </CardHeader>
          <CardContent className="flex-1 p-4 pt-4 sm:pt-1 max-h-[500px] overflow-y-auto custom-scrollbar">
            {loading ?
            <div className="space-y-4">
                <SkeletonList items={5} />
              </div> :
            filteredLeaveList.length === 0 ?
            <div className="py-24 flex flex-col items-center justify-center text-center">
                <div className={`p-8 rounded-full bg-primary/20 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} mb-6 shadow-sm`}>
                  <CalendarIcon className="h-14 w-14 text-primary/30" />
                </div>
                <h3 className={`text-xl font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  No applications
                </h3>
                <p className={`text-sm mt-2 max-w-xs mx-auto leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {filterStatus === 'All' ?
                "You haven't submitted any leave requests recently." :
                `There are no ${filterStatus.toLowerCase()} requests matching your filter.`}
                </p>
              </div> :

            <div className="overflow-x-auto thin-scrollbar">
                {/* Mobile View: Cards */}
                <div className="sm:hidden space-y-3 max-h-[500px] overflow-y-auto thin-scrollbar">
                  {filteredLeaveList.map((leave) => (
                    <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{leave.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {leave.start_date} to {leave.end_date}
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
                  ))}
                </div>

                {/* Tablet/Desktop View: Table */}
                <table className="hidden sm:table w-full text-sm text-left border-collapse">
                  <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                    <tr>
                      <th className={`py-2 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title</th>
                      <th className={`py-2 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</th>
                      <th className={`py-2 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                      <th className={`py-2 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaveList.map((leave) => (
                      <tr
                        key={leave.id}
                        className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className={`py-3 px-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.title}</td>
                        <td className={`py-3 px-4 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {leave.start_date} to {leave.end_date}
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
                    ))}
                  </tbody>
                </table>
              </div>
            }

          </CardContent>

          {/* Pagination Controls */}
          {!loading && filteredLeaveList.length > 0 && pagination.total_pages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <span>
                Showing {(pagination.page - 1) * itemsPerPage + 1} to {Math.min(pagination.page * itemsPerPage, pagination.total)} of {pagination.total} requests
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  onClick={() => fetchLeaveRequests(pagination.page - 1)}
                  disabled={!pagination.has_previous}
                >
                  Prev
                </Button>
                <span className="px-3 text-base sm:text-sm font-semibold text-primary">
                  {pagination.page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  onClick={() => fetchLeaveRequests(pagination.page + 1)}
                  disabled={!pagination.has_next}
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6 shadow-2xl`}>
          <DialogHeader>
            <DialogTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Reason</DialogTitle>
          </DialogHeader>

          <div
            className={`p-4 text-base leading-relaxed whitespace-pre-wrap break-words mt-4
                      max-h-72 overflow-y-auto rounded-xl ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
            
            {viewReason}
          </div>

          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              className={theme === 'dark' ?
              'bg-primary text-white border border-primary hover:bg-primary/90 hover:text-white rounded-xl px-6' :
              'bg-primary text-white border border-primary hover:bg-primary/90 hover:text-white rounded-xl px-6'}
              onClick={() => setViewReason(null)}>
              
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

});

COEApplyLeave.displayName = 'COEApplyLeave';

export default COEApplyLeave;