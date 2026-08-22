import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from "react";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Calendar, Users, CheckCircle, XCircle, Clock, FileDown, CalendarIcon, CalendarX, ClipboardX, Building2 } from "lucide-react";
import { getAdminFacultyAttendanceToday, getAdminFacultyAttendanceRecords, manageBranches } from "../../utils/admin_api";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { useTheme } from "../../context/ThemeContext";
import { SkeletonCard, SkeletonTable } from "../ui/skeleton";
import Swal from "sweetalert2";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isBefore, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from
  "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";

interface FacultyAttendanceTodayRecord {
  id: string;
  faculty_name: string;
  faculty_id: string;
  status: string;
  marked_at: string | null;
  notes: string | null;
  location?: {
    latitude?: number | null;
    longitude?: number | null;
    inside?: boolean | null;
    distance_meters?: number | null;
    campus_name?: string | null;
  } | null;
}

interface FacultyAttendanceRecord {
  id: string;
  faculty_name: string;
  faculty_id: string;
  date: string;
  status: string;
  marked_at: string;
  notes: string;
  location?: {
    latitude?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    inside?: boolean | null;
    distance_meters?: number | null;
    campus_name?: string | null;
  } | null;
  checkin_timestamps?: string[] | null;
  delays?: number[] | null;
  periodic_checkin_count?: number;
}

interface FacultySummary {
  id: string;
  name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  attendance_percentage: number;
}

