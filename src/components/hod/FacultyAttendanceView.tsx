import React, { useState, useEffect } from "react";
import { Calendar, Users, CheckCircle, XCircle, Clock, FileDown } from "lucide-react";
import { getFacultyAttendanceToday, getFacultyAttendanceRecords } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonCard, SkeletonTable } from "../ui/skeleton";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0] // today
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
        if (response.pagination) {
          setTodayPagination(response.pagination);
        }
        if (response.summary) {
          setTodaySummary(response.summary);
        }
      } else {
        console.error("Failed to fetch today's faculty attendance:", response.message);
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
      console.error("Error fetching today's faculty attendance:", error);
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
        if (response.pagination) {
          setRecordsPagination(response.pagination);
        }
      } else {
        console.error("Failed to fetch faculty attendance records:", response.message);
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
      console.error("Error fetching faculty attendance records:", error);
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
      record.notes || '-'
    ]);

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
      `${summary.attendance_percentage.toFixed(1)}%`
    ]);

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
      console.error("Error fetching faculty details:", error);
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
        const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
        date = new Date(`${today}T${dateString}`);
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'Invalid Date';
      }

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return 'Invalid Date';
    }
  };

  const handlePageChange = (newPage: number) => {
    setTodayPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRecordsPageChange = (newPage: number) => {
    setRecordsPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRecordsPageSizeChange = (newPageSize: number) => {
    setRecordsPagination(prev => ({ ...prev, page_size: newPageSize, page: 1 })); // Reset to page 1 when changing page size
  };

  const loadAllData = async () => {
    // Load all data by setting a large page size
    await fetchTodayAttendance(1, 1000); // Load up to 1000 records
  };

  return (
    <div className={` sm: space-y-4 sm:space-y-6 min-h-screen max-w-[390px] sm:max-w-none mx-auto ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Tab Navigation */}
      <div className={`flex space-x-1 p-1 rounded-lg mt-3 ${theme === 'dark' ? 'bg-card' : 'bg-white'} border ${theme === 'dark' ? 'border-border' : 'border-gray-200'} overflow-x-auto`}>
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'today'
              ? 'bg-primary text-white'
              : theme === 'dark'
                ? 'text-muted-foreground hover:text-foreground'
                : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Today's Attendance
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'records'
              ? 'bg-primary text-white'
              : theme === 'dark'
                ? 'text-muted-foreground hover:text-foreground'
                : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Attendance Records
        </button>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable rows={10} cols={4} />
        </div>
      )}

      {activeTab === 'today' && !isLoading && todaySummary.total_faculty > 0 && (
        <>
          {/* Today's Stats Cards */}
          <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
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
          <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className={`text-sm sm:text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Today's Faculty Attendance ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})
              </h3>
              <button
                onClick={handleExportTodayPDF}
                className={`flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all shadow-md text-xs sm:text-sm font-medium`}
              >
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
                  {todayAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`px-6 py-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        No attendance records for today
                      </td>
                    </tr>
                  ) : (
                    todayAttendance.map((record) => (
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
                          {record.location ? (
                            <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                              {record.location.inside ? (
                                <>On campus • {record.location.distance_meters ? `${Math.round(record.location.distance_meters)} m` : 'distance unknown'}</>
                              ) : (
                                <>Outside campus • {record.location.distance_meters ? `${Math.round(record.location.distance_meters)} m` : 'distance unknown'}</>
                              )}
                              {record.location.campus_name ? ` • ${record.location.campus_name}` : ''}
                            </div>
                          ) : (
                            <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Location not recorded</div>
                          )}
                        </td>
                        <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Today's Pagination Controls (moved to bottom) */}
      {activeTab === 'today' && !isLoading && (
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 p-3 sm:p-4 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} rounded-lg mt-4`}>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
              Showing {todayAttendance.length > 0 ? ((todayPagination.page - 1) * todayPagination.page_size) + 1 : 0} to{' '}
              {Math.min(todayPagination.page * todayPagination.page_size, todayPagination.total_items)} of{' '}
              {todayPagination.total_items} faculty
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {todayPagination.total_items > todayPagination.page_size && (
              <button
                onClick={loadAllData}
                disabled={isLoading}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border border-green-500 text-green-600 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50 whitespace-nowrap ${
                  theme === 'dark' ? 'hover:bg-accent' : ''
                }`}
              >
                {isLoading ? 'Loading...' : 'Load All'}
              </button>
            )}

            <button
              onClick={() => handlePageChange(todayPagination.page - 1)}
              disabled={!todayPagination.has_prev || isLoading}
              className={`px-3 py-2 text-sm font-medium border rounded-md transition-all duration-200 whitespace-nowrap ${
                todayPagination.has_prev && !isLoading
                  ? 'bg-primary text-white border-primary hover:bg-primary/90 shadow-sm'
                  : 'bg-primary opacity-50 text-white border-primary cursor-not-allowed'
              }`}
            >
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
                    className={`px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50 ${
                      pageNum === todayPagination.page
                        ? 'bg-white text-primary font-semibold'
                        : `bg-white text-gray-600 hover:text-primary ${theme === 'dark' ? 'hover:bg-accent' : ''}`
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(todayPagination.page + 1)}
              disabled={!todayPagination.has_next || isLoading}
              className={`px-3 py-2 text-sm font-medium border rounded-md transition-all duration-200 whitespace-nowrap ${
                todayPagination.has_next && !isLoading
                  ? 'bg-primary text-white border-primary hover:bg-primary/90 shadow-sm'
                  : 'bg-primary opacity-50 text-white border-primary cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {activeTab === 'records' && !isLoading && (
        <>
          {/* Date Range Filter */}
          <div className={`p-3 sm:p-4 rounded-lg ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end">
              <div className="w-full sm:w-auto">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                  className={`w-full sm:w-auto px-2 sm:px-3 py-1 sm:py-2 border text-xs sm:text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-background border-border text-foreground'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                  className={`w-full sm:w-auto px-2 sm:px-3 py-1 sm:py-2 border text-xs sm:text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-background border-border text-foreground'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className="w-full sm:w-auto pt-4 sm:pt-0 ml-auto">
                <button
                  onClick={handleExportRecordsPDF}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all shadow-md text-xs sm:text-sm font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Faculty Summary */}
          {facultySummary.length > 0 && (
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
                    {facultySummary.map((summary) => (
                      <React.Fragment key={summary.id}>
                        <tr className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'} ${selectedFaculty?.id === summary.id ? (theme === 'dark' ? 'bg-accent/50' : 'bg-blue-50') : ''}`}>
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
                          <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                            summary.attendance_percentage >= 75 ? 'text-green-600' :
                            summary.attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {summary.attendance_percentage.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => {
                                if (selectedFaculty?.id === summary.id) {
                                  setSelectedFaculty(null);
                                } else {
                                  fetchFacultyDetails(summary);
                                }
                              }}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                theme === 'dark' 
                                  ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                                  : 'bg-primary text-white hover:bg-primary/90'
                              }`}
                            >
                              {selectedFaculty?.id === summary.id ? (isDetailLoading ? 'Loading...' : 'Close') : 'View'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Inline Calendar View */}
                        {selectedFaculty?.id === summary.id && (
                          <tr className={`${theme === 'dark' ? 'bg-accent/10' : 'bg-blue-50/30'}`}>
                            <td colSpan={6} className="px-4 py-6">
                              <div className={`p-4 sm:p-6 rounded-2xl shadow-inner transition-all duration-300 ${theme === 'dark' ? 'bg-card/50 border border-white/5' : 'bg-white border border-blue-100'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                  <div>
                                    <h4 className={`text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                      Attendance Grid
                                    </h4>
                                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                      {formatDate(dateRange.start_date)} — {formatDate(dateRange.end_date)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Present</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Absent</span>
                                    </div>
                                  </div>
                                </div>

                                {isDetailLoading ? (
                                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                    <p className="text-xs font-semibold animate-pulse">Syncing data...</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 gap-2 sm:gap-3">
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
                                        const dateStr = date.toISOString().split('T')[0];
                                        const record = facultyAttendanceDetails.find(r => r.date === dateStr);
                                        const isFuture = date > today;
                                        
                                        const isPresent = record?.status?.toLowerCase() === 'present';
                                        // If no record and not future, it's considered absent
                                        const isAbsent = record?.status?.toLowerCase() === 'absent' || (!record && !isFuture);
                                        
                                        return (
                                          <div 
                                            key={dateStr}
                                            className={`relative group p-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 ${
                                              isPresent 
                                                ? 'bg-green-500/10 border-green-500/30 text-green-600 shadow-sm' 
                                                : isAbsent 
                                                  ? 'bg-red-500/10 border-red-500/30 text-red-600 shadow-sm'
                                                  : theme === 'dark' 
                                                    ? 'bg-white/5 border-white/5 text-white/20' 
                                                    : 'bg-gray-50 border-gray-100 text-gray-300'
                                            }`}
                                          >
                                            <span className="text-[9px] font-black uppercase tracking-tighter mb-0.5 opacity-50">
                                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </span>
                                            <span className="text-lg font-black leading-tight">{date.getDate()}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
                                              {date.toLocaleDateString('en-US', { month: 'short' })}
                                            </span>
                                            
                                            {record ? (
                                              <div className={`mt-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                                                isPresent ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                              }`}>
                                                {record.status[0]}
                                              </div>
                                            ) : (
                                              !isFuture && (
                                                <div className="mt-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter bg-red-500 text-white">
                                                  A
                                                </div>
                                              )
                                            )}
                                            
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg border border-white/10">
                                              {date.toLocaleDateString('en-US', { dateStyle: 'medium' })}
                                              {!record && !isFuture && <div className="text-white/70 mt-0.5 italic">Auto-marked Absent</div>}
                                              {record && <div className="text-white/70 mt-0.5 font-bold uppercase">{record.status}</div>}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default FacultyAttendanceView;