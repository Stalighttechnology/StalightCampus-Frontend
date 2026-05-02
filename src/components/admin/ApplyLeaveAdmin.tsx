import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { CalendarIcon } from "lucide-react";
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
  DialogDescription,
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
  const [leaves, setLeaves] = useState<AdminLeave[]>([]);
  const [leaveTitle, setLeaveTitle] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const today = new Date();
  const [selectedLeave, setSelectedLeave] = useState<AdminLeave | null>(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  // Fetch leaves data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await adminLeaveApplications();
        if (response.success && response.data) {
          setLeaves(response.data);
        } else {
          setError(response.message || "Failed to fetch leaves");
        }
      } catch (err) {
        setError("Failed to fetch leaves");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
      const response = await adminLeaveApplications(request, "POST");
      if (response.success && response.data) {
        setLeaves([response.data, ...leaves]);

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
    <div className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Main Container with Flex Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Application Form - Left Side */}
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader>
            <CardTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Application Form</CardTitle>
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
              <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Title for Leave *</Label>
              <Input
                value={leaveTitle}
                onChange={(e) => setLeaveTitle(e.target.value)}
                placeholder="Enter a title for your leave"
                disabled={loading}
                className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Date Range *</Label>
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
              <Label htmlFor="reason" className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Reason for Leave *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed reason for your leave request"
                className={theme === 'dark' ? 'min-h-[100px] bg-background text-foreground border-border' : 'min-h-[100px] bg-white text-gray-900 border-gray-300'}
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className={theme === 'dark' ? 'w-full text-white bg-primary hover:bg-[#9147e0] border-border' : 'w-full text-white bg-primary hover:bg-[#9147e0] border-primary'}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Leave Applications - Right Side */}
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}>
          <CardHeader>
            <div>
              <CardTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Recent Leave Applications</CardTitle>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and track your leave requests</p>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonList items={3} />
            ) : leaves.length === 0 ? (
              <div className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No leave requests found.</div>
            ) : (
              <div className="space-y-4">
                {leaves.map((leave) => (
                  <div
                    key={leave.id}
                    className={`border rounded-md px-4 py-4 shadow-sm ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 text-sm">
                        <p className={`font-medium ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                          {leave.title}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                          {leave.date}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setShowReasonDialog(true);
                            }}
                            variant="outline"
                            size="sm"
                            className={`text-xs ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-50'}`}
                          >
                            View Reason
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border-none ${
                            leave.status === 'APPROVED'
                              ? 'text-green-700 bg-green-100'
                              : leave.status === 'REJECTED'
                              ? 'text-red-700 bg-red-100'
                              : 'text-yellow-700 bg-yellow-100'
                          }`}
                        >
                          {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reason Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>
              Leave Reason
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>
              {selectedLeave && `Reason for: ${selectedLeave.title}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className={`text-sm ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-700'}`}>
              {selectedLeave?.reason}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplyLeaveAdmin;