import React, { useState, useEffect } from "react";
import { Calendar, Users, CheckCircle, XCircle, Clock, FileDown, CalendarIcon, CalendarX, ClipboardX } from "lucide-react";
import { getFacultyAttendanceToday, getFacultyAttendanceRecords } from "../../utils/hod_api";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { useTheme } from "../../context/ThemeContext";
import { SkeletonCard, SkeletonTable } from "../ui/skeleton";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isBefore, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";

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

const FacultyAttendanceView: React.FC = () => {
  const [todayAttendance, setTodayAttendance] = useState<FacultyAttendanceTodayRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<FacultyAttendanceRecord[]>([]);
  const [facultySummary, setFacultySummary] = useState<FacultySummary[]>([]);
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
    setIsLoading(true);
    try {
      const response = await getFacultyAttendanceToday({ page, page_size: pageSize });
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
    setIsLoading(true);
    try {
      const response = await getFacultyAttendanceRecords({
        ...dateRange,
        page,
        page_size: pageSize
      });
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

  const handleExportTodayPDF = () => {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    doc.setFontSize(18);
    doc.text("Today's Faculty Attendance Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${todayStr}`, 14, 30);
    doc.text(`Total Faculty: ${todaySummary.total_faculty} | Present: ${todaySummary.present} | Absent: ${todaySummary.absent}`, 14, 37);

    const tableColumn = ["Faculty Name", "Status", "Marked At", "Notes"];
    const tableRows = todayAttendance.map((record) => [
    record.faculty_name,
    record.status,
    record.marked_at ? new Date(record.marked_at).toLocaleString() : 'Not marked',
    record.notes || '-']
    );

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [66, 133, 244] }
    });

    doc.save(`Faculty_Attendance_Today_${todayStr.replace(/ /g, '_')}.pdf`);
  };

  const handleExportRecordsPDF = () => {
    if (facultySummary.length === 0) {
      Swal.fire("Info", "No records to export", "info");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Faculty Attendance Summary Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Period: ${formatDate(dateRange.start_date)} to ${formatDate(dateRange.end_date)}`, 14, 30);

    const tableColumn = ["Faculty Name", "Total Days", "Present", "Absent", "Percentage"];
    const tableRows = facultySummary.map((summary) => [
    summary.name,
    summary.total_days,
    summary.present_days,
    summary.absent_days,
    `${summary.attendance_percentage.toFixed(1)}%`]
    );

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [66, 133, 244] }
    });

    doc.save(`Faculty_Attendance_Summary_${dateRange.start_date}_to_${dateRange.end_date}.pdf`);
  };

  const fetchFacultyDetails = async (faculty: FacultySummary) => {
    setIsDetailLoading(true);
    setSelectedFaculty(faculty);
    try {
      const response = await getFacultyAttendanceRecords({
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
    if (activeTab === 'today') {
      fetchTodayAttendance(todayPagination.page, todayPagination.page_size);
    } else if (activeTab === 'records') {
      fetchAttendanceRecords(recordsPagination.page, recordsPagination.page_size);
    }
  }, [activeTab, dateRange, todayPagination.page, todayPagination.page_size, recordsPagination.page, recordsPagination.page_size]);

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
    <div className={` sm: space-y-4 sm:space-y-6 min-h-screen max-w-[390px] sm:max-w-none mx-auto ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
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
          {/* Today's Stats Cards */}
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

          {/* Pagination controls moved below the table for better UX */}

          {/* Today's Attendance Table */}
          <div id="hod-faculty-attendance-table" className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className={`text-sm sm:text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Today's Faculty Attendance ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})
              </h3>
              <button
                onClick={handleExportTodayPDF}
                className={`flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all shadow-md text-xs sm:text-sm font-medium`}>
                
                <FileDown className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
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
                          <div className="flex items-center gap-1 sm:gap-2">
                            {getStatusIcon(record.status)}
                            <span className={`${getStatusBadge(record.status)} text-xs sm:text-sm`}>{record.status}</span>
                          </div>
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
          </div>
        </>
        }

      {/* Today's Pagination Controls (moved to bottom) */}
      {activeTab === 'today' && !isLoading &&
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 p-3 sm:p-4 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} rounded-lg mt-4`}>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
              Showing {todayAttendance.length > 0 ? (todayPagination.page - 1) * todayPagination.page_size + 1 : 0} to{' '}
              {Math.min(todayPagination.page * todayPagination.page_size, todayPagination.total_items)} of{' '}
              {todayPagination.total_items} faculty
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {todayPagination.total_items > todayPagination.page_size &&
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border border-green-500 text-green-600 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50 whitespace-nowrap ${theme === 'dark' ? 'hover:bg-accent' : ''}`
              }>
              
                {isLoading ? 'Loading...' : 'Load All'}
              </button>
            }

            <button
              onClick={() => handlePageChange(todayPagination.page - 1)}
              disabled={!todayPagination.has_prev || isLoading}
              className={`px-3 py-2 text-sm font-medium border rounded-md transition-all duration-200 whitespace-nowrap ${todayPagination.has_prev && !isLoading ?
              'bg-primary text-white border-primary hover:bg-primary/90 shadow-sm' :
              'bg-primary opacity-50 text-white border-primary cursor-not-allowed'}`
              }>
              
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, todayPagination.total_pages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(todayPagination.total_pages - 4, todayPagination.page - 2)) + i;
                if (pageNum > todayPagination.total_pages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isLoading}
                    className={`px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50 ${pageNum === todayPagination.page ?
                    'bg-white text-primary font-semibold' :
                    `bg-white text-gray-600 hover:text-primary ${theme === 'dark' ? 'hover:bg-accent' : ''}`}`
                    }>
                    
                    {pageNum}
                  </button>);

              })}
            </div>

            <button
              onClick={() => handlePageChange(todayPagination.page + 1)}
              disabled={!todayPagination.has_next || isLoading}
              className={`px-3 py-2 text-sm font-medium border rounded-md transition-all duration-200 whitespace-nowrap ${todayPagination.has_next && !isLoading ?
              'bg-primary text-white border-primary hover:bg-primary/90 shadow-sm' :
              'bg-primary opacity-50 text-white border-primary cursor-not-allowed'}`
              }>
              
              Next
            </button>
          </div>
        </div>
        }

      {activeTab === 'records' && !isLoading &&
        <>
          {/* Date Range Filter */}
          <div id="hod-faculty-attendance-filters" className={`p-3 sm:p-4 rounded-lg ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end">
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
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all shadow-md text-xs sm:text-sm font-medium">
                  
                  <FileDown className="w-4 h-4" />
                  <span>Export Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Faculty Summary */}
          {facultySummary.length > 0 ?
          <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Faculty Attendance Summary
                </h3>
              </div>
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
                    {facultySummary.map((summary) =>
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

              {/* Pagination for Records */}
              <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 gap-4">
                <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Showing {recordsPagination.total_items > 0 ? Math.min((recordsPagination.page - 1) * recordsPagination.page_size + 1, recordsPagination.total_items) : 0} to {Math.min(recordsPagination.page * recordsPagination.page_size, recordsPagination.total_items)} of {recordsPagination.total_items}
                </div>
                <div className="flex items-center gap-2">
                  <button
                  onClick={() => handleRecordsPageChange(recordsPagination.page - 1)}
                  disabled={!recordsPagination.has_prev || isLoading}
                  className={`px-3 py-2 text-sm font-medium border rounded-md transition-all duration-200 whitespace-nowrap ${recordsPagination.has_prev && !isLoading ?
                  'bg-primary text-white border-primary hover:bg-primary/90 shadow-sm' :
                  'bg-primary opacity-50 text-white border-primary cursor-not-allowed'}`
                  }>
                  
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, recordsPagination.total_pages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(recordsPagination.total_pages - 4, recordsPagination.page - 2)) + i;
                    if (pageNum < 1 || pageNum > recordsPagination.total_pages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handleRecordsPageChange(pageNum)}
                        disabled={isLoading}
                        className={`px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50 ${pageNum === recordsPagination.page ?
                        'bg-white text-primary font-semibold' :
                        `bg-white text-gray-600 hover:text-primary ${theme === 'dark' ? 'hover:bg-accent' : ''}`}`
                        }>
                        
                          {pageNum}
                        </button>);

                  })}
                  </div>

                  <button
                  onClick={() => handleRecordsPageChange(recordsPagination.page + 1)}
                  disabled={!recordsPagination.has_next || isLoading}
                  className={`px-3 py-2 text-sm font-medium border rounded-md transition-all duration-200 whitespace-nowrap ${recordsPagination.has_next && !isLoading ?
                  'bg-primary text-white border-primary hover:bg-primary/90 shadow-sm' :
                  'bg-primary opacity-50 text-white border-primary cursor-not-allowed'}`
                  }>
                  
                    Next
                  </button>
                </div>
              </div>
            </div> :

          <div className={`p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                <ClipboardX className={`w-10 h-10 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
              <div className="text-center">
                <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No attendance records found</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Try adjusting your date range or faculty filters</p>
              </div>
            </div>
          }

        </>
        }
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

export default FacultyAttendanceView;