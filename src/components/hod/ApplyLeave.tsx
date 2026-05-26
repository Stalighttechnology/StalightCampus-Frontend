import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { CalendarIcon, Filter as FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { manageHODLeaves, getLeaveBootstrap } from "../../utils/hod_api";
import { SkeletonCard, SkeletonTable } from "../ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { useTheme } from "../../context/ThemeContext";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Define error type for catch blocks
interface ErrorWithMessage {
  message: string;
}

// Type guard to check if an object has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string');

}

interface ManageHODLeavesRequest {
  branch_id: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
}

interface Leave {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

interface ProfileData {
  branch_id: string;
}

interface LeaveData {
  id: number;
  faculty_name: string;
  department: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  title?: string; // Make title optional since it might not be in the response
  submitted_at?: string | null;
  reviewed_at?: string | null;
}

interface LeaveBootstrapResponse {
  profile: ProfileData;
  leaves: Array<{
    id: number;
    faculty_name: string;
    department: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    title?: string;
  }>;
}

const statusColors = {
  APPROVED: "text-green-700 bg-green-100",
  REJECTED: "text-red-700 bg-red-100",
  PENDING: "text-yellow-700 bg-yellow-100"
};

const ApplyLeave = () => {
  const { theme } = useTheme();
  const filterRef = useRef<HTMLDivElement>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveTitle, setLeaveTitle] = useState("");
  const [reason, setReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const today = new Date();


  // Fetch profile and leaves data using combined endpoint
  const fetchData = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await getLeaveBootstrap({ page });
      if (!response.success && !response.data) {
        // Handle DRF wrapped response if applicable
        if ((response as any).results?.success) {
          const res = response as any;
          setBranchId(res.results.data.profile.branch_id);
          processLeaves(res.results.data.leaves, page);
          setTotalPages(res.total_pages || 1);
          setTotalCount(res.count || 0);
          setCurrentPage(res.current_page || page);
          return;
        }
        throw new Error(response.message || "Failed to fetch data");
      }

      const data: any = response.data;
      setBranchId(data.profile.branch_id);
      processLeaves(data.leaves, page);

      // Handle pagination metadata from standardized response
      setTotalPages((response as any).total_pages || 1);
      setTotalCount((response as any).count || 0);
      setCurrentPage((response as any).current_page || page);

      setError("");
    } catch (err) {

      setError(isErrorWithMessage(err) ? err.message : "Failed to fetch data");
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const processLeaves = (rawLeaves: any[], page: number) => {
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const sevenDaysAgo = new Date(todayDateOnly);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const processed = rawLeaves.
    map((leave: LeaveData) => ({
      raw: leave,
      mapped: {
        id: leave.id.toString(),
        title: leave.title || leave.faculty_name || "Leave Application",
        start_date: leave.start_date,
        end_date: leave.end_date,
        reason: leave.reason,
        status: leave.status
      } as Leave
    })).
    filter((item) => {
      const r = item.raw;
      const status = (r.status || '').toUpperCase();

      // Tuned Rule: If user is on Page 1, apply "recency" filters to keep view clean.
      // If user is on Page 2+, they are explicitly looking for history, so show everything.
      if (page > 1) return true;

      if (status === 'PENDING') {
        try {
          const end = new Date(r.end_date);
          const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          return endDateOnly >= todayDateOnly;
        } catch {
          return false;
        }
      }

      if (status === 'APPROVED' || status === 'REJECTED') {
        const refStr = r.reviewed_at || r.submitted_at;
        if (!refStr) return false;
        const ref = new Date(refStr);
        const refDateOnly = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
        return refDateOnly >= sevenDaysAgo;
      }
      return false;
    }).
    map((item) => item.mapped) as Leave[];

    setLeaves(processed);
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

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

  const handleSubmit = async () => {
    if (!leaveTitle || !dateRange?.from || !reason.trim()) {
      setError("Please fill in all required fields.");
      setSuccessMessage("");
      return;
    }

    setLoading(true);
    const startDateStr = format(dateRange.from, "yyyy-MM-dd");
    const endDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startDateStr;

    // Check for overlaps in local state (excluding REJECTED leaves)
    const hasOverlap = leaves.some((l) => {
      if (l.status === 'REJECTED') return false;
      return startDateStr <= l.end_date && endDateStr >= l.start_date;
    });

    if (hasOverlap) {
      setError("You already have a leave request that overlaps with these dates.");
      setLoading(false);
      return;
    }

    try {
      const request: ManageHODLeavesRequest = {
        branch_id: branchId,
        title: leaveTitle,
        start_date: startDateStr,
        end_date: endDateStr,
        reason: reason.trim()
      };
      const response = await manageHODLeaves(request, "POST");
      if (response.success && response.data) {
        setLeaves([{
          id: response.data.id.toString(),
          title: leaveTitle,
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(dateRange.from, "yyyy-MM-dd"),
          reason: reason.trim(),
          status: "PENDING"
        } as Leave, ...leaves]);

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

        setError("");
        setLeaveTitle("");
        setDateRange(undefined);
        setReason("");
      } else {
        setError(response.message || "Failed to submit leave");

        // Show error alert
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

        await MySwal.fire({
          title: 'Error!',
          text: response.message || 'Failed to submit leave',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
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
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter leaves based on statusFilter
  const filteredLeaves = leaves.filter((leave) => {
    if (statusFilter === "All") {
      return true;
    }
    return leave.status === statusFilter.toUpperCase();
  });

  return (
    <div id="hod-apply-leaves-container" className={` ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Main Container with Flex Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Application Form - Left Side */}
        <Card id="hod-leave-application-form" className={`flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
        <CardHeader>
          <CardTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Message */}
          {error &&
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
              {error}
            </div>
            }
          
          {/* Leave Title */}
          <div className="space-y-2">
            <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Title for Leave *</Label>
            <Input
                value={leaveTitle}
                onChange={(e) => setLeaveTitle(e.target.value)}
                placeholder="Enter a title for your leave"
                disabled={loading}
                className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'} />
              
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Date Range *</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    onClick={() => setIsCalendarOpen(true)}
                    className={theme === 'dark' ? 'w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}>
                    
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ?
                    dateRange.to ?
                    <>
                        {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                      </> :

                    format(dateRange.from, "PPP") :


                    <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Pick a date range</span>
                    }
                </Button>
              </PopoverTrigger>

              {/* Calendar with theme support and disabled past dates */}
              <PopoverContent className={theme === 'dark' ? 'w-auto p-0 bg-background text-foreground border-border shadow-lg' : 'w-auto p-0 bg-white text-gray-900 border-gray-200 shadow-lg'}>
                <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      if (!range && dateRange?.from) {
                        // If user clicks the same date again, treat it as a single-day range and close
                        setDateRange({ from: dateRange.from, to: dateRange.from });
                        setIsCalendarOpen(false);
                      } else {
                        setDateRange(range);
                        // If both from and to are selected, close the popover
                        if (range?.from && range?.to) {
                          setIsCalendarOpen(false);
                        }
                      }
                    }}
                    disabled={(date) => date < today} // Disable dates before today
                    initialFocus
                    className={theme === 'dark' ? 'rounded-md bg-background text-foreground [&_.rdp-day:hover]:bg-accent [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed' : 'rounded-md bg-white text-gray-900 [&_.rdp-day:hover]:bg-gray-100 [&_.rdp-day_selected]:bg-blue-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed'} />
                  
              </PopoverContent>
            </Popover>
          </div>

          {/* Reason for Leave */}
          <div className="space-y-2">
            <Label htmlFor="reason" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Reason for Leave *</Label>
            <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your leave request"
                className={theme === 'dark' ? 'min-h-[100px] bg-background text-foreground border-border' : 'min-h-[100px] bg-white text-gray-900 border-gray-300'}
                disabled={loading} />
              
          </div>

          {/* Submit Button */}
          <Button
              onClick={handleSubmit}
              className={theme === 'dark' ? 'w-full text-white bg-primary hover:bg-[#9147e0] border-border' : 'w-full text-white bg-primary hover:bg-[#9147e0] border-primary'}
              disabled={loading || !branchId}>
              
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </CardContent>
      </Card>

        {/* Recent Leave Applications - Right Side */}
        <Card id="hod-recent-leave-applications" className={`flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Recent Leave Applications</CardTitle>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and track your leave requests</p>
            </div>
            <div className="relative" ref={filterRef}>
              <button
                  onClick={() => setShowFilter((prev) => !prev)}
                  className={theme === 'dark' ? 'text-foreground hover:text-muted-foreground' : 'text-gray-900 hover:text-gray-500'}>
                  
                <FilterIcon className="w-6 h-6" />
              </button>
              {showFilter &&
                <div className={`absolute right-0 mt-2 w-36 rounded shadow-lg z-10 border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  {["All", "Approved", "Pending", "Rejected"].map((status) =>
                  <div
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowFilter(false);
                    }}
                    className={cn(
                      "px-4 py-2 cursor-pointer",
                      theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100',
                      statusFilter === status && "font-semibold"
                    )}>
                    
                      {status}
                    </div>
                  )}
                </div>
                }
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar">
          <div className="overflow-x-auto thin-scrollbar">
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-3">
              {loading ?
                <div className="space-y-3">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div> :
                filteredLeaves.length === 0 ?
                <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className={`p-3 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <CalendarIcon className="w-8 h-8 text-primary opacity-50" />
                  </div>
                  <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No applications</h3>
                  <p className={`text-xs text-center max-w-[250px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    You haven't submitted any leave requests recently.
                  </p>
                </div> :

                filteredLeaves.map((leave) =>
                <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{leave.title}</div>
                        <div className="text-xs text-muted-foreground">{leave.start_date} to {leave.end_date}</div>
                      </div>
                      <div className="shrink-0">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[leave.status]}`}>
                          {leave.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                      size="sm"
                      variant="outline"
                      className={`flex-1 ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => setSelectedReason(leave.reason)}>
                      
                        View Reason
                      </Button>
                    </div>
                  </div>
                )
                }
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
                {loading ?
                  <tr>
                    <td colSpan={4} className="p-4">
                      <SkeletonTable rows={5} cols={4} />
                    </td>
                  </tr> :
                  filteredLeaves.length === 0 ?
                  <tr>
                    <td colSpan={4} className="py-20 px-4">
                      <div className="flex flex-col items-center justify-center">
                        <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                          <CalendarIcon className="w-10 h-10 text-primary opacity-50" />
                        </div>
                        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No applications found</h3>
                        <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          There are currently no leave requests to display for the selected period.
                        </p>
                      </div>
                    </td>
                  </tr> :

                  filteredLeaves.map((leave) =>
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
                        onClick={() => setSelectedReason(leave.reason)}>
                        
                          View
                        </Button>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[leave.status]}`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  )
                  }
              </tbody>
            </table>
          </div>
        </CardContent>
        {leaves.length > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {totalCount === 0 ? 0 : (currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
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
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}

        {/* Popup Modal */}
        <Dialog open={!!selectedReason} onOpenChange={() => setSelectedReason(null)}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6'}>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Leave Reason</DialogTitle>
            </DialogHeader>

            {/* Scrollable reason */}
            <div
                className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                        max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                
              {selectedReason}
            </div>

            <div className="flex justify-end mt-4">
              <Button
                  variant="outline"
                  onClick={() => setSelectedReason(null)}
                  className={theme === 'dark' ?
                  'text-white bg-primary border border-primary hover:bg-primary/70 hover:text-white' :
                  'text-white bg-primary border border-primary hover:bg-primary/90 hover:text-white'}>
                  
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
      </div>
    </div>);

};

export default ApplyLeave;