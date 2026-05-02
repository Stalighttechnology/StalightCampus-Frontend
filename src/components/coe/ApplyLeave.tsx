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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { useTheme } from '@/context/ThemeContext';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Circle, CalendarCheck2, CalendarX2, Filter } from 'lucide-react';
import { API_ENDPOINT } from '@/utils/config';
import { fetchWithTokenRefresh } from '@/utils/authService';

const MySwal = withReactContent(Swal);

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

const statusStyles = {
  Pending: 'text-yellow-700 bg-yellow-100',
  Approved: 'text-green-700 bg-green-100',
  Rejected: 'text-red-700 bg-red-100',
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
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const today = new Date();

  // Fetch leave history on mount
  useEffect(() => {
    setLoading(true);
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/leaves/`, {
        method: 'GET',
      });

      const data = await response.json();
      if (data.results && data.results.success && data.results.data) {
        // Handle paginated response - data.results.data contains the leave requests
        const leaveData = data.results.data;
        // Transform backend data to match component structure
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
            applied_on: leave.applied_on,
          };
        });
        setLeaveList(transformedLeaves);
        setError(null); // Clear any previous errors
      } else {
        setError('Failed to load leave requests');
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Update filtered leave list when leave list or filter changes
  useEffect(() => {
    if (filterStatus === 'All') {
      setFilteredLeaveList(leaveList);
    } else {
      setFilteredLeaveList(leaveList.filter(leave => leave.status === filterStatus));
    }
  }, [leaveList, filterStatus]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dateRange?.from || !dateRange?.to || !reason.trim()) {
      setError("Please provide a valid title, date range and reason.");
      return;
    }

    setError(null);

    const startDateStr = format(dateRange.from, "yyyy-MM-dd");
    const endDateStr = format(dateRange.to, "yyyy-MM-dd");

    // Check for overlaps in local state (excluding Rejected leaves)
    const hasOverlap = leaveList.some(l => {
      if (l.status === 'Rejected') return false;
      return startDateStr <= l.end_date && endDateStr >= l.start_date;
    });

    if (hasOverlap) {
      setError("You already have a leave request that overlaps with these dates.");
      return;
    }

    const requestData = {
      title: title.trim(),
      start_date: startDateStr,
      end_date: endDateStr,
      reason: reason.trim(),
    };

    console.log("Submitting COE leave request with data:", requestData);

    try {
      setSubmitting(true);
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/leaves/apply/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
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
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
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
          applied_on: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}, ${now.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true})}`,
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
    const baseClass = 'flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap';
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
    <div ref={ref} className={`p-2 sm:p-4 lg:p-6 min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <h2 className={`text-lg sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 lg:mb-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Apply Leave</h2>

      {/* Main Container with Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Leave Application Form - Left Side */}
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} rounded-lg`}>
          <CardHeader className="flex items-start justify-start p-2 sm:p-4 lg:p-6 gap-1 sm:gap-2">
            <CardTitle className={`text-sm sm:text-base lg:text-lg font-semibold text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Error Message */}
            {error && (
              <div className={`p-1.5 sm:p-2 lg:p-3 rounded-lg text-xs sm:text-sm ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label htmlFor="title" className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title <span className="text-red-500">*</span></Label>
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

            {/* Date Range */}
            <div className="space-y-0.5 sm:space-y-1 lg:space-y-2">
              <Label className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date Range <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="reason" className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason <span className="text-red-500">*</span></Label>
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
              className={`w-full text-xs sm:text-sm h-8 sm:h-9 lg:h-10 ${theme === 'dark' ? 'text-white bg-primary hover:bg-primary/90 border-primary' : 'text-white bg-primary hover:bg-primary/90 border-primary'}`}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Leave Requests List - Right Side */}
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} rounded-lg`}>
          <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-4 lg:p-6 gap-1 sm:gap-2 min-h-fit">
            {/* Title */}
            <CardTitle
              className={`text-sm sm:text-base lg:text-lg font-semibold flex-1 min-w-0 truncate ${
                theme === 'dark' ? 'text-foreground' : 'text-gray-900'
              }`}
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

                <PopoverContent className={`w-40 sm:w-48 p-2 sm:p-3 lg:p-4 ${
                  theme === 'dark'
                    ? 'bg-card text-foreground border-border'
                    : 'bg-white text-gray-900 border-gray-200'
                }`}>
                  <div className="space-y-2">
                    
                    {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setFilterStatus(status);
                          setFilterOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs sm:text-sm hover:bg-accent transition-colors ${
                          filterStatus === status
                            ? theme === 'dark'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-gray-100 text-gray-900'
                            : theme === 'dark'
                            ? 'text-foreground'
                            : 'text-gray-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

          </CardHeader>
          <CardContent className="p-2 sm:p-4 lg:p-6">
            {loading ? (
              <div className={`text-center text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Loading...</div>
            ) : filteredLeaveList.length === 0 ? (
              <div className={`text-center text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                {filterStatus === 'All' ? 'No leave requests found.' : `No ${filterStatus.toLowerCase()} leave requests found.`}
              </div>
            ) : (
              <div
                className="max-h-[350px] sm:max-h-[450px] lg:max-h-[520px] overflow-y-auto thin-scrollbar space-y-1 sm:space-y-2 lg:space-y-3 border-r border-gray-200 dark:border-border pr-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                {filteredLeaveList.map((leave) => {
                  console.log('Rendering leave card with status:', leave.status);
                  return (
                    <div key={leave.id} className={`p-1.5 sm:p-2 lg:p-3 border rounded-lg ${theme === 'dark' ? 'bg-background border-border hover:bg-accent/50' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                      <div className="flex justify-between items-start gap-1.5 sm:gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold mb-0.5 sm:mb-1 text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.title}</div>
                          <div className={`text-xs mb-0.5 sm:mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            From: {leave.start_date} To: {leave.end_date}
                          </div>
                          <div className="mb-0.5 sm:mb-1">
                            <button
                              onClick={() => setViewReason(leave.reason)}
                              className={`text-xs font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                              View Reason
                            </button>
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Applied: {leave.applied_on}</div>
                        </div>
                        <div className="ml-1 sm:ml-2 flex-shrink-0">
                          {renderStatus(leave.status)}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
});

COEApplyLeave.displayName = 'COEApplyLeave';

export default COEApplyLeave;