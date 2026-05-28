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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    longitude?: number | null;
    inside?: boolean | null;
    distance_meters?: number | null;
    campus_name?: string | null;
  } | null;
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
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'records'>('today');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE'), // 30 days ago
    end_date: new Date().toLocaleDateString('sv-SE') // today
  });
  const [selectedFaculty, setSelectedFaculty] = useState<FacultySummary | null>(null);
  const [facultyAttendanceDetails, setFacultyAttendanceDetails] = useState<FacultyAttendanceRecord[]>([]);
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
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const fetchAttendanceRecords = async (page: number = 1, pageSize: number = 50) => {
    if (!selectedBranch) return;
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleExportTodayPDF = async () => {
    setExportingToday(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/faculty-attendance-today/export-pdf/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        a.download = `Faculty_Attendance_Today_${todayStr.replace(/ /g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        Swal.fire("Error", result.message || "Failed to export PDF", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error while exporting PDF", "error");
    } finally {
      setExportingToday(false);
    }
  };

  const handleExportRecordsPDF = async () => {
    if (facultySummary.length === 0) {
      Swal.fire("Info", "No records to export", "info");
      return;
    }

    setExportingRecords(true);
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      if (selectedFacultyId && selectedFacultyId !== "all") {
        params.append("faculty_id", selectedFacultyId);
      }
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/faculty-attendance-records/export-pdf/?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Faculty_Attendance_Summary_${dateRange.start_date}_to_${dateRange.end_date}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        Swal.fire("Error", result.message || "Failed to export PDF", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error while exporting PDF", "error");
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
    window.addEventListener('neurocampus_switch_tab', handleTourTabSwitch);
    return () => window.removeEventListener('neurocampus_switch_tab', handleTourTabSwitch);
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
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
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

  const handlePageChange = (newPage: number) => {
    setTodayPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRecordsPageChange = (newPage: number) => {
    setRecordsPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRecordsPageSizeChange = (newPageSize: number) => {
    setRecordsPagination((prev) => ({ ...prev, page_size: newPageSize, page: 1 })); // Reset to page 1 when changing page size
  };

  const loadAllData = async () => {
    // Load all data by setting a large page size
  await fetchTodayAttendance(1, 1000); // Load up to 1000 records
  };

  return (
    <>
      <div id="faculty-attendance-dashboard-container" className={`space-y-6 animate-fade-in ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <div id="admin-faculty-attendance-header-select" className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 id="faculty-attendance-dashboard-title" className={`text-2xl font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Faculty Attendance Dashboard</h2>
          <p id="faculty-attendance-dashboard-subtitle" className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
            Track and manage faculty attendance across the institution
          </p>
        </div>
        <div id="admin-faculty-attendance-branch-select" className="flex items-center gap-2">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {!selectedBranch ? (
        <div className={`p-12 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'} mt-6`}>
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
              <div id="hod-faculty-attendance-tabs" className={`flex space-x-1 p-1 rounded-lg mt-3 ${theme === 'dark' ? 'bg-card' : 'bg-white'} border ${theme === 'dark' ? 'border-border' : 'border-gray-200'} overflow-x-auto`}>
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

          {activeTab === 'today' && !isLoading && todaySummary.total_faculty > 0 && (
            /* Today's Stats Cards */
            <div id="hod-faculty-attendance-summary" className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
              <div className={`p-3 sm:p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div>
                    <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Total Faculty</p>
                    <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{todaySummary.total_faculty}</p>
                  </div>
                  <Users className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600 flex-shrink-0" />
                </div>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div>
                    <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Present</p>
                    <p className={`text-lg sm:text-2xl font-bold text-green-600`}>{todaySummary.present}</p>
                  </div>
                  <CheckCircle className="w-6 sm:w-8 h-6 sm:h-8 text-green-600 flex-shrink-0" />
                </div>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div>
                    <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Absent</p>
                    <p className={`text-lg sm:text-2xl font-bold text-red-600`}>{todaySummary.absent}</p>
                  </div>
                  <XCircle className="w-6 sm:w-8 h-6 sm:h-8 text-red-600 flex-shrink-0" />
                </div>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div>
                    <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Not Marked</p>
                    <p className={`text-lg sm:text-2xl font-bold text-gray-600`}>{todaySummary.not_marked}</p>
                  </div>
                  <Clock className="w-6 sm:w-8 h-6 sm:h-8 text-gray-600 flex-shrink-0" />
                </div>
              </div>
            </div>
          )}
        </div>

        {isLoading &&
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonTable rows={10} cols={4} />
          </div>
        }

        {activeTab === 'today' && !isLoading && todaySummary.total_faculty > 0 &&
          <>
            <Card className={`rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} overflow-hidden`}>
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className={`text-sm sm:text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Today's Faculty Attendance ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})
                </CardTitle>
                <button
                  onClick={handleExportTodayPDF}
                  disabled={exportingToday}
                  className={`flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all shadow-md text-xs sm:text-sm font-medium disabled:opacity-50`}>
                  {exportingToday ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Export PDF</span>
                    </>
                  )}
                </button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                      <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                        <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Faculty</th>
                        <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Status</th>
                        <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Marked At</th>
                        <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Notes</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                      {todayAttendance.length === 0 ?
                        <tr>
                          <td colSpan={4} className="py-12">
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

                        todayAttendance.map((record) =>
                          <tr key={record.faculty_id} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'}`}>
                            <td className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              <div className="font-medium">{record.faculty_name}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <span className={`${getStatusBadge(record.status)} text-xs sm:text-sm`}>{record.status}</span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              {record.marked_at ? new Date(record.marked_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not marked'}
                              {record.location ?
                                <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                                  {record.location.inside ?
                                    <>On campus • {record.location.distance_meters ? `${Math.round(record.location.distance_meters)} m` : 'distance unknown'}</> :

                                    <>Outside campus • {record.location.distance_meters ? `${Math.round(record.location.distance_meters)} m` : 'distance unknown'}</>
                                  }
                                  {record.location.campus_name ? ` • ${record.location.campus_name}` : ''}
                                </div> :

                                <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Location not recorded</div>
                              }
                            </td>
                            <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                              {record.notes || '-'}
                            </td>
                          </tr>
                        )
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
              {todayAttendance.length > 0 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                  <div>
                    Showing {todayAttendance.length > 0 ? (todayPagination.page - 1) * todayPagination.page_size + 1 : 0} to {Math.min(todayPagination.page * todayPagination.page_size, todayPagination.total_items)} of {todayPagination.total_items} faculty
                  </div>
                  <div className="flex items-center gap-2">
                    {todayPagination.total_items > todayPagination.page_size &&
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadAllData}
                        disabled={isLoading}
                        className="border-green-500 text-green-600 hover:bg-green-50 h-9 px-4 transition-all"
                      >
                        {isLoading ? 'Loading...' : 'Load All'}
                      </Button>
                    }
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(todayPagination.page - 1)}
                      disabled={!todayPagination.has_prev || isLoading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {todayPagination.page}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(todayPagination.page + 1)}
                      disabled={!todayPagination.has_next || isLoading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </>
        }

        {activeTab === 'records' && !isLoading &&
          <>
            {/* Date Range Filter */}
            <div id="hod-faculty-attendance-filters" className={`p-3 sm:p-4 rounded-lg ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end">
                <div className="w-full sm:w-[220px]">
                  <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                    Faculty
                  </label>
                  <Select
                    value={selectedFacultyId}
                    onValueChange={setSelectedFacultyId}>
                    <SelectTrigger className={cn(
                      "w-full justify-start text-left font-normal h-9 text-xs sm:text-sm",
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
                          return isBefore(date, start) || isSameDay(date, start);
                        }}
                        initialFocus />

                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-full sm:w-auto pt-4 sm:pt-0 ml-auto">
                  <button
                    onClick={handleExportRecordsPDF}
                    disabled={exportingRecords || facultySummary.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all shadow-md text-xs sm:text-sm font-medium disabled:opacity-50">
                    {exportingRecords ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" />
                        <span>Export Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Faculty Summary */}
            {!selectedFacultyId ? (
              <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'} mt-4`}>
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
                <CardHeader className="px-6 py-4 border-b border-border">
                  <CardTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    Faculty Attendance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
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
                              <td className={`px-6 py-4 whitespace-nowrap font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
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
                                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ?
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

                {facultySummary.length > 0 && (
                  <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                    <div>
                      Showing {recordsPagination.total_items > 0 ? Math.min((recordsPagination.page - 1) * recordsPagination.page_size + 1, recordsPagination.total_items) : 0} to {Math.min(recordsPagination.page * recordsPagination.page_size, recordsPagination.total_items)} of {recordsPagination.total_items} records
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecordsPageChange(recordsPagination.page - 1)}
                        disabled={!recordsPagination.has_prev || isLoading}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                      >
                        Previous
                      </Button>

                      <div className="flex items-center justify-center min-w-[2rem]">
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {recordsPagination.page}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecordsPageChange(recordsPagination.page + 1)}
                        disabled={!recordsPagination.has_next || isLoading}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
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

          </>
        }
        </>
      )}
      </div>

      {/* Attendance Details Modal */}
      <Dialog open={!!selectedFaculty} onOpenChange={(open) => !open && setSelectedFaculty(null)}>
        <DialogContent className={`max-w-xl max-h-[80vh] overflow-y-auto custom-scrollbar rounded-xl w-[90%] ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white'}`}>
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <DialogTitle>
                  {selectedFaculty?.name}'s Attendance
                </DialogTitle>
                <p className={`text-sm mt-2 font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {formatDate(dateRange.start_date)} — {formatDate(dateRange.end_date)}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Absent</span>
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
                  const start = new Date(dateRange.start_date);
                  const end = new Date(dateRange.end_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const days = [];
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    days.push(new Date(d));
                  }

                  return days.map((date) => {
                    const dateStr = date.toLocaleDateString('sv-SE');
                    const record = facultyAttendanceDetails.find((r) => r.date === dateStr);
                    const isFuture = date > today;

                    const isPresent = record?.status?.toLowerCase() === 'present';
                    const isAbsent = record?.status?.toLowerCase() === 'absent' || !record && !isFuture;

                    return (
                      <div
                        key={dateStr}
                        className={`relative group p-4 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-md ${isPresent ?
                          'bg-green-500/10 border-green-500/30 text-green-600' :
                          isAbsent ?
                            'bg-red-500/10 border-red-500/30 text-red-600' :
                            theme === 'dark' ?
                              'bg-white/5 border-white/5 text-muted-foreground/30' :
                              'bg-gray-100 border-gray-200 text-gray-300'}`
                        }>

                        <span className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-60">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-xl font-black leading-tight">{date.getDate()}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </span>

                        {record ?
                          <div className={`mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${isPresent ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`
                          }>
                            {record.status[0]}
                          </div> :

                          !isFuture &&
                          <div className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                            A
                          </div>

                        }

                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 scale-90 group-hover:scale-100">
                          <div className="font-bold">{date.toLocaleDateString('en-US', { dateStyle: 'medium' })}</div>
                          {!record && !isFuture && <div className="text-red-300 mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Auto-marked Absent</div>}
                          {record && <div className={`${isPresent ? 'text-green-300' : 'text-red-300'} mt-1 flex items-center gap-1`}>{isPresent ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {record.status}</div>}
                        </div>
                      </div>);

                  });
                })()}
              </div>
            }
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/30 pt-6">
            <div className="text-[11px] text-muted-foreground italic font-medium">
              Note: "A" indicates auto-marked absence due to missing records.
            </div>
            <Button onClick={() => setSelectedFaculty(null)} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

};

export default AdminFacultyAttendanceView;