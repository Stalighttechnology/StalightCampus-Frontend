import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { CalendarIcon, Filter as FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLeaveApplications } from "../../utils/admin_api";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { useTheme } from "../../context/ThemeContext";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { SkeletonList } from "../ui/skeleton";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const MySwal = withReactContent(Swal);

interface AdminLeave {
  id: number;
  title: string;
  date: string;
  reason: string;
  status: string;
}

const ApplyLeaveAdmin = () => {
  const { theme } = useTheme();
  const filterRef = useRef<HTMLDivElement>(null);
  const [leaves, setLeaves] = useState<AdminLeave[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const [leaveTitle, setLeaveTitle] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const today = new Date();
  const [selectedLeave, setSelectedLeave] = useState<AdminLeave | null>(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50; // Matching backend

  // Fetch leaves data
  const fetchLeaves = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await adminLeaveApplications({ page, page_size: pageSize });

      const hasResults = response && typeof response === 'object' && 'results' in response;
      const paginationData = response as any;
      const dataSource = hasResults ? paginationData.results : paginationData;

      if (dataSource && dataSource.success && dataSource.data) {
        setLeaves(dataSource.data);

        const count = paginationData.count || (dataSource && dataSource.count);
        if (count !== undefined) {
          setTotalCount(count);
          setTotalPages(Math.ceil(count / pageSize));
          setCurrentPage(page);
        } else {
          setTotalCount(dataSource.data.length);
          setTotalPages(1);
          setCurrentPage(1);
        }
      } else {
        setError(dataSource?.message || "Failed to fetch leaves");
      }
    } catch (err) {
      setError("Failed to fetch leaves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves(1);
  }, []);

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

  // Filter leaves based on statusFilter
  const filteredLeaves = leaves.filter((leave) => {
    if (statusFilter === "All") {
      return true;
    }
    return leave.status === statusFilter.toUpperCase();
  });

  const handleSubmit = async () => {
    if (!leaveTitle || !dateRange?.from || !reason.trim()) {
      setError("Please fill in all required fields.");
      setSuccessMessage("");
      return;
    }

    setError("");

    const startDateStr = format(dateRange.from, "yyyy-MM-dd");
    const endDateStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startDateStr;

    // Check for overlaps in local state (excluding REJECTED leaves)
    const hasOverlap = leaves.some(l => {
      if (l.status === 'REJECTED') return false;
      const lStart = l.date.split(' to ')[0];
      const lEnd = l.date.split(' to ')[1] || lStart;
      return startDateStr <= lEnd && endDateStr >= lStart;
    });

    if (hasOverlap) {
      setError("You already have a leave request that overlaps with these dates.");
      return;
    }

    setLoading(true);
    try {
      const request = {
        title: leaveTitle,
        start_date: format(dateRange.from, "yyyy-MM-dd"),
        end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(dateRange.from, "yyyy-MM-dd"),
        reason: reason.trim(),
      };
      const response = await adminLeaveApplications(request as any, "POST");
      if (response.success && response.data) {
        fetchLeaves(1);

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
      setLoading(false);
    }
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

      <div className={` ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        {/* Main Container with Flex Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leave Application Form - Left Side */}
          <Card id="apply-leave-form-card" className={`apply-leave-card ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader>
              <CardTitle className={`apply-leave-title text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {error}
                </div>
              )}

              {/* Leave Title */}
              <div className="space-y-2">
                <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title for Leave *</Label>
                <Input
                  value={leaveTitle}
                  onChange={(e) => setLeaveTitle(e.target.value)}
                  placeholder="Enter a title for your leave"
                  disabled={loading}
                  className={`apply-leave-input ${theme === 'dark' ? 'w-full bg-background text-foreground border-border focus:ring-primary/30' : 'w-full bg-white text-gray-900 border-gray-300 focus:ring-primary/20'}`}
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date Range *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`apply-leave-input ${theme === 'dark' ? 'w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}`}
                    >
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
                    className={cn("calendar-popover-content", theme === 'dark' ? 'w-auto p-0 bg-background text-foreground border-border shadow-xl' : 'w-auto p-0 bg-white text-gray-900 border-gray-200 shadow-xl')}
                    align="center"
                    side="bottom"
                    sideOffset={4}
                  >
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) => date < today} // Disable dates before today
                      initialFocus
                      className={cn(
                        "rounded-lg border-none",
                        theme === 'dark' ? 'bg-background text-foreground [&_.rdp-day:hover]:bg-accent [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed' : 'bg-white text-gray-900 [&_.rdp-day:hover]:bg-gray-100 [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-white [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed'
                      )}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Reason for Leave */}
              <div className="space-y-2">
                <Label htmlFor="reason" className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason for Leave *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a detailed reason for your leave request"
                  className={`apply-leave-input ${theme === 'dark' ? 'min-h-[100px] bg-background text-foreground border-border focus:ring-primary/30' : 'min-h-[100px] bg-white text-gray-900 border-gray-300 focus:ring-primary/20'}`}
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                className={`apply-leave-btn ${theme === 'dark' ? 'w-full text-white bg-primary hover:bg-primary/90 border-border' : 'w-full text-white bg-primary hover:bg-primary/90 border-primary'}`}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Leave Applications - Right Side */}
          <Card id="recent-leaves-card" className={`apply-leave-card ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={`apply-leave-title text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Recent Leave Applications</CardTitle>
                  <p className={`apply-leave-desc text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and track your leave requests</p>
                </div>
                <div className="relative" ref={filterRef}>
                  <Button
                    onClick={() => setShowFilter((prev) => !prev)}
                    className="h-10 text-sm font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 bg-primary text-white hover:bg-primary/90">
                    <FilterIcon className="w-4 h-4" />
                    {statusFilter === "All" ? "Filter" : statusFilter}
                  </Button>
                  {showFilter &&
                    <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-20 border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
                      <div className="py-1">
                        {["All", "Approved", "Pending", "Rejected"].map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={cn(
                              "block w-full text-left px-4 py-2 text-sm hover:bg-accent cursor-pointer",
                              theme === 'dark' ? 'hover:bg-accent text-foreground' : 'hover:bg-gray-100 text-gray-700',
                              statusFilter === status && "font-semibold bg-accent/50"
                            )}
                            onClick={() => {
                              setStatusFilter(status);
                              setShowFilter(false);
                            }}>
                            {status === "All" ? "All Status" : status}
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar">
              <div className="overflow-x-auto thin-scrollbar">
                {/* Mobile: stacked cards */}
                <div className="md:hidden space-y-3">
                  {loading ? (
                    <SkeletonList items={3} />
                  ) : filteredLeaves.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                      <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
                        <FilterIcon className={`w-8 h-8 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
                      </div>
                      <div className="max-w-xs mx-auto text-center">
                        <h3 className={`text-md font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Leave Requests Found</h3>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          There are no leave requests matching the selected status or filters.
                        </p>
                      </div>
                    </div>
                  ) : (
                    filteredLeaves.map((leave) => (
                      <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{leave.title}</div>
                            <div className="text-xs text-muted-foreground">{leave.date}</div>
                          </div>
                          <div className="shrink-0">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${leave.status === 'APPROVED' ? 'text-green-700 bg-green-100' :
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
                            onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}>
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
                      <th className={`py-2 px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title</th>
                      <th className={`py-2 px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</th>
                      <th className={`py-2 px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                      <th className={`py-2 px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="p-4">
                          <SkeletonList items={3} />
                        </td>
                      </tr>
                    ) : filteredLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-0">
                          <div className={`border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                            <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
                              <FilterIcon className={`w-10 h-10 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Leave Requests Found</h3>
                            <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              There are no leave requests matching the selected status or filters.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLeaves.map((leave) => (
                        <tr
                          key={leave.id}
                          className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <td className={`py-3 px-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.title}</td>
                          <td className={`py-3 px-4 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{leave.date}</td>
                          <td className="py-3 px-4 text-sm">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                              onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}>
                              View
                            </Button>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${leave.status === 'APPROVED' ? 'text-green-700 bg-green-100' :
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
                    onClick={() => fetchLeaves(currentPage - 1)}
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
                    onClick={() => fetchLeaves(currentPage + 1)}
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
        <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[90%] sm:max-w-md mx-auto rounded-3xl p-4 sm:p-6'}>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Leave Reason</DialogTitle>
            </DialogHeader>

            {/* Scrollable reason */}
            <div
              className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words
                    max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {selectedLeave?.reason}
            </div>

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setShowReasonDialog(false)}
                className={theme === 'dark' ?
                  'text-white bg-primary border border-primary hover:bg-primary/70 hover:text-white' :
                  'text-white bg-primary border border-primary hover:bg-primary/90 hover:text-white'}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ApplyLeaveAdmin;