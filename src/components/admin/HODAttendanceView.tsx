import React, { useEffect, useState } from "react";
import { Calendar, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { SkeletonStatsGrid, SkeletonTable } from "../ui/skeleton";

interface TodayRow {
  branch: string;
  hod_name: string;
  hod_id: string;
  contact: string;
  status: string;
  marked_at: string | null;
  notes: string | null;
  location?: {
    inside: boolean;
    distance_meters?: number | null;
    campus_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

interface SummaryRow {
  hod_name: string;
  hod_id: string;
  branch: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  attendance_percentage: number;
}

interface RecordRow {
  faculty_name: string;
  faculty_id: string;
  branch: string;
  date: string;
  status: string;
  marked_at: string | null;
  notes: string | null;
  location?: {
    inside: boolean;
    distance_meters?: number | null;
    campus_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

const AdminHODAttendance: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'today' | 'records'>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Today's snapshot
  const [todayRows, setTodayRows] = useState<TodayRow[]>([]);
  const [todaySummary, setTodaySummary] = useState({ total_hods: 0, present: 0, absent: 0, not_marked: 0 });
  const [todayPagination, setTodayPagination] = useState({ page: 1, page_size: 10, total_pages: 1, total_items: 0, has_next: false, has_prev: false });

  // Records mode
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [facultySummary, setFacultySummary] = useState<SummaryRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [recordsPagination, setRecordsPagination] = useState({ page: 1, page_size: 50, total_pages: 1, total_items: 0, has_next: false, has_prev: false });

  // Detail view (Calendar Grid)
  const [selectedHOD, setSelectedHOD] = useState<SummaryRow | null>(null);
  const [hodAttendanceDetails, setHODAttendanceDetails] = useState<RecordRow[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'present') return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getStatusBadge = (status: string) => {
    const base = 'px-2 py-1 rounded-full text-xs font-medium';
    switch ((status || '').toLowerCase()) {
      case 'present':
        return `${base} bg-green-100 text-green-800`;
      case 'absent':
        return `${base} bg-red-100 text-red-800`;
      default:
        return `${base} bg-gray-100 text-gray-800`;
    }
  };

  const fetchToday = async (page = 1, page_size = 10) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        page_size: String(page_size) 
      });
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/hod-attendance-today/?${params.toString()}`, { method: 'GET' });
      const json = await res.json();
      if (json.success) {
        setTodayRows(json.data || []);
        setTodaySummary(json.summary || { total_hods: 0, present: 0, absent: 0, not_marked: 0 });
        if (json.pagination) {
          setTodayPagination({ 
            page: json.pagination.current_page || 1, 
            page_size: json.pagination.page_size || page_size, 
            total_pages: json.pagination.total_pages || 1, 
            total_items: json.pagination.total_items || 0, 
            has_next: json.pagination.has_next || false, 
            has_prev: json.pagination.has_prev || false 
          });
        }
      } else {
        console.error('Failed to fetch HOD attendance:', json.message);
        Swal.fire('Error', json.message || 'Failed to fetch HOD attendance', 'error');
      }
    } catch (err) {
      console.error('Error fetching HOD attendance:', err);
      Swal.fire('Error', 'Failed to load HOD attendance', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecords = async (page = 1, page_size = 50) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ 
        start_date: dateRange.start_date, 
        end_date: dateRange.end_date, 
        page: String(page), 
        page_size: String(page_size) 
      });
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/hod-attendance-today/?${params.toString()}`, { method: 'GET' });
      const json = await res.json();
      if (json.success) {
        setFacultySummary(json.faculty_summary || []);
        setRecords(json.data || []);
        if (json.pagination) {
          setRecordsPagination({ 
            page: json.pagination.current_page || 1, 
            page_size: json.pagination.page_size || page_size, 
            total_pages: json.pagination.total_pages || 1, 
            total_items: json.pagination.total_items || 0, 
            has_next: json.pagination.has_next || false, 
            has_prev: json.pagination.has_prev || false 
          });
        }
      } else {
        Swal.fire('Error', json.message || 'Failed to fetch records', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Failed to load attendance records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHODDetails = async (hod: SummaryRow) => {
    setIsDetailLoading(true);
    setSelectedHOD(hod);
    try {
      const params = new URLSearchParams({ 
        faculty_id: hod.hod_id,
        start_date: dateRange.start_date, 
        end_date: dateRange.end_date,
        page_size: '1000' 
      });
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/hod-attendance-today/?${params.toString()}`, { method: 'GET' });
      const json = await res.json();
      if (json.success) {
        setHODAttendanceDetails(json.data || []);
      } else {
        Swal.fire("Error", "Failed to load details", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error", "error");
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'today') fetchToday(todayPagination.page, todayPagination.page_size);
    else fetchRecords(recordsPagination.page, recordsPagination.page_size);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'records') fetchRecords(recordsPagination.page, recordsPagination.page_size);
  }, [recordsPagination.page, recordsPagination.page_size]);

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return dateString; }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Not marked';
    try { 
      const d = new Date(dateString); 
      if (isNaN(d.getTime())) return 'Not marked'; 
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); 
    } catch { return 'Not marked'; }
  };

  const handleRecordsPageChange = (newPage: number) => setRecordsPagination(prev => ({ ...prev, page: newPage }));
  const handleTodayPageChange = (newPage: number) => {
    setTodayPagination(prev => ({ ...prev, page: newPage }));
    fetchToday(newPage, todayPagination.page_size);
  };

  return (
    <div className={`space-y-4 sm:space-y-6 text-sm sm:text-base ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Tabs */}
      <div className={`flex space-x-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-card' : 'bg-white'} border ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
        <button onClick={() => setActiveTab('today')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'today' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Today's Attendance</button>
        <button onClick={() => setActiveTab('records')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'records' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Attendance Records</button>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <SkeletonStatsGrid items={4} />
          <SkeletonTable rows={10} cols={6} />
        </div>
      )}

      {activeTab === 'today' && !isLoading && (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4`}>
            <div className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Total HODs</p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{todaySummary.total_hods}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Present</p>
                  <p className={`text-2xl font-bold text-green-600`}>{todaySummary.present}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Absent</p>
                  <p className={`text-2xl font-bold text-red-600`}>{todaySummary.absent}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Not Marked</p>
                  <p className={`text-2xl font-bold text-gray-600`}>{todaySummary.not_marked}</p>
                </div>
                <Clock className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>

          <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-gray-200"><h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Today's HOD Attendance ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})</h3></div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className={`sticky top-0 ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                  <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Branch</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">HOD</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">Contact</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Marked At</th>
                    <th className="px-3 py-3 w-1/6 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                  {todayRows.length === 0 ? (<tr><td colSpan={7} className={`px-6 py-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No HOD attendance records for today</td></tr>) : (
                    todayRows.map((r, idx) => (
                      <tr key={idx} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'}`}>
                        <td className="px-3 py-4 font-medium text-gray-900 truncate">{r.branch}</td>
                        <td className="px-3 py-4 text-gray-900 truncate">{r.hod_name}</td>
                        <td className="px-3 py-4 hidden lg:table-cell text-sm text-gray-600 truncate">{r.contact || '-'}</td>
                        <td className="px-3 py-4"><div className="flex items-center gap-2">{getStatusIcon(r.status)}<span className={getStatusBadge(r.status)}>{r.status}</span></div></td>
                        <td className="px-3 py-4 text-sm text-gray-600 truncate">
                          {r.location ? (
                            <>
                              {r.location.inside ? 'On campus' : 'Outside campus'}
                              {r.location.distance_meters ? ` • ${Math.round(r.location.distance_meters)} m` : ''}
                            </>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600 truncate">{r.marked_at ? formatTime(r.marked_at) : 'Not marked'}</td>
                        <td className="px-3 py-4 hidden lg:table-cell text-sm text-gray-600 truncate">{r.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden p-4 space-y-3">
              {todayRows.map((r, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{r.branch}</div>
                      <div className="font-medium text-gray-900 truncate">{r.hod_name}</div>
                    </div>
                    <div className="text-sm text-right">
                      <div className="mt-1">{getStatusIcon(r.status)}<span className={`ml-2 ${getStatusBadge(r.status)}`}>{r.status}</span></div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">Marked: {r.marked_at ? formatTime(r.marked_at) : 'Not marked'}</div>
                </div>
              ))}
            </div>

            {/* Pagination for Today */}
            {todayPagination.total_pages > 1 && (
              <div className={`px-6 py-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-border' : 'border-gray-100'}`}>
                <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Showing <span className="font-medium">{(todayPagination.page - 1) * todayPagination.page_size + 1}</span> to <span className="font-medium">{Math.min(todayPagination.page * todayPagination.page_size, todayPagination.total_items)}</span> of <span className="font-medium">{todayPagination.total_items}</span> HODs
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTodayPageChange(todayPagination.page - 1)}
                    disabled={!todayPagination.has_prev}
                    className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${!todayPagination.has_prev ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-accent border-border' : 'hover:bg-gray-50 border-gray-200'}`}
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: todayPagination.total_pages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === todayPagination.total_pages || Math.abs(p - todayPagination.page) <= 1)
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i-1] !== p - 1 && <span className="px-1 opacity-50">...</span>}
                          <button
                            onClick={() => handleTodayPageChange(p)}
                            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${todayPagination.page === p ? 'bg-primary text-white' : theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'}`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))
                    }
                  </div>
                  <button
                    onClick={() => handleTodayPageChange(todayPagination.page + 1)}
                    disabled={!todayPagination.has_next}
                    className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${!todayPagination.has_next ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-accent border-border' : 'hover:bg-gray-50 border-gray-200'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'records' && !isLoading && (
        <>
          {/* Filters */}
          <div className={`p-4 rounded-lg shadow-sm mb-6 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-full sm:w-auto">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Start Date</label>
                <input type="date" value={dateRange.start_date} onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))} className={`w-full sm:w-auto px-2 sm:px-3 py-1 sm:py-2 border text-xs sm:text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`} />
              </div>
              <div className="w-full sm:w-auto">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>End Date</label>
                <input type="date" value={dateRange.end_date} onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))} className={`w-full sm:w-auto px-2 sm:px-3 py-1 sm:py-2 border text-xs sm:text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`} />
              </div>
              <button 
                onClick={() => { setRecordsPagination(p => ({ ...p, page: 1 })); fetchRecords(1); }} 
                className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md font-medium transition-colors text-sm"
              >
                Apply Filter
              </button>
            </div>
          </div>

          <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>HOD Attendance Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                  <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>HOD Name</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Branch</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Total Days</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Present</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Absent</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Attendance %</th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                  {facultySummary.map((s, idx) => (
                    <React.Fragment key={idx}>
                      <tr className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'} ${selectedHOD?.hod_id === s.hod_id ? (theme === 'dark' ? 'bg-accent/50' : 'bg-blue-50') : ''}`}>
                        <td className="px-6 py-4 font-medium text-gray-900">{s.hod_name}</td>
                        <td className="px-6 py-4 text-gray-900">{s.branch}</td>
                        <td className="px-6 py-4 text-gray-900">{s.total_days}</td>
                        <td className="px-6 py-4 text-green-600 font-medium">{s.present_days}</td>
                        <td className="px-6 py-4 text-red-600 font-medium">{s.absent_days}</td>
                        <td className={`px-6 py-4 font-medium ${s.attendance_percentage >= 75 ? 'text-green-600' : s.attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{s.attendance_percentage.toFixed(1)}%</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => selectedHOD?.hod_id === s.hod_id ? setSelectedHOD(null) : fetchHODDetails(s)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-primary text-white hover:bg-primary/90'}`}
                          >
                            {selectedHOD?.hod_id === s.hod_id ? (isDetailLoading ? 'Loading...' : 'Close') : 'View'}
                          </button>
                        </td>
                      </tr>
                      
                      {selectedHOD?.hod_id === s.hod_id && (
                        <tr className={`${theme === 'dark' ? 'bg-accent/10' : 'bg-blue-50/30'}`}>
                          <td colSpan={7} className="px-4 py-6">
                            <div className={`p-4 sm:p-6 rounded-2xl shadow-inner transition-all duration-300 ${theme === 'dark' ? 'bg-card/50 border border-white/5' : 'bg-white border border-blue-100'}`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                <div>
                                  <h4 className={`text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Attendance Grid</h4>
                                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{formatDate(dateRange.start_date)} — {formatDate(dateRange.end_date)}</p>
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
                                      const record = hodAttendanceDetails.find(r => r.date === dateStr);
                                      const isFuture = date > today;
                                      const isPresent = record?.status?.toLowerCase() === 'present';
                                      const isAbsent = record?.status?.toLowerCase() === 'absent' || (!record && !isFuture);
                                      
                                      return (
                                        <div key={dateStr} className={`relative group p-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 ${isPresent ? 'bg-green-500/10 border-green-500/30 text-green-600 shadow-sm' : isAbsent ? 'bg-red-500/10 border-red-500/30 text-red-600 shadow-sm' : theme === 'dark' ? 'bg-white/5 border-white/5 text-white/20' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                          <span className="text-[9px] font-black uppercase tracking-tighter mb-0.5 opacity-50">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                          <span className="text-lg font-black leading-tight">{date.getDate()}</span>
                                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                                          {record ? (
                                            <div className={`mt-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${isPresent ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{record.status[0]}</div>
                                          ) : (!isFuture && <div className="mt-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter bg-red-500 text-white">A</div>)}
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
        </>
      )}
    </div>
  );
};

export default AdminHODAttendance;
