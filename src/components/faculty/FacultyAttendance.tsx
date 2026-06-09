import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, FileText, RotateCcw, Loader2, FileDown, CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonCard, SkeletonList } from "@/components/ui/skeleton";
import { markFacultyAttendance, getFacultyAttendanceRecords, MarkFacultyAttendanceRequest, FacultyAttendanceRecord } from "@/utils/faculty_api";
import { normalizePaginatedResponse } from '@/utils/normalizePagination';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { API_ENDPOINT } from "@/utils/config";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const FacultyAttendance = () => {
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "absent" | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingStatus, setMarkingStatus] = useState<"present" | "absent" | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [todayRecord, setTodayRecord] = useState<FacultyAttendanceRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<FacultyAttendanceRecord[]>([]);
  const [recentPage, setRecentPage] = useState<number>(1);
  const recentPageSize = 10;
  const recentTotalPages = Math.ceil(recentRecords.length / recentPageSize);
  const paginatedRecentRecords = recentRecords.slice(
    (recentPage - 1) * recentPageSize,
    recentPage * recentPageSize
  );
  const [historyRecords, setHistoryRecords] = useState<FacultyAttendanceRecord[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize] = useState<number>(10);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTotalItems, setHistoryTotalItems] = useState<number>(0);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const { theme } = useTheme();

  const [historyStartDate, setHistoryStartDate] = useState<Date | undefined>(undefined);
  const [historyEndDate, setHistoryEndDate] = useState<Date | undefined>(undefined);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  useEffect(() => {
    fetchHistoryPage(historyPage);
  }, [historyPage, historyStartDate, historyEndDate]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const startDate = weekAgo.toLocaleDateString('sv-SE');

      const response = await getFacultyAttendanceRecords({ page: 1, page_size: 7, start_date: startDate });
      if (response.success && response.data) {
        setRecentRecords(response.data.slice(0, 7));
        const today = new Date().toLocaleDateString('sv-SE');
        const todayRec = response.data.find((r) => r.date === today) || null;
        setTodayRecord(todayRec);
        if (todayRec) {
          setAttendanceStatus(todayRec.status as "present" | "absent");
          setNotes(todayRec.notes || "");
        }
      }
    } catch (error) {
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryPage = async (page: number) => {
    try {
      setHistoryLoading(true);
      const params: any = { page, page_size: historyPageSize };
      if (historyStartDate) params.start_date = format(historyStartDate, "yyyy-MM-dd");
      if (historyEndDate) params.end_date = format(historyEndDate, "yyyy-MM-dd");
      const response = await getFacultyAttendanceRecords(params);
      if (response.success && response.data) {
        setHistoryRecords(response.data);
        const norm = normalizePaginatedResponse(response, 'data');
        if (norm.meta && Object.keys(norm.meta).length > 0) {
          const meta = norm.meta;
          const pgSize = response.page_size || response.pageSize || historyPageSize;
          setHistoryPage(meta.currentPage || meta.current_page || page);
          setHistoryTotalPages(meta.totalPages || meta.total_pages || Math.ceil((meta.totalItems || meta.total_items || 0) / pgSize) || 1);
          setHistoryTotalItems(meta.totalItems || meta.total_items || 0);
        } else if (response.pagination) {
          const p = response.pagination || {};
          setHistoryPage(p.current_page || p.page || page);
          setHistoryTotalPages(p.total_pages || p.totalPages || 1);
          setHistoryTotalItems(p.total_items || p.count || 0);
        }
      }
      return response;
    } catch (e) {
      return null;
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setHistoryStartDate(date);
    setHistoryPage(1);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setHistoryEndDate(date);
    setHistoryPage(1);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("report_type", "my_attendance");
      if (historyStartDate) queryParams.append("start_date", format(historyStartDate, "yyyy-MM-dd"));
      if (historyEndDate) queryParams.append("end_date", format(historyEndDate, "yyyy-MM-dd"));
      
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/reports/export-pdf/?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
          }
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `my_attendance_history_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        toast.error("Failed to download PDF report");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to download PDF report");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleToggleAttendance = async (status: "present" | "absent") => {
    const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    const confirmResult = await Swal.fire({
      title: `Mark ${capitalizedStatus}?`,
      text: `Are you sure you want to mark today's attendance as ${status}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Yes, Mark ${capitalizedStatus}`,
      cancelButtonText: "Cancel",
      confirmButtonColor: status === "present" ? "#22c55e" : "#ef4444",
      cancelButtonColor: theme === "dark" ? "#3f3f46" : "#d1d5db",
      background: theme === "dark" ? "#1c1c1e" : "#ffffff",
      color: theme === "dark" ? "#E4E4E7" : "#000000",
    });

    if (!confirmResult.isConfirmed) return;

    setIsSubmitting(true);
    setMarkingStatus(status);
    setIsAnimating(true);
    setLoadingMessage(status === 'present' ? "Initializing location..." : "Preparing request...");

    try {
      let latitude: number | undefined = undefined;
      let longitude: number | undefined = undefined;
      let device_info: any = undefined;

      if (status === 'present') {
        setLoadingMessage("Detecting your location...");
        // Require geolocation for marking present
        if (!navigator.geolocation) {
          toast.error('Geolocation not supported by this browser. Cannot mark present.');
          setIsSubmitting(false);
          setMarkingStatus(null);
          return;
        }

        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Location timeout')), 10000);
          navigator.geolocation.getCurrentPosition((p) => {clearTimeout(timer);resolve(p);}, (err) => {clearTimeout(timer);reject(err);}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        }).catch((err) => {

          if (err && err.code === 1) toast.error('Location permission denied. Enable location to mark present.');else
          toast.error('Unable to get device location. Cannot mark present.');
          return null;
        });

        if (!pos) {
          setIsSubmitting(false);
          setMarkingStatus(null);
          return;
        }

        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        device_info = {
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
          userAgent: navigator.userAgent
        };
      } else {
        setLoadingMessage("Capturing context...");
        // For absent, try to capture location if available but do not block
        try {
          const pos = await new Promise<GeolocationPosition | null>((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition((p) => resolve(p), () => resolve(null), { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 });
          });
          if (pos) {
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
            device_info = { userAgent: navigator.userAgent };
          }
        } catch (e) {

          // ignore
        }}

      setLoadingMessage("Syncing with server...");
      const requestData: MarkFacultyAttendanceRequest & any = {
        status,
        notes: notes.trim() || undefined
      };
      if (latitude !== undefined && longitude !== undefined) {
        requestData.latitude = latitude;
        requestData.longitude = longitude;
      }
      if (device_info) requestData.device_info = device_info;

      const response = await markFacultyAttendance(requestData);

      if (response.success) {
        setLoadingMessage("Almost done...");
        const isUpdate = response.data?.updated || false;
        toast.success(isUpdate ? `Attendance updated to ${status}` : `Attendance marked as ${status}`);
        setAttendanceStatus(status);
        await fetchAttendanceData(); // Refresh data
      } else {
        toast.error(response.message || "Failed to mark attendance");
      }
    } catch (error) {

      toast.error("Network error occurred");
    } finally {
      setIsSubmitting(false);
      setMarkingStatus(null);
      setLoadingMessage("");
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  const resetAttendance = () => {
    setAttendanceStatus(null);
    setNotes("");
    setTodayRecord(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "absent":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return theme === 'dark' ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200';
      case "absent":
        return theme === 'dark' ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200';
      default:
        return theme === 'dark' ? 'bg-gray-900/20 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-48" />
        <SkeletonCard className="h-96" />
      </div>);

  }

  return (
    <div className={` md: space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Today's Attendance */}
      <Card id="admin-my-attendance-form" className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}>
        <div id="today-attendance-toggle-section">
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pb-0">
            {/* Animated Toggle Buttons */}
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-4">
                {/* Present Button */}
                <motion.button
                  onClick={() => handleToggleAttendance("present")}
                  disabled={isSubmitting || !!attendanceStatus}
                  className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${markingStatus === 'present' ?
                  'bg-blue-500 text-white animate-pulse' :
                  attendanceStatus === 'present' ?
                  'bg-green-500 text-white scale-110' :
                  theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'}`
                  }
                  whileHover={{ scale: attendanceStatus === 'present' || markingStatus === 'present' ? 1.1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    rotate: attendanceStatus === 'present' && !markingStatus ? [0, -10, 10, 0] : 0
                  }}
                  transition={{
                    rotate: { duration: 0.5, ease: "easeInOut" }
                  }}>
                  
                  {markingStatus === 'present' ?
                  <Loader2 className="w-8 h-8 animate-spin" /> :

                  <CheckCircle className="w-8 h-8" />
                  }
                </motion.button>

                {/* Absent Button */}
                <motion.button
                  onClick={() => handleToggleAttendance("absent")}
                  disabled={isSubmitting || !!attendanceStatus}
                  className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${markingStatus === 'absent' ?
                  'bg-blue-500 text-white animate-pulse' :
                  attendanceStatus === 'absent' ?
                  'bg-red-500 text-white scale-110' :
                  theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'}`
                  }
                  whileHover={{ scale: attendanceStatus === 'absent' || markingStatus === 'absent' ? 1.1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    rotate: attendanceStatus === 'absent' && !markingStatus ? [0, -10, 10, 0] : 0
                  }}
                  transition={{
                    rotate: { duration: 0.5, ease: "easeInOut" }
                  }}>
                  
                  {markingStatus === 'absent' ?
                  <Loader2 className="w-8 h-8 animate-spin" /> :

                  <XCircle className="w-8 h-8" />
                  }
                </motion.button>
              </div>

              {/* Button Labels */}
              <div className="flex items-center space-x-8 text-sm font-medium">
                <motion.span
                  className={markingStatus === 'present' ? 'text-blue-500' : attendanceStatus === 'present' ? 'text-green-600' : 'text-gray-500'}
                  animate={{
                    scale: attendanceStatus === 'present' || markingStatus === 'present' ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}>
                  
                  {markingStatus === 'present' ? 'Marking...' : 'Present'}
                </motion.span>
                <motion.span
                  className={markingStatus === 'absent' ? 'text-blue-500' : attendanceStatus === 'absent' ? 'text-red-600' : 'text-gray-500'}
                  animate={{
                    scale: attendanceStatus === 'absent' || markingStatus === 'absent' ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}>
                  
                  {markingStatus === 'absent' ? 'Marking...' : 'Absent'}
                </motion.span>
              </div>

              {/* Progress Message */}
              <AnimatePresence>
                {isSubmitting && loadingMessage &&
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 text-xs font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                  
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {loadingMessage}
                  </motion.div>
                }
              </AnimatePresence>

              {/* Status Indicator */}
              <AnimatePresence mode="wait">
                {attendanceStatus &&
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center mt-4">
                  
                    <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${attendanceStatus === 'present' ?
                  theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-800' :
                  theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-800'}`
                  }>
                      {getStatusIcon(attendanceStatus)}
                      <span className="font-medium capitalize">
                        {attendanceStatus === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  </motion.div>
                }
              </AnimatePresence>

            </div>
          </CardContent>
        </div>
        <CardContent className="pt-4 space-y-6">
          {/* Notes Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>
              Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your attendance..."
              className={`resize-none h-24 ${theme === 'dark' ? 'bg-background border-input text-foreground' : 'bg-white border-gray-300 text-gray-900'}`} />
            
          </motion.div>

          {/* Attendance Details */}
          <AnimatePresence>
            {todayRecord &&
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-lg border ${getStatusColor(todayRecord.status)}`}>
              
                <div className="flex items-center space-x-3">
                  {getStatusIcon(todayRecord.status)}
                  <div>
                    <p className="font-semibold capitalize">{todayRecord.status}</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      Marked at {todayRecord.marked_at ? new Date(todayRecord.marked_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </p>
                    {todayRecord.location ?
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {todayRecord.location.inside ?
                    <>On campus • {todayRecord.location.distance_meters ? `${Math.round(todayRecord.location.distance_meters)} m` : 'distance unknown'}</> :

                    <>Outside campus • {todayRecord.location.distance_meters ? `${Math.round(todayRecord.location.distance_meters)} m` : 'distance unknown'}</>
                    }
                        {todayRecord.location.campus_name ? ` • ${todayRecord.location.campus_name}` : ''}
                      </p> :

                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Location not recorded</p>
                  }
                    {todayRecord.notes &&
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Notes: {todayRecord.notes}
                      </p>
                  }
                  </div>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Records */}
        <Card className={`flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
              Recent Attendance Records
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {recentRecords.length > 0 ?
            <div className="space-y-3 h-[440px] overflow-y-auto custom-scrollbar pr-1">
                {paginatedRecentRecords.map((record) =>
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-3 rounded-lg border ${getStatusColor(record.status)}`}>
                
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium capitalize">{record.status}</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {new Date(record.marked_at).toLocaleTimeString()}
                      </div>
                    </div>
                    {record.notes &&
                      <div className="mt-2 flex items-start space-x-2">
                        <FileText className="w-4 h-4 mt-0.5 text-gray-500" />
                        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                          {record.notes}
                        </p>
                      </div>
                    }
                    {/* Location removed from UI */}
                  </motion.div>
              )}
              </div> :

            <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className={`p-3 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                  <Clock className="w-8 h-8 text-primary opacity-50" />
                </div>
                <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No recent records</h3>
                <p className={`text-xs text-center max-w-[250px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  You haven't marked any attendance in the last 7 days.
                </p>
              </div>
            }
          </CardContent>
          {!loading && recentTotalPages > 0 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing <span className="font-medium">{Math.min((recentPage - 1) * recentPageSize + 1, recentRecords.length)}</span> to <span className="font-medium">{Math.min(recentPage * recentPageSize, recentRecords.length)}</span> of <span className="font-medium">{recentRecords.length}</span> records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecentPage(Math.max(1, recentPage - 1))}
                  disabled={recentPage === 1}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                  Previous
                </Button>

                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {recentPage}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecentPage(Math.min(recentTotalPages, recentPage + 1))}
                  disabled={recentPage === recentTotalPages}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        <Card id="faculty-attendance-history" className={`hidden md:flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
          <CardHeader id="faculty-attendance-history-header" className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2">
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
              Attendance History
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={handleExportPdf}
                disabled={exportingPdf || !historyStartDate || !historyEndDate}
                className="bg-primary hover:bg-primary/90 text-white font-semibold h-9 px-3 sm:px-4 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm whitespace-nowrap"
              >
                {exportingPdf ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                Export PDF
              </Button>

              <Popover open={historyFilterOpen} onOpenChange={setHistoryFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-0.5 sm:gap-1 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md text-xs sm:text-sm h-9 px-2.5 whitespace-nowrap"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filter</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className={`w-72 p-4 space-y-4 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`} 
                  align="end"
                  onInteractOutside={(event) => {
                    // Prevent closing when interacting with calendar popups
                    const target = event.target as HTMLElement;
                    if (target.closest('[data-radix-popper-content-wrapper]')) {
                      event.preventDefault();
                    }
                  }}
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 px-3 border",
                            !historyStartDate && "text-muted-foreground",
                            theme === 'dark' ? 'bg-background border-border text-foreground hover:bg-muted' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {historyStartDate ? format(historyStartDate, "dd-MM-yyyy") : <span>DD-MM-YYYY</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border border-border" align="start">
                        <Calendar
                          mode="single"
                          selected={historyStartDate}
                          onSelect={handleStartDateChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 px-3 border",
                            !historyEndDate && "text-muted-foreground",
                            theme === 'dark' ? 'bg-background border-border text-foreground hover:bg-muted' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {historyEndDate ? format(historyEndDate, "dd-MM-yyyy") : <span>DD-MM-YYYY</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border border-border" align="start">
                        <Calendar
                          mode="single"
                          selected={historyEndDate}
                          onSelect={handleEndDateChange}
                          disabled={(date) => date > new Date() || (historyStartDate ? date <= historyStartDate : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {historyLoading ? (
              <SkeletonList items={5} />
            ) : historyRecords.length > 0 ? (
              <div className="space-y-3 h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {historyRecords.map((record) => (
                  <div key={record.id} className={`p-3 rounded-lg border ${getStatusColor(record.status)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium capitalize">{record.status}</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {new Date(record.marked_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center py-16 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                  <RotateCcw className="w-10 h-10 text-primary opacity-50" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>History empty</h3>
                <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  There are no historical attendance records found for your account.
                </p>
              </div>
            )}
          </CardContent>

          {!historyLoading && historyRecords.length > 0 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div>
                Showing <span className="font-medium">{Math.min((historyPage - 1) * historyPageSize + 1, historyTotalItems)}</span> to <span className="font-medium">{Math.min(historyPage * historyPageSize, historyTotalItems)}</span> of <span className="font-medium">{historyTotalItems}</span> records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                  disabled={historyLoading || historyPage === 1}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                  Previous
                </Button>

                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {historyPage}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(Math.min(historyTotalPages, historyPage + 1))}
                  disabled={historyLoading || historyPage === historyTotalPages}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>);

};

export default FacultyAttendance;