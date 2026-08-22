import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, FileText, RotateCcw, Loader2, FileDown, CalendarIcon, Filter, MapPin } from "lucide-react";
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
import { Device } from '@capacitor/device';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formatTotalHours = (decimalHours: number): string => {
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
};

const FacultyAttendance = () => {
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "absent" | "holiday" | "weekly_off" | null>(null);
  const [selectedRecordDetails, setSelectedRecordDetails] = useState<any>(null);
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
  const navigate = useNavigate();

  // Route guard: if the org has disabled web attendance marking, redirect to dashboard
  useEffect(() => {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    const storedUser = userStr ? JSON.parse(userStr) : null;
    const allowWebAttendance = storedUser?.org_allow_web_attendance ?? true;
    if (!allowWebAttendance) {
      // Determine correct dashboard path from current URL role prefix
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const rolePrefix = pathParts[0] || 'faculty';
      navigate(`/${rolePrefix}/dashboard`, { replace: true });
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextCheckTime, setNextCheckTime] = useState<string | null>(null);
  const { theme } = useTheme();

  const [historyStartDate, setHistoryStartDate] = useState<Date | undefined>(undefined);
  const [historyEndDate, setHistoryEndDate] = useState<Date | undefined>(undefined);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(undefined);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(undefined);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  const initialLoadRef = useRef(true);

  useEffect(() => {
    fetchHistoryPage(historyPage);
  }, [historyPage, historyStartDate, historyEndDate]);

  const fetchAttendanceData = async () => {
    // Only call this manually if we really need to refresh just the dashboard
    try {
      setLoading(true);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const startDate = weekAgo.toLocaleDateString('sv-SE');

      const response = await getFacultyAttendanceRecords({ page: 1, page_size: 7, start_date: startDate });
      if (response.success && response.data) {
        setRecentRecords(response.data.slice(0, 7));
        const today = new Date().toLocaleDateString('sv-SE');
        const orgCheckinWindows = (response as any).checkin_windows || [];
        const orgPeriodicCount = (response as any).periodic_checkin_count || 1;
        const orgStrictWindow = (response as any).strict_checkin_window ?? true;

        const foundTodayRec = response.data.find((r) => r.date === today) || null;
        const finalTodayRec: FacultyAttendanceRecord = foundTodayRec
          ? {
              ...foundTodayRec,
              checkin_windows: (foundTodayRec.checkin_windows && foundTodayRec.checkin_windows.length > 0) ? foundTodayRec.checkin_windows : orgCheckinWindows,
              periodic_checkin_count: foundTodayRec.periodic_checkin_count || orgPeriodicCount,
              strict_checkin_window: foundTodayRec.strict_checkin_window ?? orgStrictWindow,
              category_attendance_workflows: (response as any).category_attendance_workflows || {},
              staff_category: (response as any).staff_category || 'teaching',
            }
          : {
              id: `today-${today}`,
              date: today,
              status: (response as any).is_today_holiday ? 'holiday' : 'absent',
              marked_at: '',
              check_in_time: null,
              check_out_time: null,
              total_hours: null,
              notes: '',
              checkin_timestamps: [],
              delays: [],
              periodic_checkin_count: orgPeriodicCount,
              checkin_windows: orgCheckinWindows,
              strict_checkin_window: orgStrictWindow,
              category_attendance_workflows: (response as any).category_attendance_workflows || {},
              staff_category: (response as any).staff_category || 'teaching',
            };

        setTodayRecord(finalTodayRec);
        if (foundTodayRec) {
          setAttendanceStatus(foundTodayRec.status as "present" | "absent" | "holiday" | "weekly_off");
          setNotes(foundTodayRec.notes || "");
        } else if ((response as any).is_today_holiday) {
          setAttendanceStatus("holiday");
        }
        
        if ((response as any).next_check_time) {
          setNextCheckTime((response as any).next_check_time);
        } else {
          setNextCheckTime(null);
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

        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weekAgoStr = weekAgo.toLocaleDateString('sv-SE');
          const recent = response.data.filter((r: any) => r.date >= weekAgoStr).slice(0, 7);
          setRecentRecords(recent);

          const today = new Date().toLocaleDateString('sv-SE');
          const orgCheckinWindows = (response as any).checkin_windows || [];
          const orgPeriodicCount = (response as any).periodic_checkin_count || 1;
          const orgStrictWindow = (response as any).strict_checkin_window ?? true;
          const orgCategoryWorkflows = (response as any).category_attendance_workflows || {};
          const userStaffCategory = (response as any).staff_category || 'teaching';

          const foundTodayRec = response.data.find((r: any) => r.date === today) || null;
          const finalTodayRec: FacultyAttendanceRecord = foundTodayRec
            ? {
                ...foundTodayRec,
                checkin_windows: (foundTodayRec.checkin_windows && foundTodayRec.checkin_windows.length > 0) ? foundTodayRec.checkin_windows : orgCheckinWindows,
                periodic_checkin_count: foundTodayRec.periodic_checkin_count || orgPeriodicCount,
                strict_checkin_window: foundTodayRec.strict_checkin_window ?? orgStrictWindow,
                category_attendance_workflows: orgCategoryWorkflows,
                staff_category: userStaffCategory
              }
            : {
                id: `today-${today}`,
                date: today,
                status: (response as any).is_today_holiday ? 'holiday' : 'absent',
                marked_at: '',
                check_in_time: null,
                check_out_time: null,
                total_hours: null,
                notes: '',
                checkin_timestamps: [],
                delays: [],
                periodic_checkin_count: orgPeriodicCount,
                checkin_windows: orgCheckinWindows,
                strict_checkin_window: orgStrictWindow,
                category_attendance_workflows: orgCategoryWorkflows,
                staff_category: userStaffCategory
              };

          setTodayRecord(finalTodayRec);
          if (foundTodayRec) {
            setAttendanceStatus(foundTodayRec.status as "present" | "absent" | "holiday" | "weekly_off");
            setNotes(foundTodayRec.notes || "");
          } else if ((response as any).is_today_holiday) {
            setAttendanceStatus("holiday");
          }
          
          if ((response as any).next_check_time) {
            setNextCheckTime((response as any).next_check_time);
          } else {
            setNextCheckTime(null);
          }
          setLoading(false);
        }
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
    setStartCalendarOpen(false);
    if (date) {
      setTimeout(() => setEndCalendarOpen(true), 150);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setHistoryEndDate(date);
    setHistoryPage(1);
    setEndCalendarOpen(false);
  };

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getFlowState = () => {
    if (!todayRecord) return { currentAction: 'check_in', label: 'Check In', isCheckOut: false, isAllowed: true, nextText: null, isCompleted: false };

    const catWorkflows = (todayRecord as any).category_attendance_workflows || {};
    const userCat = todayRecord.staff_category || 'teaching';
    const catConfig = catWorkflows[userCat] || catWorkflows['teaching'];
    const mode = catConfig?.mode || 'half_day_split';
    const strictWindow = catConfig?.strict_window !== false;

    const toMinutes = (t?: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
    const getWindowPhase = (w?: {start:string,end:string}) => {
      if (!w) return 'active';
      const now = nowMin();
      if (now < toMinutes(w.start)) return 'upcoming';
      if (now <= toMinutes(w.end)) return 'active';
      return 'passed';
    };
    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const hds = catConfig?.half_day_split;
    const fd  = catConfig?.full_day;
    const windows = {
      first_half_in:   hds?.first_half_in,
      first_half_out:  hds?.first_half_out,
      second_half_in:  hds?.second_half_in,
      second_half_out: hds?.second_half_out,
      check_in:  fd?.check_in,
      check_out: fd?.check_out,
    } as Record<string, {start:string,end:string}|undefined>;

    let currentAction = 'check_in';
    let isCompleted = false;

    const checkMissed = (hasTime: boolean, action: string) => {
      if (hasTime) return false;
      const w = windows[action];
      return w && strictWindow && getWindowPhase(w) === 'passed';
    };

    if (mode === 'half_day_split') {
      const has1stIn  = !!todayRecord.first_check_in;
      const has1stOut = !!todayRecord.first_check_out;
      const has2ndIn  = !!todayRecord.second_check_in;
      const has2ndOut = !!todayRecord.second_check_out;
      
      const missed1stIn = !has1stIn && checkMissed(has1stIn, 'first_half_in');
      const missed1stOut = !has1stOut && checkMissed(has1stOut, 'first_half_out');
      const missed2ndIn = !has2ndIn && checkMissed(has2ndIn, 'second_half_in');
      const missed2ndOut = !has2ndOut && checkMissed(has2ndOut, 'second_half_out');

      if (!has1stIn && !missed1stIn) currentAction = 'first_half_in';
      else if (!has1stOut && !missed1stOut && has1stIn) currentAction = 'first_half_out';
      else if (!has2ndIn && !missed2ndIn)  currentAction = 'second_half_in';
      else if (!has2ndOut && !missed2ndOut && has2ndIn) currentAction = 'second_half_out';
      else                 isCompleted = true;
    } else {
      const hasCheckIn = !!todayRecord.check_in_time;
      const hasCheckOut = !!todayRecord.check_out_time;
      
      const missedIn = !hasCheckIn && checkMissed(hasCheckIn, 'check_in');
      const missedOut = !hasCheckOut && checkMissed(hasCheckOut, 'check_out');

      if (!hasCheckIn && !missedIn) currentAction = 'check_in';
      else if (!hasCheckOut && !missedOut && hasCheckIn) currentAction = 'check_out';
      else                                  isCompleted = true;
    }

    const actionLabels: Record<string,string> = {
      first_half_in: '1st Half In', first_half_out: '1st Half Out',
      second_half_in: '2nd Half In', second_half_out: '2nd Half Out',
      check_in: 'Check In', check_out: 'Check Out',
    };
    
    const label = actionLabels[currentAction] || 'Check In';
    const isCheckOut = ['first_half_out','second_half_out','check_out'].includes(currentAction);
    
    const currentWindow = windows[currentAction];
    const phase = getWindowPhase(currentWindow);
    const isAllowed = (!currentWindow) || (phase === 'active') || (!strictWindow && phase === 'passed');
    
    let nextText = null;
    if (!isCompleted && currentWindow) {
      if (phase === 'upcoming') nextText = `Next: ${label} window opens at ${formatTime(currentWindow.start)}`;
      else if (phase === 'active') nextText = `${label} window active (Closes at ${formatTime(currentWindow.end)})`;
      else if (phase === 'passed' && !strictWindow) nextText = `${label} window passed (Late allowed)`;
      else if (phase === 'passed' && strictWindow) nextText = `${label} window closed`;
    }

    return { currentAction, label, isCheckOut, isAllowed, nextText, isCompleted };
  };

  const handleTempStartDateChange = (date: Date | undefined) => {
    setTempStartDate(date);
    setStartCalendarOpen(false);
    if (date) {
      setTimeout(() => setEndCalendarOpen(true), 150);
    }
  };

  const handleTempEndDateChange = (date: Date | undefined) => {
    setTempEndDate(date);
    setEndCalendarOpen(false);
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

  const handleToggleAttendance = async (status: "present" | "absent", action?: string) => {
    const isCheckInAction = action ? !['first_half_out', 'second_half_out', 'check_out'].includes(action) : false;
    const capitalizedStatus = action ? (isCheckInAction ? "Check In" : "Check Out") : (status.charAt(0).toUpperCase() + status.slice(1));
    const actionText = action ? (isCheckInAction ? "check in" : "check out") : `mark today's attendance as ${status}`;
    const confirmResult = await Swal.fire({
      title: `Confirm ${capitalizedStatus}?`,
      text: `Are you sure you want to ${actionText}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: action ? `Yes, ${capitalizedStatus}` : `Yes, Mark ${capitalizedStatus}`,
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
      let deviceId: string | undefined = undefined;

      try {
        const info = await Device.getId();
        deviceId = info.identifier;
      } catch (e) {
        // Fallback for non-capacitor environments
        deviceId = "web-" + navigator.userAgent.substring(0, 50);
      }

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

          if (err && err.code === 1) toast.error('Location permission denied. Enable location to mark present.'); else
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
        }
      }

      setLoadingMessage("Syncing with server...");
      const requestData: MarkFacultyAttendanceRequest & any = {
        status,
        action,
        notes: notes.trim() || undefined,
        deviceId
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
      } else if (response.error_code === 'CAMPUS_LOCATION_NOT_SET') {
        await Swal.fire({
          title: "Campus Location Not Configured",
          html: `<div class="text-left text-sm space-y-2">
            <p>Geo-location based attendance is not available.</p>
            <p class="font-semibold text-red-500 mt-2">🏫 Your campus boundary has not been set up by the administration yet.</p>
            <p class="mt-2 text-xs text-muted-foreground">Please contact your administrator to configure the campus location before you can mark geo-location attendance.</p>
          </div>`,
          icon: "error",
          confirmButtonText: "OK, Got it",
          confirmButtonColor: "#ef4444",
          background: theme === "dark" ? "#1c1c1e" : "#ffffff",
          color: theme === "dark" ? "#f5f5f5" : "#111827",
        });
      } else if (response.allow_self_declaration) {
        const distanceInfo = response.location?.distance_meters 
          ? ` (Distance: ${Math.round(response.location.distance_meters)}m outside boundary)` 
          : "";
        const selfDeclarationResult = await Swal.fire({
          title: "Outside Campus Boundary",
          html: `<div class="text-left text-sm space-y-2">
            <p>You are currently outside the campus boundary${distanceInfo}.</p>
            <p class="font-semibold text-amber-500 mt-2">⚠️ Your attendance will be logged as <strong>Outside Campus (Self-Declared)</strong>, and your exact coordinates will be stored for audit.</p>
            <p class="mt-4 text-xs font-semibold">Please enter your reason for off-campus duty to proceed:</p>
          </div>`,
          icon: "warning",
          input: "textarea",
          inputPlaceholder: "E.g., Client meeting, official seminar, university visit, field work...",
          inputAttributes: {
            'aria-label': 'Type your reason here'
          },
          showCancelButton: true,
          confirmButtonText: "Declare & Check In",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#f59e0b",
          background: theme === "dark" ? "#1c1c1e" : "#ffffff",
          color: theme === "dark" ? "#E4E4E7" : "#000000",
          inputValidator: (value) => {
            if (!value || !value.trim()) {
              return 'You must enter a reason for off-campus duty!';
            }
            return null;
          }
        });

        if (selfDeclarationResult.isConfirmed && selfDeclarationResult.value) {
          setLoadingMessage("Submitting declaration...");
          const retryResponse = await markFacultyAttendance({
            ...requestData,
            off_campus_reason: selfDeclarationResult.value.trim()
          });

          if (retryResponse.success) {
            const isUpdate = retryResponse.data?.updated || false;
            toast.success(isUpdate ? `Attendance updated to ${status} (Off-Campus)` : `Attendance marked as ${status} (Off-Campus)`);
            setAttendanceStatus(status);
            await fetchAttendanceData();
          } else {
            Swal.fire({
              title: "Action Blocked",
              text: retryResponse.message || "Failed to mark off-campus attendance",
              icon: "error",
              confirmButtonText: "Okay",
              confirmButtonColor: "#ef4444",
              background: theme === "dark" ? "#1c1c1e" : "#ffffff",
              color: theme === "dark" ? "#E4E4E7" : "#000000",
            });
          }
        }
      } else {
        Swal.fire({
          title: "Action Blocked",
          text: response.message || "Failed to mark attendance",
          icon: "error",
          confirmButtonText: "Okay",
          confirmButtonColor: "#ef4444",
          background: theme === "dark" ? "#1c1c1e" : "#ffffff",
          color: theme === "dark" ? "#E4E4E7" : "#000000",
        });
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

  const handleOffCampusDuty = async () => {
    // Step 1: Show warning + reason input
    const result = await Swal.fire({
      title: "Off-Campus Duty Check-In",
      html: `<div class="text-left text-sm space-y-2">
        <p>You are declaring that you are currently <strong>outside the campus</strong> on official duty.</p>
        <p class="font-semibold text-amber-500 mt-2">⚠️ Your attendance will be logged as <strong>Outside Campus (Self-Declared)</strong>, and your exact coordinates will be stored for audit.</p>
        <p class="mt-4 text-xs font-semibold">Please enter your reason for off-campus duty to proceed:</p>
      </div>`,
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "E.g., Client meeting, official seminar, university visit, field work...",
      inputAttributes: { 'aria-label': 'Type your reason here' },
      showCancelButton: true,
      confirmButtonText: "Declare & Check In",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f59e0b",
      background: theme === "dark" ? "#1c1c1e" : "#ffffff",
      color: theme === "dark" ? "#E4E4E7" : "#000000",
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'You must enter a reason for off-campus duty!';
        return null;
      }
    });

    if (!result.isConfirmed || !result.value) return;
    const off_campus_reason = result.value.trim();

    // Step 2: Get location
    setIsSubmitting(true);
    setMarkingStatus('present');
    setLoadingMessage('Getting your location...');
    let latitude: number | undefined;
    let longitude: number | undefined;
    let device_info: object | undefined;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Location timeout')), 10000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(timer); resolve(p); },
          (err) => { clearTimeout(timer); reject(err); },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }).catch((err) => {
        if (err && err.code === 1) toast.error('Location permission denied. Enable location to check in.');
        else toast.error('Unable to get device location.');
        return null;
      });

      if (!pos) {
        setIsSubmitting(false);
        setMarkingStatus(null);
        setLoadingMessage('');
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

      setLoadingMessage('Syncing with server...');
      const response = await markFacultyAttendance({
        status: 'present',
        action: 'check_in',
        off_campus_reason,
        latitude,
        longitude,
        device_info,
        notes: notes.trim() || undefined,
      });

      if (response.success) {
        setLoadingMessage('Almost done...');
        toast.success('Off-campus check-in recorded successfully!');
        setAttendanceStatus('present');
        await fetchAttendanceData();
      } else {
        Swal.fire({
          title: 'Action Blocked',
          text: response.message || 'Failed to mark off-campus attendance',
          icon: 'error',
          confirmButtonText: 'Okay',
          confirmButtonColor: '#ef4444',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
        });
      }
    } catch {
      toast.error('Network error occurred');
    } finally {
      setIsSubmitting(false);
      setMarkingStatus(null);
      setLoadingMessage('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "absent":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "holiday":
        return <CalendarIcon className="w-5 h-5 text-blue-600" />;
      case "weekly_off":
        return <CalendarIcon className="w-5 h-5 text-slate-500" />;
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
      case "holiday":
        return theme === 'dark' ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200';
      case "weekly_off":
        return theme === 'dark' ? 'bg-slate-900/20 border-slate-700' : 'bg-slate-50 border-slate-200';
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
            <CardTitle className={`text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Today's Attendance
            </CardTitle>
            <div className={`mt-2 p-3 rounded-md text-sm border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              <div className="flex gap-2">
                <span className="font-semibold">Note:</span>
                <span>Your attendance is linked to this specific device for today and requires campus location verification for both Check-In and Check-Out. You cannot mark attendance on someone else's behalf.</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pb-0">
            {attendanceStatus === 'holiday' || attendanceStatus === 'weekly_off' ? (
              <div className="flex flex-col items-center py-6 space-y-3">
                <div className={`p-4 rounded-full ${
                  attendanceStatus === 'holiday'
                    ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')
                    : (theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
                }`}>
                  <CalendarIcon className="w-10 h-10" />
                </div>
                <span className="text-xl font-bold capitalize">
                  {attendanceStatus === 'holiday' ? 'Institutional Holiday' : 'Weekly Off'}
                </span>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  No attendance check-in is required today. Enjoy your day off!
                </p>
              </div>
            ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center space-x-4">
                    
                    {/* Check In / Check Out Button */}
                    {attendanceStatus !== "absent" && (() => {
                      const { currentAction, isCheckOut, isAllowed, isCompleted } = getFlowState();
                      return (
                        <motion.button
                          onClick={() => handleToggleAttendance("present", currentAction as any)}
                          disabled={isSubmitting || isCompleted || !isAllowed}
                          className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg disabled:cursor-not-allowed ${markingStatus === 'present' ?
                            'bg-blue-500 text-white animate-pulse' :
                            isCompleted ?
                              (theme === 'dark' ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400') :
                            !isAllowed ?
                              (theme === 'dark' ? 'bg-red-900/20 text-red-500/50 border-2 border-red-900/30' : 'bg-red-50 text-red-400 border-2 border-red-100 opacity-60') :
                            isCheckOut ?
                              'bg-orange-500 text-white scale-110' :
                              theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'}`
                          }
                          whileHover={{ scale: isCompleted || !isAllowed ? 1 : 1.05 }}
                          whileTap={{ scale: isCompleted || !isAllowed ? 1 : 0.95 }}
                        >
                          {markingStatus === 'present' ?
                            <Loader2 className="w-8 h-8 animate-spin" /> :
                            isCompleted ? <CheckCircle className="w-8 h-8" /> :
                            !isAllowed ? <XCircle className="w-8 h-8" /> :
                            isCheckOut ? <Clock className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />
                          }
                        </motion.button>
                      );
                    })()}
  
                    {/* Absent Button (only if not checked in) */}
                    {!(todayRecord?.first_check_in || todayRecord?.check_in_time) && (() => {
                      const { isCompleted } = getFlowState();
                      return (
                        <motion.button
                          onClick={() => handleToggleAttendance("absent")}
                          disabled={isSubmitting || !!attendanceStatus || isCompleted}
                          className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${markingStatus === 'absent' ?
                            'bg-blue-500 text-white animate-pulse' :
                            attendanceStatus === 'absent' ?
                              'bg-red-500 text-white scale-110' :
                              theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'}`
                          }
                          whileHover={{ scale: attendanceStatus === 'absent' || markingStatus === 'absent' || isCompleted ? 1 : (isCompleted ? 1 : 1.05) }}
                          whileTap={{ scale: isCompleted ? 1 : 0.95 }}
                        >
                          {markingStatus === 'absent' ?
                            <Loader2 className="w-8 h-8 animate-spin" /> :
                            <XCircle className="w-8 h-8" />
                          }
                        </motion.button>
                      );
                    })()}
                  </div>
  
                  {/* Button Labels */}
                  <div className="flex items-center space-x-8 text-sm font-medium">
                    {attendanceStatus !== "absent" && (() => {
                      const { label, isCheckOut, isCompleted } = getFlowState();
                      return (
                        <motion.span
                          className={markingStatus === 'present' ? 'text-blue-500' : isCompleted ? 'text-gray-400' : isCheckOut ? 'text-orange-600' : 'text-gray-500'}
                        >
                          {markingStatus === 'present' ? 'Processing...' : isCompleted ? 'Completed' : label}
                        </motion.span>
                      );
                    })()}
                    {!(todayRecord?.first_check_in || todayRecord?.check_in_time) && (
                      <motion.span
                        className={markingStatus === 'absent' ? 'text-blue-500' : attendanceStatus === 'absent' ? 'text-red-600' : 'text-gray-500'}
                      >
                        {markingStatus === 'absent' ? 'Marking...' : 'Absent'}
                      </motion.span>
                    )}
                  </div>
                  
                  {(() => {
                    const { nextText } = getFlowState();
                    if (!nextText) return null;
                    return (
                      <div className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {nextText}
                      </div>
                    );
                  })()}
                
                {/* Early Half-Day Checkout — only when checked in, not fully done, and flow not completed */}
                {(todayRecord?.first_check_in || todayRecord?.check_in_time) &&
                  !(todayRecord?.second_check_out || todayRecord?.check_out_time) &&
                  !getFlowState().isCompleted && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleToggleAttendance("present", "check_out")}
                      disabled={isSubmitting}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        ${theme === 'dark'
                          ? 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                          : 'border-orange-400 text-orange-600 hover:bg-orange-50'
                        }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Early / Half-Day Checkout
                    </button>
                  </div>
                )}

                {/* Off-Campus Duty Button — shown only when not yet checked in and not absent */}
                {!(todayRecord?.first_check_in || todayRecord?.check_in_time || (todayRecord?.checkin_timestamps && todayRecord.checkin_timestamps.length > 0)) && attendanceStatus !== 'absent' && (
                  <div className="mt-2">
                    <button
                      onClick={handleOffCampusDuty}
                      disabled={isSubmitting}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        ${theme === 'dark'
                          ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                          : 'border-amber-400 text-amber-600 hover:bg-amber-50'
                        }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Off-Campus Duty? Declare Here
                    </button>
                  </div>
                )}

                {/* Periodic Check-ins & Attendance Summary Box */}
                {todayRecord && (() => {
                  const catWorkflows = (todayRecord as any).category_attendance_workflows || {};
                  const userCat = todayRecord.staff_category || 'teaching';
                  const catConfig = catWorkflows[userCat] || catWorkflows['teaching'];
                  const mode = catConfig?.mode || 'half_day_split';
                  
                  const toMinutes = (t?: string) => {
                    if (!t) return 0;
                    const [h, m] = t.split(':').map(Number);
                    return h * 60 + m;
                  };
                  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
                  
                  const hds = catConfig?.half_day_split;
                  const fd = catConfig?.full_day;

                  const getMissed = (timeVal: string|null|undefined, w?: {end:string}) => {
                    if (timeVal) return false;
                    if (!w || !w.end) return false;
                    return nowMin > toMinutes(w.end);
                  };
                  
                  const checkpoints = mode === 'half_day_split' ? [
                    { label: '1st Half In', time: todayRecord.first_check_in, missed: getMissed(todayRecord.first_check_in, hds?.first_half_in), delay: todayRecord.delays?.[0] },
                    { label: '1st Half Out', time: todayRecord.first_check_out, missed: getMissed(todayRecord.first_check_out, hds?.first_half_out), delay: todayRecord.delays?.[1] },
                    { label: '2nd Half In', time: todayRecord.second_check_in, missed: getMissed(todayRecord.second_check_in, hds?.second_half_in), delay: todayRecord.delays?.[2] },
                    { label: '2nd Half Out', time: todayRecord.second_check_out, missed: getMissed(todayRecord.second_check_out, hds?.second_half_out), delay: todayRecord.delays?.[3] }
                  ] : [
                    { label: 'Check In', time: todayRecord.check_in_time, missed: getMissed(todayRecord.check_in_time, fd?.check_in), delay: todayRecord.delays?.[0] },
                    { label: 'Check Out', time: todayRecord.check_out_time, missed: getMissed(todayRecord.check_out_time, fd?.check_out), delay: todayRecord.delays?.[1] }
                  ];

                  return (
                    <div className={`mt-4 p-4 rounded-lg w-full max-w-sm text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
                      <div className="space-y-2 mb-2">
                        <div className="font-semibold text-sm border-b pb-1 text-left flex justify-between items-center">
                          <span>Checkpoints</span>
                          <span className="text-[10px] font-normal text-muted-foreground">({checkpoints.length} Required)</span>
                        </div>
                        {checkpoints.map((cp, idx) => (
                          <div key={idx} className="flex justify-between text-sm items-center py-0.5">
                            <span className="text-gray-500 font-medium">{cp.label}:</span>
                            {cp.time && cp.time !== "Missed" ? (
                              <div className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400">
                                <span>{format(new Date(cp.time), 'hh:mm a')}</span>
                                {cp.delay && cp.delay > 0 ? (
                                  <span className="text-[10px] text-orange-500 font-bold bg-orange-500/10 px-1 py-0.5 rounded ml-1">
                                    +{cp.delay}m
                                  </span>
                                ) : null}
                              </div>
                            ) : (cp.time === "Missed" || cp.missed) ? (
                              <span className="text-red-500 font-bold">Missed</span>
                            ) : (
                              <span className="text-gray-400 italic">Pending</span>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {todayRecord?.total_hours && (
                        <div className="flex justify-between text-sm font-bold border-t border-gray-300 dark:border-gray-700 pt-2 mt-2">
                          <span>Total Worked:</span>
                          <span className="text-primary font-mono">
                            {(() => {
                              const num = parseFloat(todayRecord.total_hours as string);
                              if (isNaN(num)) return todayRecord.total_hours;
                              const totalSeconds = num * 3600;
                              const h = Math.floor(totalSeconds / 3600);
                              const m = Math.floor((totalSeconds % 3600) / 60);
                              return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}


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
                {attendanceStatus && (todayRecord?.marked_at || todayRecord?.check_in_time || (todayRecord?.checkin_timestamps && todayRecord.checkin_timestamps.some(ts => ts && ts !== 'Missed')) || attendanceStatus === 'holiday' || attendanceStatus === 'weekly_off') &&
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center mt-4">

                    <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                      attendanceStatus === 'present' ?
                        (theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-800') :
                      attendanceStatus === 'holiday' ?
                        (theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-800') :
                      attendanceStatus === 'weekly_off' ?
                        (theme === 'dark' ? 'bg-slate-900/20 text-slate-400' : 'bg-slate-100 text-slate-800') :
                        (theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-800')
                    }`}>
                      {getStatusIcon(attendanceStatus)}
                      <span className="font-medium capitalize">
                        {attendanceStatus === 'weekly_off' ? 'Weekly Off' : attendanceStatus}
                      </span>
                    </div>
                  </motion.div>
                }
              </AnimatePresence>

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
            {todayRecord && (todayRecord.marked_at || todayRecord.check_in_time || (todayRecord.checkin_timestamps && todayRecord.checkin_timestamps.some(ts => ts && ts !== 'Missed')) || todayRecord.status === 'holiday' || todayRecord.status === 'weekly_off') &&
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
                      Marked at {todayRecord.marked_at ? new Date(todayRecord.marked_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', hour12: true }) : '—'}
                    </p>
                    {todayRecord.location ?
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {todayRecord.location.inside ?
                          <>On campus • {todayRecord.location.distance_meters !== null && todayRecord.location.distance_meters !== undefined ? `${Math.round(todayRecord.location.distance_meters)} m` : 'distance unknown'}</> :

                          <>Outside campus • {todayRecord.location.distance_meters !== null && todayRecord.location.distance_meters !== undefined ? `${Math.round(todayRecord.location.distance_meters)} m` : 'distance unknown'}</>
                        }
                        {todayRecord.location.campus_name ? ` • ${todayRecord.location.campus_name}` : ''}
                      </p> :

                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Location not recorded</p>
                    }
                    {todayRecord.notes && (
                      <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {todayRecord.notes.includes('[Off-Campus Check-in]') ? (
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Off-Campus Duty</span>
                            {(() => {
                              const r = todayRecord.notes.replace('[Off-Campus Check-in] Reason:', '').trim();
                              return r.length > 35 ? (
                                <><span>{r.slice(0, 32)}...</span><button onClick={() => Swal.fire({ title: 'Off-Campus Duty Reason', text: r, icon: 'info', confirmButtonText: 'Close', confirmButtonColor: '#3b82f6', background: theme === 'dark' ? '#1c1c1e' : '#ffffff', color: theme === 'dark' ? '#E4E4E7' : '#000000' })} className="text-xs text-blue-500 hover:underline font-bold">(View)</button></>
                              ) : <span>{r}</span>;
                            })()}
                          </span>
                        ) : (
                          <span>Notes: {todayRecord.notes}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Attendance Records */}
        <Card className={`flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 h-[72px] sm:h-[80px]">
            <CardTitle className={`text-xl sm:text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Recent Attendance (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {recentRecords.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
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
                            {record.date.split('-').reverse().join('-')}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-right">
                        <button
                          onClick={() => setSelectedRecordDetails(record)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-primary text-white hover:bg-primary/90'}`}
                        >
                          View
                        </button>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="mt-2 flex items-start space-x-2">
                        <FileText className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                        <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                          {record.notes.includes('[Off-Campus Check-in]') ? (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Off-Campus Duty</span>
                              {(() => {
                                const r = record.notes.replace('[Off-Campus Check-in] Reason:', '').trim();
                                return r.length > 35 ? (
                                  <><span>{r.slice(0, 32)}...</span><button onClick={() => Swal.fire({ title: 'Off-Campus Duty Reason', text: r, icon: 'info', confirmButtonText: 'Close', confirmButtonColor: '#3b82f6', background: theme === 'dark' ? '#1c1c1e' : '#ffffff', color: theme === 'dark' ? '#E4E4E7' : '#000000' })} className="text-xs text-blue-500 hover:underline font-bold">(View)</button></>
                                ) : <span>{r}</span>;
                              })()}
                            </span>
                          ) : record.notes}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center flex-1 py-12 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className={`p-3 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                  <Clock className="w-8 h-8 text-primary opacity-50" />
                </div>
                <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No recent records</h3>
                <p className={`text-xs text-center max-w-[250px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  You haven't marked any attendance in the last 7 days.
                </p>
              </div>
            )}
          </CardContent>
          {!loading && recentTotalPages > 1 && (
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
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all hover:text-white">
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
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all hover:text-white">
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        <Card id="faculty-attendance-history" className={`flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
          <CardHeader id="faculty-attendance-history-header" className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 pb-4 min-h-[72px] sm:h-[80px] gap-3">
            <CardTitle className={`text-xl sm:text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Attendance History
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start mb-3 sm:mb-0">
              {(() => {
                const isFilterDisabled = !historyLoading && historyRecords.length === 0 && !historyStartDate && !historyEndDate;
                const isExportDisabled = exportingPdf || historyLoading || historyRecords.length === 0;

                return (
                  <>
                    {historyStartDate || historyEndDate ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHistoryStartDate(undefined);
                          setHistoryEndDate(undefined);
                          setHistoryPage(1);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-0.5 sm:gap-1 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md text-md sm:text-sm h-9 px-2.5 whitespace-nowrap"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Clear Filter</span>
                      </Button>
                    ) : (
                      <Dialog open={historyFilterOpen} onOpenChange={(open) => {
                        if (open) {
                          setTempStartDate(historyStartDate);
                          setTempEndDate(historyEndDate);
                        }
                        setHistoryFilterOpen(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isFilterDisabled}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-0.5 sm:gap-1 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md text-md sm:text-sm h-9 px-2.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Filter className="w-4 h-4" />
                            <span>Filter</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent
                          className={`w-[90%] max-w-[90%] sm:max-w-[425px] p-6 space-y-4 rounded-xl ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}
                        >
                          <DialogHeader>
                            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Filter Attendance History</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Date</label>
                              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal h-10 px-3 border",
                                      !tempStartDate && "text-muted-foreground",
                                      theme === 'dark' ? 'bg-background border-border text-foreground hover:bg-muted' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {tempStartDate ? format(tempStartDate, "dd-MM-yyyy") : <span>DD-MM-YYYY</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border border-border" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={tempStartDate}
                                    onSelect={handleTempStartDateChange}
                                    disabled={(date) => date > new Date()}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">End Date</label>
                              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal h-10 px-3 border",
                                      !tempEndDate && "text-muted-foreground",
                                      theme === 'dark' ? 'bg-background border-border text-foreground hover:bg-muted' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {tempEndDate ? format(tempEndDate, "dd-MM-yyyy") : <span>DD-MM-YYYY</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border border-border" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={tempEndDate}
                                    onSelect={handleTempEndDateChange}
                                    disabled={(date) => date > new Date() || (tempStartDate ? date <= tempStartDate : false)}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              className="w-full bg-primary hover:bg-primary/90 text-white"
                              onClick={() => {
                                setHistoryStartDate(tempStartDate);
                                setHistoryEndDate(tempEndDate);
                                setHistoryPage(1);
                                setHistoryFilterOpen(false);
                              }}
                            >
                              Apply Filter
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Desktop Export PDF Button */}
                    <Button
                      onClick={handleExportPdf}
                      disabled={isExportDisabled}
                      className="hidden sm:flex bg-primary hover:bg-primary/90 text-white font-semibold h-9 px-4 shadow-md transition-all active:scale-95 items-center justify-center gap-2 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exportingPdf ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      Export PDF
                    </Button>

                    {/* Mobile Export PDF Icon Button */}
                    <Button
                      onClick={handleExportPdf}
                      disabled={isExportDisabled}
                      size="icon"
                      variant="outline"
                      className="flex sm:hidden h-9 w-9 items-center justify-center shrink-0 border border-input bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Export PDF"
                    >
                      {exportingPdf ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-2 sm:pt-0">
            {historyLoading ? (
              <SkeletonList items={5} />
            ) : historyRecords.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {historyRecords.map((record) => (
                  <div key={record.id} className={`p-3 rounded-lg border ${getStatusColor(record.status)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium capitalize">{record.status}</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            {record.date.split('-').reverse().join('-')}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-right">
                        <button
                          onClick={() => setSelectedRecordDetails(record)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-primary text-white hover:bg-primary/90'}`}
                        >
                          View
                        </button>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="mt-2 flex items-start space-x-2">
                        <FileText className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                        <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                          {record.notes.includes('[Off-Campus Check-in]') ? (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Off-Campus Duty</span>
                              {(() => {
                                const r = record.notes.replace('[Off-Campus Check-in] Reason:', '').trim();
                                return r.length > 35 ? (
                                  <><span>{r.slice(0, 32)}...</span><button onClick={() => Swal.fire({ title: 'Off-Campus Duty Reason', text: r, icon: 'info', confirmButtonText: 'Close', confirmButtonColor: '#3b82f6', background: theme === 'dark' ? '#1c1c1e' : '#ffffff', color: theme === 'dark' ? '#E4E4E7' : '#000000' })} className="text-xs text-blue-500 hover:underline font-bold">(View)</button></>
                                ) : <span>{r}</span>;
                              })()}
                            </span>
                          ) : record.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center flex-1 py-16 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
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

          {!historyLoading && historyTotalPages > 1 && (
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
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all hover:text-white">
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
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all hover:text-white">
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
      {selectedRecordDetails && (() => {
        const dateObj = new Date(selectedRecordDetails.date + "T00:00:00");
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const isFuture = selectedRecordDetails.date > todayStr;
        const isPresent = selectedRecordDetails.status?.toLowerCase() === 'present';
        const isAbsent = selectedRecordDetails.status?.toLowerCase() === 'absent';
        
        return (
          <Dialog open={!!selectedRecordDetails} onOpenChange={(open) => {
            if (!open) setSelectedRecordDetails(null);
          }}>
            <DialogContent className={`w-[90%] max-w-[360px] p-0 border-0 rounded-2xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
              <div className={`p-5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-primary/5'} border-b ${theme === 'dark' ? 'border-white/10' : 'border-primary/10'}`}>
                <DialogTitle className="text-lg font-bold">
                  {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </DialogTitle>
                <p className={`text-sm mt-1 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Attendance Record Details
                </p>
              </div>

              <div className="p-5">
                <div className="space-y-4">
                  <div className={`${isPresent ? 'text-green-500 bg-green-500/10' : isAbsent ? 'text-red-500 bg-red-500/10' : 'text-gray-500 bg-gray-500/10'} p-3 rounded-xl font-bold flex items-center gap-2 text-base`}>
                    {isPresent ? <CheckCircle className="w-5 h-5" /> : isAbsent ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />} 
                    {selectedRecordDetails.status === 'not_marked' ? 'Not Marked' : selectedRecordDetails.status.charAt(0).toUpperCase() + selectedRecordDetails.status.slice(1)}
                  </div>
                  
                  {selectedRecordDetails.checkin_timestamps && selectedRecordDetails.checkin_timestamps.length > 0 ? (
                    <div className={`space-y-2 p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      {selectedRecordDetails.checkin_timestamps.map((ts: any, idx: number) => (
                        <div key={idx} className={`flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0 ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                          <span className="font-semibold text-gray-500">
                            {selectedRecordDetails.checkin_timestamps.length === 4
                              ? (idx === 0 ? '1st Half In' : idx === 1 ? '1st Half Out' : idx === 2 ? '2nd Half In' : '2nd Half Out')
                              : (idx === 0 ? 'Check In' : 'Check Out')}
                          </span>
                          <div className="flex items-center gap-2">
                            {ts === "Missed" ? (
                              <span className="text-red-500 font-bold">Missed</span>
                            ) : ts ? (
                              <>
                                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                                {selectedRecordDetails.delays && selectedRecordDetails.delays[idx] > 0 && (
                                  <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                    +{selectedRecordDetails.delays[idx]}m
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 italic font-medium">Pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {selectedRecordDetails.check_out_time && (
                        <div className={`flex items-center justify-between font-bold pt-2 border-t mt-2 ${theme === 'dark' ? 'border-white/10' : 'border-gray-300'}`}>
                          <span className="text-gray-500">Check Out</span> 
                          <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(selectedRecordDetails.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (selectedRecordDetails.first_check_in || selectedRecordDetails.check_in_time || selectedRecordDetails.second_check_out || selectedRecordDetails.check_out_time) && (
                    <div className={`space-y-2 p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      {(selectedRecordDetails.first_check_in || selectedRecordDetails.check_in_time) && (
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-500">{selectedRecordDetails.first_check_in ? '1st Half In' : 'Check In'}</span> 
                          <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(selectedRecordDetails.first_check_in || selectedRecordDetails.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            {selectedRecordDetails.delays?.[0] > 0 && (
                              <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                +{selectedRecordDetails.delays[0]}m
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {selectedRecordDetails.first_check_out && (
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-500">1st Half Out</span> 
                          <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(selectedRecordDetails.first_check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      )}
                      {selectedRecordDetails.second_check_in && (
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-500">2nd Half In</span> 
                          <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(selectedRecordDetails.second_check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            {selectedRecordDetails.delays?.[2] > 0 && (
                              <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                +{selectedRecordDetails.delays[2]}m
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {(selectedRecordDetails.second_check_out || selectedRecordDetails.check_out_time) && (
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-500">{selectedRecordDetails.second_check_out ? '2nd Half Out' : 'Check Out'}</span> 
                          <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(selectedRecordDetails.second_check_out || selectedRecordDetails.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedRecordDetails.total_hours && (
                    <div className="flex items-center justify-between font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/20">
                      <span>Total Worked</span>
                      <span>{formatTotalHours(selectedRecordDetails.total_hours)}</span>
                    </div>
                  )}

                  {selectedRecordDetails.notes?.includes('[Off-Campus Check-in]') && (
                    <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 font-semibold leading-relaxed">
                      <span className="block text-xs uppercase tracking-wider font-black mb-1 opacity-70">Off-Campus Duty</span>
                      {selectedRecordDetails.notes.replace('[Off-Campus Check-in] Reason:', '').trim()}
                    </div>
                  )}
                </div>
              </div>

              <div className={`p-4 border-t ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
                <Button variant="outline" className="w-full font-bold" onClick={() => setSelectedRecordDetails(null)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>);

};

export default FacultyAttendance;