const AdminFacultyAttendanceView: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [showOffCampusOnly, setShowOffCampusOnly] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<FacultyAttendanceTodayRecord[]>([]);
  const [exportingToday, setExportingToday] = useState(false);
  const [exportingRecords, setExportingRecords] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<FacultyAttendanceRecord[]>([]);
  const [facultySummary, setFacultySummary] = useState<FacultySummary[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");

  useEffect(() => {
    const fetchBranches = async () => {
      const res = await manageBranches({ page_size: 100, compact: true });
      if (res.success && res.results) {
        setBranches(res.results);
      } else if (res.success && res.branches) {
        setBranches(res.branches);
      }
    };
    fetchBranches();
  }, []);

  const uniqueFaculties = React.useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();

    todayAttendance.forEach(f => {
      if (f.faculty_id && !seen.has(f.faculty_id)) {
        seen.add(f.faculty_id);
        list.push({ id: f.faculty_id, name: f.faculty_name });
      }
    });

    facultySummary.forEach(f => {
      if (f.id && !seen.has(f.id)) {
        seen.add(f.id);
        list.push({ id: f.id, name: f.name });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [todayAttendance, facultySummary]);
  const [isTodayLoading, setIsTodayLoading] = useState(false);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'records'>('today');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE'), // 30 days ago
    end_date: new Date().toLocaleDateString('sv-SE') // today
  });
  const [selectedFaculty, setSelectedFaculty] = useState<FacultySummary | null>(null);
  const [facultyAttendanceDetails, setFacultyAttendanceDetails] = useState<FacultyAttendanceRecord[]>([]);
  const [selectedDateDetailsStr, setSelectedDateDetailsStr] = useState<string | null>(null);
  const [selectedTodayRecord, setSelectedTodayRecord] = useState<any>(null);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [todayPagination, setTodayPagination] = useState({
    page: 1,
    page_size: 50,
    total_pages: 1,
    total_items: 0,
    has_next: false,
    has_prev: false,
    next_page: null as number | null,
    prev_page: null as number | null
  });
  const [recordsPagination, setRecordsPagination] = useState({
    page: 1,
    page_size: 50,
    total_pages: 1,
    total_items: 0,
    has_next: false,
    has_prev: false,
    next_page: null as number | null,
    prev_page: null as number | null
  });
  const [todaySummary, setTodaySummary] = useState({
    total_faculty: 0,
    present: 0,
    absent: 0,
    not_marked: 0
  });
  const { theme } = useTheme();

  const fetchTodayAttendance = async (page: number = 1, pageSize: number = 50) => {
    if (!selectedBranch) return;
    setIsTodayLoading(true);
    try {
      const response = await getAdminFacultyAttendanceToday(selectedBranch, { page, page_size: pageSize });
      if (response.success && response.data) {
        setTodayAttendance(response.data);
        // Normalize pagination from various backend shapes
        const norm = normalizePaginatedResponse(response, 'data');
        if (norm.meta && Object.keys(norm.meta).length > 0) {
          const meta = norm.meta;
          const pgSize = response.page_size || response.pageSize || pageSize;
          setTodayPagination({
            page: meta.currentPage || meta.current_page || page,
            page_size: pgSize,
            total_pages: meta.totalPages || meta.total_pages || Math.ceil((meta.totalItems || meta.total_items || 0) / pgSize) || 1,
            total_items: meta.totalItems || meta.total_items || 0,
            has_next: !!meta.next,
            has_prev: !!meta.previous,
            next_page: meta.next ? (meta.currentPage || page) + 1 : null,
            prev_page: meta.previous ? (meta.currentPage || page) - 1 : null
          });
        } else if (response.pagination) {
          const p = response.pagination || {};
          setTodayPagination({
            page: p.current_page || p.page || page,
            page_size: p.page_size || p.pageSize || pageSize,
            total_pages: p.total_pages || p.totalPages || 1,
            total_items: p.total_items || p.count || 0,
            has_next: !!p.next,
            has_prev: !!p.previous,
            next_page: p.next ? (p.current_page || p.page || page) + 1 : null,
            prev_page: p.previous ? (p.current_page || p.page || page) - 1 : null
          });
        } else if (response.count !== undefined) {
          setTodayPagination({
            page: page,
            page_size: pageSize,
            total_pages: response.total_pages || Math.ceil(response.count / pageSize) || 1,
            total_items: response.count,
            has_next: !!response.next,
            has_prev: !!response.previous,
            next_page: response.next ? page + 1 : null,
            prev_page: response.previous ? page - 1 : null
          });
        }
        if (response.summary) {
          setTodaySummary(response.summary);
        }
      } else {

        // Reset pagination and summary on error
        setTodayPagination({
          page: 1,
          page_size: pageSize,
          total_pages: 1,
          total_items: 0,
          has_next: false,
          has_prev: false,
          next_page: null,
          prev_page: null
        });
        setTodaySummary({
          total_faculty: 0,
          present: 0,
          absent: 0,
          not_marked: 0
        });
      }
    } catch (error) {

      Swal.fire("Error", "Failed to load today's attendance data", "error");
      // Reset state on error
      setTodayAttendance([]);
      setTodayPagination({
        page: 1,
        page_size: pageSize,
        total_pages: 1,
        total_items: 0,
        has_next: false,
        has_prev: false,
        next_page: null,
        prev_page: null
      });
      setTodaySummary({
        total_faculty: 0,
        present: 0,
        absent: 0,
        not_marked: 0
      });
    } finally {
      setIsTodayLoading(false);
    }
  };

  const fetchAttendanceRecords = async (page: number = 1, pageSize: number = 50) => {
    if (!selectedBranch) return;
    setIsRecordsLoading(true);
    try {
      const params: any = {
        page,
        page_size: pageSize
      };
      if (dateRange.start_date) params.start_date = dateRange.start_date;
      if (dateRange.end_date) params.end_date = dateRange.end_date;

      const response = await getAdminFacultyAttendanceRecords(selectedBranch, params);
      if (response.success) {
        setAttendanceRecords(response.data || []);
        setFacultySummary(response.faculty_summary || []);
        // Normalize pagination
        const norm2 = normalizePaginatedResponse(response, 'data');
        if (norm2.meta && Object.keys(norm2.meta).length > 0) {
          const meta = norm2.meta;
          const pgSize = response.page_size || response.pageSize || pageSize;
          setRecordsPagination({
            page: meta.currentPage || meta.current_page || page,
            page_size: pgSize,
            total_pages: meta.totalPages || meta.total_pages || Math.ceil((meta.totalItems || meta.total_items || 0) / pgSize) || 1,
            total_items: meta.totalItems || meta.total_items || 0,
            has_next: !!meta.next,
            has_prev: !!meta.previous,
            next_page: meta.next ? (meta.currentPage || page) + 1 : null,
            prev_page: meta.previous ? (meta.currentPage || page) - 1 : null
          });
        } else if (response.pagination) {
          const p = response.pagination || {};
          setRecordsPagination({
            page: p.current_page || p.page || page,
            page_size: p.page_size || p.pageSize || pageSize,
            total_pages: p.total_pages || p.totalPages || 1,
            total_items: p.total_items || p.count || 0,
            has_next: !!p.next,
            has_prev: !!p.previous,
            next_page: p.next ? (p.current_page || p.page || page) + 1 : null,
            prev_page: p.previous ? (p.current_page || p.page || page) - 1 : null
          });
        } else if (response.count !== undefined) {
          setRecordsPagination({
            page: page,
            page_size: pageSize,
            total_pages: response.total_pages || Math.ceil(response.count / pageSize) || 1,
            total_items: response.count,
            has_next: !!response.next,
            has_prev: !!response.previous,
            next_page: response.next ? page + 1 : null,
            prev_page: response.previous ? page - 1 : null
          });
        }
      } else {

        // Reset pagination on error
        setRecordsPagination({
          page: 1,
          page_size: pageSize,
          total_pages: 1,
          total_items: 0,
          has_next: false,
          has_prev: false,
          next_page: null,
          prev_page: null
        });
      }
    } catch (error) {

      Swal.fire("Error", "Failed to load attendance records", "error");
      // Reset state on error
      setAttendanceRecords([]);
      setFacultySummary([]);
      setRecordsPagination({
        page: 1,
        page_size: pageSize,
        total_pages: 1,
        total_items: 0,
        has_next: false,
        has_prev: false,
        next_page: null,
        prev_page: null
      });
    } finally {
      setIsRecordsLoading(false);
    }
  };

  const handleExportTodayExcel = async () => {
    if (!selectedBranch) {
      Swal.fire("Info", "Please select a branch first", "info");
      return;
    }
    setExportingToday(true);
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/attendance/?role=teacher&start_date=${todayStr}&end_date=${todayStr}&export_format=excel&branch_id=${selectedBranch}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const formattedDateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        a.download = `Faculty_Attendance_Today_${formattedDateStr.replace(/ /g, '_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        Swal.fire("Error", result.message || "Failed to export Excel", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error while exporting Excel", "error");
    } finally {
      setExportingToday(false);
    }
  };

  const handleExportRecordsExcel = async () => {
    if (!selectedBranch) {
      Swal.fire("Info", "Please select a branch first", "info");
      return;
    }
    if (facultySummary.length === 0) {
      Swal.fire("Info", "No records to export", "info");
      return;
    }

    setExportingRecords(true);
    try {
      const params = new URLSearchParams({
        role: 'teacher',
        branch_id: selectedBranch,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        export_format: 'excel',
      });
      if (selectedFacultyId && selectedFacultyId !== "all") {
        params.append("faculty_id", selectedFacultyId);
      }
      
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/fees-manager/reports/attendance/?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Faculty_Attendance_Summary_${dateRange.start_date}_to_${dateRange.end_date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        Swal.fire("Error", result.message || "Failed to export Excel", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error while exporting Excel", "error");
    } finally {
      setExportingRecords(false);
    }
  };

  const fetchFacultyDetails = async (faculty: FacultySummary) => {
    setIsDetailLoading(true);
    setSelectedFaculty(faculty);
    try {
      const response = await getAdminFacultyAttendanceRecords(selectedBranch, {
        faculty_id: faculty.id,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        page_size: 1000 // Load all for the selected range to build calendar
      });
      if (response.success) {
        setFacultyAttendanceDetails(response.data || []);
        setHolidayDates(response.holidays || []);
      } else {
        Swal.fire("Error", "Failed to load faculty details", "error");
      }
    } catch (error) {

      Swal.fire("Error", "Network error while loading faculty details", "error");
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    setSelectedFacultyId("all");
    setSelectedFaculty(null);
    setTodayAttendance([]);
    setFacultySummary([]);
    setAttendanceRecords([]);
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch) {
      if (activeTab === 'today') {
        fetchTodayAttendance(1, todayPagination.page_size);
      } else {
        fetchAttendanceRecords(1, recordsPagination.page_size);
      }
    }
  }, [activeTab, dateRange, selectedBranch]);

  useEffect(() => {
    const handleTourTabSwitch = (e: Event) => {
      const tab = (e as CustomEvent<{ tab: string }>).detail?.tab;
      if (tab === 'today' || tab === 'records') {
        setActiveTab(tab as 'today' | 'records');
      }
    };
    window.addEventListener('stalightcampus_switch_tab', handleTourTabSwitch);
    return () => window.removeEventListener('stalightcampus_switch_tab', handleTourTabSwitch);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium status-badge";
    switch (status.toLowerCase()) {
      case 'present':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'absent':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString || dateString === 'Invalid Date') return 'Not marked';

    try {
      // Handle different date formats
      let date: Date;

      // If it's just a time string like "08:37:48", create a date for today
      if (/^\d{2}:\d{2}:\d{2}$/.test(dateString)) {
        const today = new Date().toLocaleDateString('sv-SE'); // Get YYYY-MM-DD
        date = new Date(`${today}T${dateString}`);
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {

        return 'Invalid Date';
      }

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {

      return 'Invalid Date';
    }
  };

  const formatTotalHours = (hours: any) => {
    if (!hours) return null;
    const num = typeof hours === 'string' && hours.includes('h') ? NaN : parseFloat(hours);
    if (isNaN(num)) return hours;
    const totalSeconds = num * 3600;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  const handlePageChange = (newPage: number) => {
    setTodayPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRecordsPageChange = (newPage: number) => {
    setRecordsPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRecordsPageSizeChange = (newPageSize: number) => {
    setRecordsPagination((prev) => ({ ...prev, page_size: newPageSize, page: 1 })); // Reset to page 1 when changing page size
  };

  const displayedTodayAttendance = showOffCampusOnly
    ? todayAttendance.filter(record => record.notes?.includes('[Off-Campus Check-in]'))
    : todayAttendance;

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          #faculty-attendance-dashboard-title {
            font-size: 22px !important;
          }
          #faculty-attendance-dashboard-subtitle {
            font-size: 15px !important;
          }
          #hod-faculty-attendance-tabs button {
            font-size: 15px !important;
            padding: 10px 8px !important;
          }
          #hod-faculty-attendance-summary p.text-xs {
            font-size: 15px !important;
          }
          #hod-faculty-attendance-summary p.text-lg {
            font-size: 22px !important;
          }
          .card-title-text {
            font-size: 18px !important;
          }
          .export-btn {
            font-size: 17px !important;
            padding: 8px 12px !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
          }
          .today-export-btn {
            width: auto !important;
            padding: 8px !important;
          }
          th {
            font-size: 16px !important;
            padding: 8px 12px !important;
          }
          td {
            font-size: 15px !important;
            padding: 10px 12px !important;
          }
          .faculty-name {
            font-size: 14px !important;
          }
          .status-badge {
            font-size: 14px !important;
          }
          .meta-text {
            font-size: 14px !important;
          }
          .location-text {
            font-size: 13px !important;
          }
          .pagination-btn {
            font-size: 15px !important;
            padding: 6px 12px !important;
          }
          .pagination-text {
            font-size: 15px !important;
          }
          #hod-faculty-attendance-filters label {
            font-size: 15px !important;
          }
          #hod-faculty-attendance-filters button, #hod-faculty-attendance-filters [role="combobox"], #hod-faculty-attendance-filters span {
            font-size: 15px !important;
          }
          /* Detail Modal Font Adjustments */
          .detail-day-weekday {
            font-size: 14px !important;
          }
          .detail-day-num {
            font-size: 22px !important;
          }
          .detail-day-month {
            font-size: 13px !important;
          }
          .detail-status-badge {
            font-size: 10px !important;
          }
        }
      `}</style>
      <div id="faculty-attendance-dashboard-container" className={`space-y-6 animate-fade-in ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <Card id="faculty-attendance-card" className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}>
          <CardHeader id="faculty-attendance-header-section" className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div id="faculty-attendance-header">
              <CardTitle className="text-xl sm:text-2xl font-semibold">Faculty Attendance Dashboard</CardTitle>
              <CardDescription className="text-sm sm:text-sm text-muted-foreground mt-1">
                Track and manage faculty attendance across the institution
              </CardDescription>
            </div>
            <div id="admin-faculty-attendance-branch-select" className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={translateTerminology("Select Branch")} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {!selectedBranch ? (
              <div className={`p-12 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                  <Building2 className={`w-10 h-10 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
                </div>
                <div className="text-center max-w-sm">
                  <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Branch Selected</p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} mt-1`}>Please select a branch from the dropdown to view the faculty attendance dashboard data</p>
                </div>
              </div>
            ) : (
              <>
                <div id="hod-faculty-attendance-header-section" className="space-y-4 sm:space-y-6">
                  {/* Tab Navigation */}
                  <div id="hod-faculty-attendance-tabs" className={`flex space-x-1 p-1 rounded-lg  ${theme === 'dark' ? 'bg-card' : 'bg-white'} border ${theme === 'dark' ? 'border-border' : 'border-gray-200'} overflow-x-auto`}>
                    <button
                      onClick={() => setActiveTab('today')}
                      className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'today' ?
                        'bg-primary text-white' :
                        theme === 'dark' ?
                          'text-muted-foreground hover:text-foreground' :
                          'text-gray-600 hover:text-gray-900'}`
                      }>

                      Today's Attendance
                    </button>
                    <button
                      onClick={() => setActiveTab('records')}
                      className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'records' ?
                        'bg-primary text-white' :
                        theme === 'dark' ?
                          'text-muted-foreground hover:text-foreground' :
                          'text-gray-600 hover:text-gray-900'}`
                      }>

                      Attendance Records
                    </button>
                  </div>

                  {activeTab === 'today' && (
                    isTodayLoading && todaySummary.total_faculty === 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 pb-6">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                      </div>
                    ) : todaySummary.total_faculty > 0 ? (
                      /* Today's Stats Cards */
                      <div id="hod-faculty-attendance-summary" className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 pb-6 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                        <div className={`p-3 sm:p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                          <div className="flex flex-row items-center justify-between gap-2">
                            <div>
                              <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Total Faculty</p>
                              <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{todaySummary.total_faculty}</p>
                            </div>
                            <Users className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600 flex-shrink-0" />
                          </div>
                        </div>
                        <div className={`p-3 sm:p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                          <div className="flex flex-row items-center justify-between gap-2">
                            <div>
                              <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Present</p>
                              <p className={`text-lg sm:text-2xl font-bold text-green-600`}>{todaySummary.present}</p>
                            </div>
                            <CheckCircle className="w-6 sm:w-8 h-6 sm:h-8 text-green-600 flex-shrink-0" />
                          </div>
                        </div>
                        <div className={`p-3 sm:p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                          <div className="flex flex-row items-center justify-between gap-2">
                            <div>
                              <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Absent</p>
                              <p className={`text-lg sm:text-2xl font-bold text-red-600`}>{todaySummary.absent}</p>
                            </div>
                            <XCircle className="w-6 sm:w-8 h-6 sm:h-8 text-red-600 flex-shrink-0" />
                          </div>
                        </div>
                        <div className={`p-3 sm:p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                          <div className="flex flex-row items-center justify-between gap-2">
                            <div>
                              <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Not Marked</p>
                              <p className={`text-lg sm:text-2xl font-bold text-gray-600`}>{todaySummary.not_marked}</p>
                            </div>
                            <Clock className="w-6 sm:w-8 h-6 sm:h-8 text-gray-600 flex-shrink-0" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-[2rem] mt-4 sm:mt-6 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                        <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                          <Users className={`w-10 h-10 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
                        </div>
                        <div className="text-center max-w-sm mt-4">
                          <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Faculty Found</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} mt-1`}>There are no faculty members currently assigned to this branch.</p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {activeTab === 'today' && (
                  isTodayLoading && todayAttendance.length === 0 ? (
                    <div className="space-y-6 mt-4 sm:mt-6">
                      <SkeletonTable rows={10} cols={4} />
                    </div>
                  ) : todaySummary.total_faculty > 0 ? (
                    <div className="mt-4 sm:mt-6">
                      <Card className={`rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} overflow-hidden`}>
                        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border flex flex-row justify-between items-center gap-4">
                          <CardTitle className={`text-xl sm:text-lg font-semibold card-title-text ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            Faculty Attendance <span className="inline-block whitespace-nowrap">({new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})</span>
                          </CardTitle>
                          <div className="flex items-center gap-4 shrink-0">
                            <label className={`flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer select-none ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>
                              <input
                                type="checkbox"
                                checked={showOffCampusOnly}
                                onChange={(e) => setShowOffCampusOnly(e.target.checked)}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 accent-primary"
                              />
                              <span>Off-Campus Duty Only</span>
                            </label>

                            {/* Desktop Export Excel Button */}
                            <Button
                            onClick={handleExportTodayExcel}
                            disabled={exportingToday}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 hover:text-white transition-all shadow-md text-xs sm:text-sm font-medium disabled:opacity-50"
                          >
                            {exportingToday ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <FileDown className="w-4 h-4" />
                                <span>Export Excel</span>
                              </>
                            )}
                          </Button>

                          {/* Mobile Export Excel Icon Button */}
                          <Button
                            onClick={handleExportTodayExcel}
                            disabled={exportingToday}
                            size="icon"
                            variant="outline"
                            className="flex sm:hidden h-9 w-9 items-center justify-center shrink-0 border border-input bg-background"
                            title="Export Excel"
                          >
                            {exportingToday ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}
                          </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                                <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Faculty</th>
                                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Status</th>
                                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Summary</th>
                                  <th className={`px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Actions</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                                {displayedTodayAttendance.length === 0 ?
                                  <tr>
                                    <td colSpan={5} className="py-12">
                                      <div className={`flex flex-col items-center justify-center space-y-3 p-8 border-2 border-dashed rounded-xl mx-auto max-w-sm ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                                        <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                                          <CalendarX className={`w-8 h-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
                                        </div>
                                        <div className="text-center">
                                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No attendance records for today</p>
                                          <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Faculty attendance hasn't been marked yet</p>
                                        </div>
                                      </div>
                                    </td>
                                  </tr> :

                                  displayedTodayAttendance.map((record) =>
                                    <tr key={record.faculty_id} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'}`}>
                                      <td className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                        <div className="font-medium faculty-name">{record.faculty_name}</div>
                                      </td>
                                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                        <span className={`${getStatusBadge(record.status)} text-xs sm:text-sm`}>{record.status === 'not_marked' ? 'Not Marked' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}</span>
                                      </td>
                                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'} meta-text`}>
                                        <div className="flex flex-col gap-1">
                                          {record.total_hours ? (
                                            <span className="font-semibold text-primary">{formatTotalHours(record.total_hours)}</span>
                                          ) : (record.first_check_in || record.check_in_time) ? (
                                            <span>
                                              In: {new Date(record.first_check_in || record.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                              {(record.second_check_out || record.check_out_time) ? ` | Out: ${new Date(record.second_check_out || record.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                                            </span>
                                          ) : record.marked_at ? (
                                            <span>Marked at {new Date(record.marked_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                          ) : (
                                            <span className="italic text-gray-400">No time recorded</span>
                                          )}
                                          {record.location?.inside !== undefined && (
                                            <span className={`text-xs ${record.location.inside ? '' : 'text-amber-500 font-medium'}`}>
                                              {record.location.inside ? 'On campus' : 'Off campus'}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                          onClick={() => setSelectedTodayRecord(record)}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                          View Details
                                        </Button>
                                      </td>
                                    </tr>
                                  )
                                }
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                        {todayAttendance.length > 50 && (
                          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                            <div className="pagination-text">
                              Showing {todayAttendance.length > 0 ? (todayPagination.page - 1) * todayPagination.page_size + 1 : 0} to {Math.min(todayPagination.page * todayPagination.page_size, todayPagination.total_items)} of {todayPagination.total_items} faculty
                            </div>
                            <div className="flex items-center gap-2">
                              {todayPagination.total_items > todayPagination.page_size &&
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={loadAllData}
                                  disabled={isTodayLoading}
                                  className="border-green-500 text-green-600 hover:bg-green-50 h-9 px-4 transition-all pagination-btn"
                                >
                                  {isTodayLoading ? 'Loading...' : 'Load All'}
                                </Button>
                              }
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(todayPagination.page - 1)}
                                disabled={!todayPagination.has_prev || isTodayLoading}
                                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all pagination-btn"
                              >
                                Previous
                              </Button>

                              <div className="flex items-center justify-center min-w-[2rem]">
                                <span className={`text-sm font-semibold pagination-text ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                  {todayPagination.page}
                                </span>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(todayPagination.page + 1)}
                                disabled={!todayPagination.has_next || isTodayLoading}
                                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all pagination-btn"
                              >
                                Next
                              </Button>
                            </div>
                          </CardFooter>
                        )}
                      </Card>
                    </div>
                  ) : null
                )}

                <Dialog open={!!selectedTodayRecord} onOpenChange={(open) => {
                  if (!open) setSelectedTodayRecord(null);
                }}>
                  <DialogContent className={`sm:max-w-[425px] overflow-hidden p-0 border-0 ${theme === 'dark' ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
                    {selectedTodayRecord && (
                      <div className="flex flex-col h-full">
                        <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                              {selectedTodayRecord.faculty_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {selectedTodayRecord.faculty_name}
                              </h2>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                Attendance Details
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 space-y-6">
                          {/* Status Badge */}
                          <div className="flex justify-between items-center">
                            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status</span>
                            <span className={`${getStatusBadge(selectedTodayRecord.status)} text-sm px-3 py-1 rounded-full font-bold`}>
                              {selectedTodayRecord.status === 'not_marked' ? 'Not Marked' : selectedTodayRecord.status.charAt(0).toUpperCase() + selectedTodayRecord.status.slice(1)}
                            </span>
                          </div>

                          {/* Time & Periodic Check-ins */}
                          {(selectedTodayRecord.checkin_timestamps?.length > 0 || selectedTodayRecord.check_in_time) && (
                            <div className="space-y-4">
                              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Timeline</h3>
                              <div className={`space-y-3 p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                
                                {selectedTodayRecord.checkin_timestamps?.length > 0 ? (
                                  <>
                                    {selectedTodayRecord.checkin_timestamps.map((ts: any, idx: number) => (
                                      <div key={idx} className={`flex items-center justify-between pb-3 ${idx < selectedTodayRecord.checkin_timestamps.length - 1 ? (theme === 'dark' ? 'border-b border-white/10' : 'border-b border-gray-200') : ''}`}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ts === 'Missed' ? 'bg-red-500/10 text-red-500' : ts ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                            {idx + 1}
                                          </div>
                                          <span className="font-semibold text-gray-500">
                                            {selectedTodayRecord.checkin_timestamps.length === 4
                                              ? (idx === 0 ? '1st Half In' : idx === 1 ? '1st Half Out' : idx === 2 ? '2nd Half In' : '2nd Half Out')
                                              : (idx === 0 ? 'Check In' : 'Check Out')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {ts === "Missed" ? (
                                            <span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded">Missed</span>
                                          ) : ts ? (
                                            <>
                                              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                              </span>
                                              {selectedTodayRecord.delays && selectedTodayRecord.delays[idx] > 0 && (
                                                <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                                  +{selectedTodayRecord.delays[idx]}m
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-gray-400 italic">Pending</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {selectedTodayRecord.check_out_time && (
                                      <div className={`flex items-center justify-between font-bold pt-3 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-blue-500/10 text-blue-500">
                                            Out
                                          </div>
                                          <span className="font-semibold text-gray-500">Check Out</span>
                                        </div>
                                        <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                          {new Date(selectedTodayRecord.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {(selectedTodayRecord.first_check_in || selectedTodayRecord.check_in_time) && (
                                      <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-500">{selectedTodayRecord.first_check_in ? '1st Half In' : 'Check In'}</span> 
                                        <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                          {new Date(selectedTodayRecord.first_check_in || selectedTodayRecord.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                          {selectedTodayRecord.delays?.[0] > 0 && (
                                            <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                              +{selectedTodayRecord.delays[0]}m
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {selectedTodayRecord.first_check_out && (
                                      <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200 dark:border-white/10">
                                        <span className="font-semibold text-gray-500">1st Half Out</span> 
                                        <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                          {new Date(selectedTodayRecord.first_check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                      </div>
                                    )}
                                    {selectedTodayRecord.second_check_in && (
                                      <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200 dark:border-white/10">
                                        <span className="font-semibold text-gray-500">2nd Half In</span> 
                                        <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                          {new Date(selectedTodayRecord.second_check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                          {selectedTodayRecord.delays?.[2] > 0 && (
                                            <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                              +{selectedTodayRecord.delays[2]}m
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {(selectedTodayRecord.second_check_out || selectedTodayRecord.check_out_time) && (
                                      <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200 dark:border-white/10">
                                        <span className="font-semibold text-gray-500">{selectedTodayRecord.second_check_out ? '2nd Half Out' : 'Check Out'}</span> 
                                        <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                          {new Date(selectedTodayRecord.second_check_out || selectedTodayRecord.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Total Hours */}
                          {selectedTodayRecord.total_hours && (
                            <div className="flex items-center justify-between font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/20">
                              <span>Total Worked</span>
                              <span>{formatTotalHours(selectedTodayRecord.total_hours)}</span>
                            </div>
                          )}

                          {/* Location & Notes */}
                          <div className="space-y-4">
                            <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Details</h3>
                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                              
                              <div className="flex gap-2">
                                <Building2 className={`w-4 h-4 mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <div>
                                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedTodayRecord.location?.inside ? 'On Campus' : 'Off Campus'}
                                    {selectedTodayRecord.location?.distance_meters && ` • ${Math.round(selectedTodayRecord.location.distance_meters)}m`}
                                  </p>
                                  {selectedTodayRecord.location?.campus_name && (
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {selectedTodayRecord.location.campus_name}
                                    </p>
                                  )}
                                  {selectedTodayRecord.location?.latitude && selectedTodayRecord.location?.longitude && (
                                    <a
                                      href={`https://www.google.com/maps?q=${selectedTodayRecord.location.latitude},${selectedTodayRecord.location.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1 font-medium"
                                    >
                                      📍 View Map
                                    </a>
                                  )}
                                </div>
                              </div>

                              {selectedTodayRecord.notes && (
                                <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><line x1="9" y1="9" x2="10" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {selectedTodayRecord.notes.replace('[Off-Campus Check-in] Reason:', 'Off-Campus Duty: ').trim()}
                                  </p>
                                </div>
                              )}
                              
                              {!selectedTodayRecord.notes && !selectedTodayRecord.location && (
                                <p className={`text-sm italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No additional details provided.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={`p-4 border-t mt-auto ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
                          <Button variant="outline" className="w-full" onClick={() => setSelectedTodayRecord(null)}>
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {activeTab === 'records' &&
                  <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                    {/* Date Range Filter */}
                    <div id="hod-faculty-attendance-filters" className={`p-3 sm:p-4 rounded-lg  ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end">
                        <div className="w-full sm:w-[220px]">
                          <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                            Faculty
                          </label>
                          <Select
                            value={selectedFacultyId}
                            onValueChange={setSelectedFacultyId}>
                            <SelectTrigger className={cn(
                              "w-full h-9 text-xs sm:text-sm",
                              theme === 'dark' ? 'bg-background border-border text-foreground hover:bg-accent' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                            )}>
                              <SelectValue placeholder="Choose Faculty" />
                            </SelectTrigger>
                            <SelectContent className={theme === 'dark' ? 'bg-slate-950 border-white/10 text-foreground' : 'bg-white border-gray-200 text-gray-900'}>
                              <SelectItem value="all">All Faculty</SelectItem>
                              {uniqueFaculties.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full sm:w-auto">
                          <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                            Start Date
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full sm:w-[180px] justify-start text-left font-normal h-9 text-xs sm:text-sm",
                                  !dateRange.start_date && "text-muted-foreground",
                                  theme === 'dark' ? 'bg-background border-border text-foreground hover:bg-accent' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                )}>

                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.start_date ? format(new Date(dateRange.start_date), "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <ShadcnCalendar
                                mode="single"
                                selected={new Date(dateRange.start_date)}
                                onSelect={(date) => date && setDateRange((prev) => ({ ...prev, start_date: date.toLocaleDateString('sv-SE') }))}
                                initialFocus />

                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="w-full sm:w-auto">
                          <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                            End Date
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full sm:w-[180px] justify-start text-left font-normal h-9 text-xs sm:text-sm",
                                  !dateRange.end_date && "text-muted-foreground",
                                  theme === 'dark' ? 'bg-background border-border text-foreground hover:bg-accent' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                )}>

                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.end_date ? format(new Date(dateRange.end_date), "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <ShadcnCalendar
                                mode="single"
                                selected={new Date(dateRange.end_date)}
                                onSelect={(date) => date && setDateRange((prev) => ({ ...prev, end_date: date.toLocaleDateString('sv-SE') }))}
                                disabled={(date) => {
                                  const start = new Date(dateRange.start_date);
                                  const today = new Date();
                                  today.setHours(23, 59, 59, 999);
                                  return isBefore(date, start) || isSameDay(date, start) || date > today;
                                }}
                                initialFocus />

                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    {/* Faculty Summary */}
                    {isRecordsLoading && facultySummary.length === 0 ? (
                      <SkeletonTable rows={10} cols={6} />
                    ) : !selectedFacultyId ? (
                      <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                        <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                          <Users className={`w-10 h-10 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Faculty Selected</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Please select a faculty member from the dropdown to view attendance summary</p>
                        </div>
                      </div>
                    ) : facultySummary.length > 0 ? (
                      <Card className={`rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} overflow-hidden`}>
                        <CardHeader className="px-6 py-4 border-b border-border flex flex-row justify-between items-center gap-4">
                          <CardTitle className={`text-xl sm:text-lg font-semibold card-title-text ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            Faculty Attendance Summary
                          </CardTitle>

                          {/* Desktop Export Excel Button */}
                          <Button
                            onClick={handleExportRecordsExcel}
                            disabled={exportingRecords || facultySummary.length === 0 || !selectedFacultyId}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 hover:text-white transition-all shadow-md text-xs sm:text-sm font-medium disabled:opacity-50"
                          >
                            {exportingRecords ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <FileDown className="w-4 h-4" />
                                <span>Export Excel</span>
                              </>
                            )}
                          </Button>

                          {/* Mobile Export Excel Icon Button */}
                          <Button
                            onClick={handleExportRecordsExcel}
                            disabled={exportingRecords || facultySummary.length === 0 || !selectedFacultyId}
                            size="icon"
                            variant="outline"
                            className="flex sm:hidden h-9 w-9 items-center justify-center shrink-0 border border-input bg-background"
                          >
                            {exportingRecords ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}
                          </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className={`sticky top-0 whitespace-nowrap ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                                <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Faculty</th>
                                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Total Days</th>
                                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Present</th>
                                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Absent</th>
                                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Attendance %</th>
                                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Actions</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                                {facultySummary
                                  .filter(summary => selectedFacultyId === "all" || summary.id === selectedFacultyId)
                                  .map((summary) =>
                                    <React.Fragment key={summary.id}>
                                      <tr className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'} ${selectedFaculty?.id === summary.id ? theme === 'dark' ? 'bg-accent/50' : 'bg-blue-50' : ''}`}>
                                        <td className={`px-6 py-4 whitespace-nowrap font-medium faculty-name ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                          {summary.name}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                          {summary.total_days}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">
                                          {summary.present_days}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">
                                          {summary.absent_days}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${summary.attendance_percentage >= 75 ? 'text-green-600' :
                                          summary.attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`
                                        }>
                                          {summary.attendance_percentage.toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                          <button
                                            onClick={() => fetchFacultyDetails(summary)}
                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors export-btn ${theme === 'dark' ?
                                              'bg-primary/20 text-primary hover:bg-primary/30' :
                                              'bg-primary text-white hover:bg-primary/90'}`
                                            }>

                                            {selectedFaculty?.id === summary.id && isDetailLoading ? 'Loading...' : 'View'}
                                          </button>
                                        </td>
                                      </tr>
                                    </React.Fragment>
                                  )}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>

                        {facultySummary.length > 50 && (
                          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                            <div className="pagination-text">
                              Showing {recordsPagination.total_items > 0 ? Math.min((recordsPagination.page - 1) * recordsPagination.page_size + 1, recordsPagination.total_items) : 0} to {Math.min(recordsPagination.page * recordsPagination.page_size, recordsPagination.total_items)} of {recordsPagination.total_items} records
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRecordsPageChange(recordsPagination.page - 1)}
                                disabled={!recordsPagination.has_prev || isRecordsLoading}
                                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all pagination-btn"
                              >
                                Previous
                              </Button>

                              <div className="flex items-center justify-center min-w-[2rem]">
                                <span className={`text-sm font-semibold pagination-text ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                  {recordsPagination.page}
                                </span>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRecordsPageChange(recordsPagination.page + 1)}
                                disabled={!recordsPagination.has_next || isRecordsLoading}
                                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all pagination-btn"
                              >
                                Next
                              </Button>
                            </div>
                          </CardFooter>
                        )}
                      </Card>
                    ) : (
                      <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                        <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                          <ClipboardX className={`w-10 h-10 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No attendance records found</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Try adjusting your date range or faculty filters</p>
                        </div>
                      </div>
                    )}

                  </div>
                }
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Details Modal */}
      <Dialog open={!!selectedFaculty} onOpenChange={(open) => !open && setSelectedFaculty(null)}>
        <DialogContent className={`max-w-xl max-h-[80vh] overflow-y-auto custom-scrollbar rounded-xl w-[90%] ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white'}`}>
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <DialogTitle className="card-title-text">
                  {selectedFaculty?.name}'s Attendance
                </DialogTitle>
                <p className={`text-sm mt-2 font-medium meta-text ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {formatDate(dateRange.start_date)} — {formatDate(dateRange.end_date)}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 detail-day-weekday">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 detail-day-weekday">Absent</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className={`p-4 sm:p-6 rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'bg-muted/20 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
            {isDetailLoading ?
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-sm font-semibold animate-pulse text-muted-foreground">Syncing attendance data...</p>
              </div> :

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3 sm:gap-4">
                {(() => {
                  const end = new Date(dateRange.end_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const effectiveEnd = end < today ? end : today;
                  const start = new Date(dateRange.start_date);
                  if (selectedFaculty && (selectedFaculty as any).date_joined) {
                    const joinDate = new Date((selectedFaculty as any).date_joined);
                    joinDate.setHours(0, 0, 0, 0);
                    if (joinDate > start) {
                      start.setTime(joinDate.getTime());
                    }
                  }
                  const todayStr = new Date().toLocaleDateString('sv-SE');
                  const days = [];
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    days.push(new Date(d));
                  }

                  return days.map((date) => {
                    const dateStr = date.toLocaleDateString('sv-SE');
                    const record = facultyAttendanceDetails.find((r) => r.date === dateStr);
                    const isFuture = dateStr > todayStr;
                    const isSunday = date.getDay() === 0;
                    const isHoliday = holidayDates.includes(dateStr);
                    const isNonWorkingDay = isSunday || isHoliday;

                    const isPresent = record?.status?.toLowerCase() === 'present';
                    const isAbsent = !isNonWorkingDay && (record?.status?.toLowerCase() === 'absent' || (!record && !isFuture));

                    return (
                      <React.Fragment key={dateStr}>
                          <button
                            onClick={() => setSelectedDateDetailsStr(dateStr)}
                            className={`relative p-4 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-md w-full focus:outline-none focus:ring-2 focus:ring-primary/50 ${isPresent ?
                              'bg-green-500/10 border-green-500/30 text-green-600' :
                              isAbsent ?
                                'bg-red-500/10 border-red-500/30 text-red-600' :
                                isNonWorkingDay ?
                                  'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-400' :
                                  theme === 'dark' ?
                                    'bg-white/5 border-white/5 text-muted-foreground/30' :
                                    'bg-gray-100 border-gray-200 text-gray-300'}`
                            }>

                            <span className={`text-[10px] font-black uppercase tracking-wider mb-1 opacity-60 detail-day-weekday ${(isPresent || isAbsent || isNonWorkingDay) ? 'opacity-100' : ''}`}>
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="text-xl font-black leading-tight detail-day-num">{date.getDate()}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 detail-day-month ${(isPresent || isAbsent || isNonWorkingDay) ? 'opacity-100' : ''}`}>
                              {date.toLocaleDateString('en-US', { month: 'short' })}
                            </span>

                            {record ?
                              <div className={`mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter detail-status-badge ${isPresent ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`
                              }>
                                {record.status[0]}
                              </div> :

                              !isFuture && !isNonWorkingDay ?
                                <div className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)] detail-status-badge">
                                  A
                                </div> : <div className={`w-1.5 h-1.5 rounded-full mt-2.5 ${isNonWorkingDay ? 'bg-slate-300 dark:bg-slate-600' : 'bg-transparent'}`} />
                            }
                          </button>
                      </React.Fragment>);

                  });
                })()}
              </div>
            }
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/30 pt-6">
            <div className="text-[11px] text-muted-foreground italic font-medium meta-text">
              Note: "A" indicates auto-marked absence
            </div>
            <Button onClick={() => setSelectedFaculty(null)} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 export-btn">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secondary Dialog for Date Details */}
      {selectedDateDetailsStr && (() => {
        const dateObj = new Date(selectedDateDetailsStr);
        const dateStr = selectedDateDetailsStr;
        const record = facultyAttendanceDetails.find((r) => r.date === dateStr);
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const isFuture = dateStr > todayStr;
        const isSunday = dateObj.getDay() === 0;
        const isHoliday = holidayDates.includes(dateStr);
        const isNonWorkingDay = isSunday || isHoliday;
        const isPresent = record?.status?.toLowerCase() === 'present';

        return (
          <Dialog open={!!selectedDateDetailsStr} onOpenChange={(open) => {
            if (!open) setSelectedDateDetailsStr(null);
          }}>
            <DialogContent className={`w-[90%] max-w-[360px] p-0 border-0 rounded-2xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
              <div className={`p-5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-primary/5'} border-b ${theme === 'dark' ? 'border-white/10' : 'border-primary/10'}`}>
                <DialogTitle className="text-lg font-bold">
                  {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </DialogTitle>
                <DialogDescription className={`mt-1 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Attendance Record Details
                </DialogDescription>
              </div>

              <div className="p-5">
                {record && (
                  <div className="space-y-4">
                    <div className={`${isPresent ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'} p-3 rounded-xl font-bold flex items-center gap-2 text-base`}>
                      {isPresent ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />} 
                      {record.status === 'not_marked' ? 'Not Marked' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </div>
                    
                    {record.checkin_timestamps && record.checkin_timestamps.length > 0 ? (
                      <div className={`space-y-2 p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                        {record.checkin_timestamps.map((ts: any, idx: number) => (
                          <div key={idx} className={`flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0 ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                            <span className="font-semibold text-gray-500">
                              {record.checkin_timestamps.length === 4
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
                                  {record.delays && record.delays[idx] > 0 && (
                                    <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                      +{record.delays[idx]}m
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400 italic font-medium">Pending</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {record.check_out_time && (
                          <div className={`flex items-center justify-between font-bold pt-2 border-t mt-2 ${theme === 'dark' ? 'border-white/10' : 'border-gray-300'}`}>
                            <span className="text-gray-500">Check Out</span> 
                            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (record.first_check_in || record.check_in_time || record.second_check_out || record.check_out_time) && (
                      <div className={`space-y-2 p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                        {(record.first_check_in || record.check_in_time) && (
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-500">{record.first_check_in ? '1st Half In' : 'Check In'}</span> 
                            <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(record.first_check_in || record.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              {record.delays?.[0] > 0 && (
                                <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                  +{record.delays[0]}m
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {record.first_check_out && (
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-500">1st Half Out</span> 
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(record.first_check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        )}
                        {record.second_check_in && (
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-500">2nd Half In</span> 
                            <span className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(record.second_check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              {record.delays?.[2] > 0 && (
                                <span className="text-xs text-orange-500 font-black bg-orange-500/20 px-2 py-0.5 rounded shadow-sm">
                                  +{record.delays[2]}m
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {(record.second_check_out || record.check_out_time) && (
                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 dark:border-white/10">
                            <span className="font-semibold text-gray-500">{record.second_check_out ? '2nd Half Out' : 'Check Out'}</span> 
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(record.second_check_out || record.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {record.total_hours && (
                      <div className="flex items-center justify-between font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/20">
                        <span>Total Worked</span>
                        <span>{formatTotalHours(record.total_hours)}</span>
                      </div>
                    )}

                    {record.notes?.includes('[Off-Campus Check-in]') && (
                      <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 font-semibold leading-relaxed">
                        <span className="block text-xs uppercase tracking-wider font-black mb-1 opacity-70">Off-Campus Duty</span>
                        {record.notes.replace('[Off-Campus Check-in] Reason:', '').trim()}
                      </div>
                    )}
                  </div>
                )}
                
                {!record && !isFuture && !isNonWorkingDay && (
                  <div className="text-red-500 font-bold flex flex-col items-center justify-center gap-2 p-6 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
                    <XCircle className="w-10 h-10 opacity-80" /> 
                    <span>Auto-marked Absent</span>
                  </div>
                )}
                
                {isNonWorkingDay && (
                  <div className={`font-bold flex flex-col items-center justify-center gap-2 p-6 rounded-xl border text-center ${theme === 'dark' ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                    <CalendarX className="w-10 h-10 opacity-50" /> 
                    <span>{isHoliday ? 'Holiday' : 'Sunday'}</span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </>
  );
};

export default AdminFacultyAttendanceView;