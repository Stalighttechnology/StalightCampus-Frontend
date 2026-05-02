import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, FileText, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonCard, SkeletonList } from "@/components/ui/skeleton";
import { markFacultyAttendance, getFacultyAttendanceRecords, MarkFacultyAttendanceRequest, FacultyAttendanceRecord } from "@/utils/faculty_api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const FacultyAttendance = () => {
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "absent" | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingStatus, setMarkingStatus] = useState<"present" | "absent" | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [todayRecord, setTodayRecord] = useState<FacultyAttendanceRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<FacultyAttendanceRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<FacultyAttendanceRecord[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize] = useState<number>(10);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTotalItems, setHistoryTotalItems] = useState<number>(0);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      // Load recent records and today's record in a single paginated call (reduces duplicate requests)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const startDate = weekAgo.toISOString().split('T')[0];

      const resp = await fetchHistoryPage(1, startDate);
      if (resp && resp.success && resp.data) {
        setRecentRecords(resp.data.slice(0, 7));
        const today = new Date().toISOString().split('T')[0];
        const todayRec = resp.data.find((r) => r.date === today) || null;
        setTodayRecord(todayRec);
        if (todayRec) {
          setAttendanceStatus(todayRec.status as "present" | "absent");
          setNotes(todayRec.notes || "");
        }
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryPage = async (page: number, start_date?: string) => {
    try {
      setHistoryLoading(true);
      const params: any = { page, page_size: historyPageSize };
      if (start_date) params.start_date = start_date;
      const response = await getFacultyAttendanceRecords(params);
      if (response.success && response.data) {
        setHistoryRecords(response.data);
        if (response.pagination) {
          setHistoryPage(response.pagination.current_page || page);
          setHistoryTotalPages(response.pagination.total_pages || 1);
          setHistoryTotalItems(response.pagination.total_items || 0);
        }
      }
      return response;
    } catch (e) {
      console.error('Failed to fetch history page', e);
      return null;
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleAttendance = async (status: "present" | "absent") => {
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
          navigator.geolocation.getCurrentPosition((p) => { clearTimeout(timer); resolve(p); }, (err) => { clearTimeout(timer); reject(err); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        }).catch((err) => {
          console.error('Error getting geolocation:', err);
          if (err && err.code === 1) toast.error('Location permission denied. Enable location to mark present.');
          else toast.error('Unable to get device location. Cannot mark present.');
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
        }
      }

      setLoadingMessage("Syncing with server...");
      const requestData: MarkFacultyAttendanceRequest & any = {
        status,
        notes: notes.trim() || undefined,
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
      console.error("Error marking attendance:", error);
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
      </div>
    );
  }

  return (
    <div className={` md: space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Today's Attendance */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Animated Toggle Buttons */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-4">
              {/* Present Button */}
              <motion.button
                onClick={() => handleToggleAttendance("present")}
                disabled={isSubmitting}
                className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg ${
                  markingStatus === 'present'
                    ? 'bg-blue-500 text-white animate-pulse'
                    : attendanceStatus === 'present'
                      ? 'bg-green-500 text-white scale-110'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
                }`}
                whileHover={{ scale: (attendanceStatus === 'present' || markingStatus === 'present') ? 1.1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  rotate: (attendanceStatus === 'present' && !markingStatus) ? [0, -10, 10, 0] : 0,
                }}
                transition={{
                  rotate: { duration: 0.5, ease: "easeInOut" }
                }}
              >
                {markingStatus === 'present' ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <CheckCircle className="w-8 h-8" />
                )}
              </motion.button>

              {/* Absent Button */}
              <motion.button
                onClick={() => handleToggleAttendance("absent")}
                disabled={isSubmitting}
                className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg ${
                  markingStatus === 'absent'
                    ? 'bg-blue-500 text-white animate-pulse'
                    : attendanceStatus === 'absent'
                      ? 'bg-red-500 text-white scale-110'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
                }`}
                whileHover={{ scale: (attendanceStatus === 'absent' || markingStatus === 'absent') ? 1.1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  rotate: (attendanceStatus === 'absent' && !markingStatus) ? [0, -10, 10, 0] : 0,
                }}
                transition={{
                  rotate: { duration: 0.5, ease: "easeInOut" }
                }}
              >
                {markingStatus === 'absent' ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </motion.button>
            </div>

            {/* Button Labels */}
            <div className="flex items-center space-x-8 text-sm font-medium">
              <motion.span
                className={markingStatus === 'present' ? 'text-blue-500' : attendanceStatus === 'present' ? 'text-green-600' : 'text-gray-500'}
                animate={{
                  scale: (attendanceStatus === 'present' || markingStatus === 'present') ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                {markingStatus === 'present' ? 'Marking...' : 'Present'}
              </motion.span>
              <motion.span
                className={markingStatus === 'absent' ? 'text-blue-500' : attendanceStatus === 'absent' ? 'text-red-600' : 'text-gray-500'}
                animate={{
                  scale: (attendanceStatus === 'absent' || markingStatus === 'absent') ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                {markingStatus === 'absent' ? 'Marking...' : 'Absent'}
              </motion.span>
            </div>

            {/* Progress Message */}
            <AnimatePresence>
              {isSubmitting && loadingMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 text-xs font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {loadingMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status Indicator */}
            <AnimatePresence mode="wait">
              {attendanceStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center mt-4"
                >
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                    attendanceStatus === 'present'
                      ? theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-800'
                      : theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-800'
                  }`}>
                    {getStatusIcon(attendanceStatus)}
                    <span className="font-medium capitalize">
                      {attendanceStatus === 'present' ? 'Present' : 'Absent'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reset Button */}
            {attendanceStatus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  onClick={resetAttendance}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </Button>
              </motion.div>
            )}
          </div>

          {/* Notes Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>
              Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your attendance..."
              className={`resize-none h-24 ${theme === 'dark' ? 'bg-background border-input text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </motion.div>

          {/* Attendance Details */}
          <AnimatePresence>
            {todayRecord && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-lg border ${getStatusColor(todayRecord.status)}`}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(todayRecord.status)}
                  <div>
                    <p className="font-semibold capitalize">{todayRecord.status}</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      Marked at {todayRecord.marked_at ? new Date(todayRecord.marked_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </p>
                    {todayRecord.location ? (
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {todayRecord.location.inside ? (
                          <>On campus • {todayRecord.location.distance_meters ? `${Math.round(todayRecord.location.distance_meters)} m` : 'distance unknown'}</>
                        ) : (
                          <>Outside campus • {todayRecord.location.distance_meters ? `${Math.round(todayRecord.location.distance_meters)} m` : 'distance unknown'}</>
                        )}
                        {todayRecord.location.campus_name ? ` • ${todayRecord.location.campus_name}` : ''}
                      </p>
                    ) : (
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Location not recorded</p>
                    )}
                    {todayRecord.notes && (
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Notes: {todayRecord.notes}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Recent Attendance Records */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
            Recent Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentRecords.length > 0 ? (
            <div className="space-y-3">
              {recentRecords.map((record) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-lg border ${getStatusColor(record.status)}`}
                >
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
                  {record.notes && (
                    <div className="mt-2 flex items-start space-x-2">
                      <FileText className="w-4 h-4 mt-0.5 text-gray-500" />
                      <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {record.notes}
                      </p>
                    </div>
                  )}
                  {/* Location removed from UI */}
                </motion.div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              No attendance records found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Attendance History (paginated) */}
      <Card className={`hidden md:block ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <SkeletonList items={5} />
          ) : historyRecords.length > 0 ? (
            <>
              <div className="space-y-3">
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

              {/* Pagination Controls */}
              {historyTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => fetchHistoryPage(Math.max(1, historyPage - 1))} 
                    disabled={historyLoading || historyPage === 1} 
                    className={`font-medium transition-all duration-200 ${
                      (historyLoading || historyPage === 1) 
                        ? 'bg-primary opacity-50 text-white cursor-not-allowed' 
                        : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                    }`}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const total = historyTotalPages || 1;
                      const current = historyPage || 1;
                      const maxButtons = 5;
                      let start = Math.max(1, current - Math.floor(maxButtons / 2));
                      let end = Math.min(total, start + maxButtons - 1);
                      if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
                      const buttons = [];
                      for (let p = start; p <= end; p++) {
                        buttons.push(
                          <Button
                            key={p}
                            size="sm"
                            variant={p === current ? undefined : 'ghost'}
                            onClick={() => fetchHistoryPage(p)}
                            disabled={historyLoading}
                            className={`px-2 py-1 text-xs font-semibold ${p === current ? 'bg-white text-primary' : 'bg-white text-gray-600 hover:text-primary dark:bg-gray-700'}`}
                          >
                            {p}
                          </Button>
                        );
                      }
                      return buttons;
                    })()}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => fetchHistoryPage(Math.min(historyTotalPages, historyPage + 1))} 
                    disabled={historyLoading || historyPage === historyTotalPages} 
                    className={`font-medium transition-all duration-200 ${
                      (historyLoading || historyPage === historyTotalPages) 
                        ? 'bg-primary opacity-50 text-white cursor-not-allowed' 
                        : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                    }`}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className={`text-center py-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              No history available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FacultyAttendance;