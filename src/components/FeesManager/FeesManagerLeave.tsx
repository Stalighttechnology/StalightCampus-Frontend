import { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useTheme } from '@/context/ThemeContext';
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Circle, CalendarCheck2, CalendarX2 } from 'lucide-react';
import {
  getFeesManagerLeaves,
  applyFeesManagerLeave
} from "../../utils/fees_manager_api";

const MySwal = withReactContent(Swal);

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

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

const FeesManagerLeave = () => {
  const [title, setTitle] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');
  const [leaveList, setLeaveList] = useState<LeaveRequestDisplay[]>([]);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const today = new Date();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalCount = leaveList.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedLeaves = leaveList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Fetch leave requests on component mount
  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const res = await getFeesManagerLeaves();

      if (res.success && res.data) {
        setLeaveList(res.data);
        setCurrentPage(1);
      } else {
        setError(res.message || 'Failed to fetch leave requests');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !dateRange?.from || !reason.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setError("");

    const startDateStr = format(dateRange.from, "yyyy-MM-dd");
    const endDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startDateStr;

    // Check for overlaps in local state (excluding Rejected leaves)
    const hasOverlap = leaveList.some(l => {
      if (l.status === 'Rejected') return false;
      return startDateStr <= l.end_date && endDateStr >= l.start_date;
    });

    if (hasOverlap) {
      setError("You already have a leave request that overlaps with these dates.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await applyFeesManagerLeave({
        title: title.trim(),
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
        reason: reason.trim(),
      });

      if (res.success) {
        // Optimistic UI update - add the new leave to the list
        const newLeave: LeaveRequestDisplay = {
          id: res.leave_id || Date.now().toString(),
          title: title.trim(),
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
          reason: reason.trim(),
          status: 'Pending',
          applied_on: new Date().toLocaleDateString('sv-SE'),
        };
        setLeaveList(prev => [newLeave, ...prev]);
        setCurrentPage(1);

        // Reset form
        setTitle('');
        setDateRange(undefined);
        setReason('');
        setError('');

        // Show success alert
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
      } else {
        setError(res.message || "Failed to submit leave");

        // Show error alert
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

        await MySwal.fire({
          title: 'Error!',
          text: res.message || 'Failed to submit leave',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
        });
      }
    } catch (err) {
      const errorMessage = "Network error occurred";
      setError(errorMessage);

      // Show error alert
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

      await MySwal.fire({
        title: 'Error!',
        text: 'Network error occurred',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div id="feesmanager-leave-container" className={` ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>

      {/* Main Container with Flex Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Application Form - Left Side */}
        <Card id="feesmanager-leave-form" className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader className="border-b pb-4">
            <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-normal">Your leave request will be routed to the <span className="font-medium text-primary">Dean</span> for approval.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Error Message */}
            {error && (
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                {error}
              </div>
            )}

            {/* Leave Title */}
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Title for Leave <span className="text-red-500">*</span></Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your leave"
                disabled={submitting}
                className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}
                required
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Date Range <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={theme === 'dark' ? 'w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
                  </Button>
                </PopoverTrigger>

                {/* Calendar with theme support and disabled past dates */}
                <PopoverContent className={theme === 'dark' ? 'w-auto p-0 bg-background text-foreground border-border shadow-lg' : 'w-auto p-0 bg-white text-gray-900 border-gray-200 shadow-lg'}>
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    disabled={(date) => date < today} // Disable dates before today
                    initialFocus
                    className={theme === 'dark' ? 'rounded-md bg-background text-foreground [&_.rdp-day:hover]:bg-accent [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed' : 'rounded-md bg-white text-gray-900 [&_.rdp-day:hover]:bg-gray-100 [&_.rdp-day_selected]:bg-blue-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed'}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Reason for Leave */}
            <div className="space-y-2">
              <Label htmlFor="reason" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Reason for Leave <span className="text-red-500">*</span></Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your leave request"
                className={theme === 'dark' ? 'min-h-[100px] bg-background text-foreground border-border' : 'min-h-[100px] bg-white text-gray-900 border-gray-300'}
                disabled={submitting}
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className={theme === 'dark' ? 'w-full text-white bg-primary hover:bg-[#9147e0] border-border' : 'w-full text-white bg-primary hover:bg-[#9147e0] border-primary'}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Leave Applications - Right Side */}
        <Card id="feesmanager-recent-leaves" className={theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}>
          <CardHeader className="border-b pb-4">
            <div>
              <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Recent Leave Applications</CardTitle>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and track your leave requests</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar pt-4">
            <div className="overflow-x-auto thin-scrollbar">
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-3">
                {loading ? (
                  <SkeletonList count={3} />
                ) : leaveList.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                    <div className={`p-3 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                      <CalendarIcon className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No applications</h3>
                    <p className={`text-xs text-center max-w-[250px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      There are currently no leave requests to display for your account.
                    </p>
                  </div>
                ) : (
                  paginatedLeaves.map((leave) => (
                    <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{leave.title}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</div>
                        </div>
                        <div className="shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            leave.status === 'APPROVED' ? 'text-green-700 bg-green-100' :
                            leave.status === 'REJECTED' ? 'text-red-700 bg-red-100' :
                            'text-yellow-700 bg-yellow-100'
                          }`}>
                            {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`flex-1 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-50'}`}
                          onClick={() => setViewReason(leave.reason)}>
                          View Reason
                        </Button>
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
                  ) : leaveList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 px-4">
                        <div className="flex flex-col items-center justify-center">
                          <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                            <CalendarIcon className="w-10 h-10 text-primary opacity-50" />
                          </div>
                          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No applications found</h3>
                          <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            There are currently no leave requests to display for your account.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLeaves.map((leave) => (
                      <tr
                        key={leave.id}
                        className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className={`py-3 px-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.title}</td>
                        <td className={`py-3 px-4 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</td>
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
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            leave.status === 'APPROVED' ? 'text-green-700 bg-green-100' :
                            leave.status === 'REJECTED' ? 'text-red-700 bg-red-100' :
                            'text-yellow-700 bg-yellow-100'
                          }`}>
                            {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  variant="outline"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Previous
                </Button>

                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {currentPage}
                  </span>
                </div>

                <Button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  variant="outline"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Reason Dialog */}
      <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6'}>
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
  );
};

export default FeesManagerLeave;