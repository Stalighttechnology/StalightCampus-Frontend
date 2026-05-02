import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Calendar } from "../ui/calendar";
import { PopoverTrigger, Popover, PopoverContent } from "../ui/popover";
import { CalendarIcon, CheckCircle2, Clock3, XCircle, Eye, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { useStudentLeaveRequestMutation, useStudentLeaveRequestsQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from "../ui/badge";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const MySwal = withReactContent(Swal);

type LeaveStatusType = "PENDING" | "APPROVED" | "REJECTED";

// Interface for leave requests from the dedicated API endpoint
interface LeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  title: string;
  reason: string;
  status: string; // API returns string values
  submitted_at?: string;
}

const getStatusStyles = (theme: string, status: string) => {
  const normalizedStatus = status.toUpperCase() as LeaveStatusType;

  const styles = {
    PENDING: {
      icon: <Clock3 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />,
      color: theme === 'dark' ? "text-yellow-400" : "text-yellow-600",
      bg: theme === 'dark' ? "bg-yellow-900/30" : "bg-yellow-100",
    },
    APPROVED: {
      icon: <CheckCircle2 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />,
      color: theme === 'dark' ? "text-green-400" : "text-green-600",
      bg: theme === 'dark' ? "bg-green-900/30" : "bg-green-100",
    },
    REJECTED: {
      icon: <XCircle className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />,
      color: theme === 'dark' ? "text-red-400" : "text-red-600",
      bg: theme === 'dark' ? "bg-red-900/30" : "bg-red-100",
    },
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

  const { data: leavesData = [], isLoading: leavesLoading, isError: leavesError, refetch: refetchLeaves } = useStudentLeaveRequestsQuery();
  const [filter, setFilter] = useState<string>('ALL');
  const [query, setQuery] = useState<string>('');
  const [viewReason, setViewReason] = useState<string | null>(null);

  // Filter state for dropdown
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const filteredLeaves = useMemo(() => {
    const q = query.trim().toLowerCase();
    const currentLeaves = (leavesData || []) as LeaveRequest[];
    return currentLeaves.filter(l => {
      if (statusFilter !== "All" && l.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
      if (!q) return true;
      return l.reason.toLowerCase().includes(q) || l.start_date.includes(q) || l.end_date.includes(q);
    });
  }, [leavesData, statusFilter, query]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
    const hasOverlap = (leavesData as LeaveRequest[]).some(l => {
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
      reason: reason.trim(),
    };

    console.log("Submitting leave request with data:", requestData); // Debug log

    try {
      await leaveRequestMutation.mutateAsync(requestData);

      // Show success toast and a subtle modal for confirmation
      toast({ title: 'Leave Request Submitted', description: 'Your request was submitted successfully.' });

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
      setDateRange(undefined);
      setTitle("");
      setReason("");

      // Scroll to the leave status list to show the newly created request
      const el = document.getElementById('leave-status-list');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error("Failed to submit leave request:", error);
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");

      toast({ variant: 'destructive', title: 'Failed to submit', description: error instanceof Error ? error.message : 'Please try again.' });

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
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Main Container with Flex Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Application Form - Left Side */}
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Title</Label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief title for your leave request"
                  className={theme === 'dark' ? 'w-full px-3 py-2 bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring' : 'w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Date Range</Label>
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
                        <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Pick a date or date range</span>
                      )}
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
                      className={theme === 'dark' ? 'rounded-md bg-background text-foreground [&_.rdp-day:hover]:bg-accent [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed' : 'rounded-md bg-white text-gray-900 [&_.rdp-day:hover]:bg-gray-100 [&_.rdp-day_selected]:bg-blue-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed'}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a detailed reason for your leave request"
                  className={theme === 'dark' ? 'min-h-[100px] bg-background text-foreground border-border' : 'min-h-[100px] bg-white text-gray-900 border-gray-300'}
                  required
                />
              </div>

              <Button
                type="submit"
                className={theme === 'dark' ? 'w-full text-white bg-primary hover:bg-[#9147e0] border-border' : 'w-full text-white bg-primary hover:bg-[#9147e0] border-primary'}
                disabled={leaveRequestMutation.isPending}
              >
                {leaveRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Your Leave Requests - Right Side */}
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Your Leave Requests</CardTitle>
              <div className="relative" ref={filterRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilter(!showFilter)}
                  className={theme === 'dark' ? 'bg-background text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </Button>
                {showFilter && (
                  <div className={`absolute right-0 mt-2 w-48 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-md shadow-lg z-10`}>
                    <div className="py-1">
                      {['All', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                        <button
                          key={status}
                          className={`block w-full text-left px-4 py-2 text-sm hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-100'} ${statusFilter === status ? (theme === 'dark' ? 'bg-accent text-accent-foreground' : 'bg-gray-100 text-gray-900') : (theme === 'dark' ? 'text-foreground' : 'text-gray-700')}`}
                          onClick={() => {
                            setStatusFilter(status);
                            setShowFilter(false);
                          }}
                        >
                          {status === 'All' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="max-h-[500px] overflow-y-auto thin-scrollbar">
            {/* Error Message */}
            {leavesError && (
              <div className={`p-3 rounded-lg mb-4 shadow ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                An error occurred while fetching leave requests.
                <Button
                  variant="link"
                  className="p-0 ml-2"
                  onClick={() => refetchLeaves()}>
                  Try again
                </Button>
              </div>
            )}

            {/* Loading State */}
            {leavesLoading ? (
              <div className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Loading leave requests...</div>
            ) : filteredLeaves.length === 0 ? (
              <div className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                No leave requests found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                    <TableHead className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title</TableHead>
                    <TableHead className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</TableHead>
                    <TableHead className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</TableHead>
                    <TableHead className={`font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaves.map((item) => (
                    <TableRow key={item.id} className={theme === 'dark' ? 'border-border hover:bg-accent/50' : 'border-gray-200 hover:bg-gray-50'}>
                      <TableCell className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {item.title && item.title.trim() && item.title !== 'N/A' ? item.title : 'Untitled'}
                      </TableCell>
                      <TableCell className={`text-sm mobile-table-cell mobile-period-cell ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {format(parseISO(item.start_date), 'MMM dd')} - {format(parseISO(item.end_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewReason(item.reason)}
                          className={`h-8 px-2 ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border-none flex items-center gap-2 w-fit ${getStatusStyles(theme, item.status).bg} ${getStatusStyles(theme, item.status).color}`}
                        >
                          <div className="flex items-center gap-1">
                            {getStatusStyles(theme, item.status).icon}
                            {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                          </div>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
};

export default SubmitLeaveRequest;