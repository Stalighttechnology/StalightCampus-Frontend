import React, { useEffect, useState } from "react";
import { Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { normalizePaginatedResponse } from '../../utils/normalizePagination';
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"../ui/dialog";
import { SkeletonStatsGrid, SkeletonTable } from "../ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as ShadcnCalendar } from "../ui/calendar";
import { Button } from "../ui/button";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"../ui/table";

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
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE'),
    end_date: new Date().toLocaleDateString('sv-SE')
  });
  const [facultySummary, setFacultySummary] = useState<SummaryRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [recordsPagination, setRecordsPagination] = useState({ page: 1, page_size: 50, total_pages: 1, total_items: 0, has_next: false, has_prev: false });

  // Detail view (Calendar Grid)
  const [selectedHOD, setSelectedHOD] = useState<SummaryRow | null>(null);
  const [hodAttendanceDetails, setHODAttendanceDetails] = useState<RecordRow[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'present') return <CheckCircle className="w-5 h-5 text-green-500" />;
    return null;
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
        const norm = normalizePaginatedResponse(json, 'data');
        const items = norm.items && norm.items.length ? norm.items : json.data || [];
        setTodayRows(items);
        setTodaySummary(json.summary || { total_hods: 0, present: 0, absent: 0, not_marked: 0 });
        const count = norm.meta.totalItems ?? json.count ?? items.length;
        setTodayPagination({
          page: norm.meta.currentPage ?? json.pagination?.current_page ?? 1,
          page_size: json.pagination?.page_size || page_size,
          total_pages: norm.meta.totalPages ?? json.pagination?.total_pages ?? Math.max(1, Math.ceil(count / page_size)),
          total_items: count,
          has_next: !!(norm.meta.next ?? json.pagination?.next),
          has_prev: !!(norm.meta.previous ?? json.pagination?.previous)
        });
      } else {

        Swal.fire('Error', json.message || 'Failed to fetch HOD attendance', 'error');
      }
    } catch (err) {

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
        const norm = normalizePaginatedResponse(json, 'data');
        const items = norm.items && norm.items.length ? norm.items : json.data || [];
        const count = norm.meta.totalItems ?? json.count ?? items.length;
        setFacultySummary(json.faculty_summary || []);
        setRecords(items);
        setRecordsPagination({
          page: norm.meta.currentPage ?? json.pagination?.current_page ?? 1,
          page_size: json.pagination?.page_size || page_size,
          total_pages: norm.meta.totalPages ?? json.pagination?.total_pages ?? Math.max(1, Math.ceil(count / page_size)),
          total_items: count,
          has_next: !!(norm.meta.next ?? json.pagination?.next),
          has_prev: !!(norm.meta.previous ?? json.pagination?.previous)
        });
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
    if (activeTab === 'today') {
      fetchToday(todayPagination.page, todayPagination.page_size);
    } else if (activeTab === 'records' && hasSearched) {
      fetchRecords(recordsPagination.page, recordsPagination.page_size);
    }
  }, [activeTab, hasSearched, recordsPagination.page, recordsPagination.page_size]);

  // Listen for onboarding tour tab-switch events so the tour can reveal the
  // Attendance Records filter panel without manual user interaction.
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

  const formatDate = (dateString: string) => {
    try {return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });} catch {return dateString;}
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Not marked';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return 'Not marked';
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {return 'Not marked';}
  };

  const handleRecordsPageChange = (newPage: number) => setRecordsPagination((prev) => ({ ...prev, page: newPage }));
  const handleTodayPageChange = (newPage: number) => {
    setTodayPagination((prev) => ({ ...prev, page: newPage }));
    fetchToday(newPage, todayPagination.page_size);
  };

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .attendance-header { padding: 16px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .attendance-card { border-radius: 12px !important; }
          .attendance-table-header { font-size: 11px !important; padding: 12px 8px !important; }
          .attendance-table-cell { font-size: 13px !important; padding: 12px 8px !important; }
          .attendance-pagination { flex-direction: column !important; gap: 12px !important; align-items: center !important; text-align: center !important; }
          .faculty-name-cell { font-size: 14px !important; font-weight: 600 !important; }
          .branch-cell { font-size: 15px !important; color: hsl(var(--muted-foreground)) !important; }
        }
        .custom-table-header {
          background-color: ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'} !important;
          border-bottom: 2px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0'} !important;
        }
        .custom-header-text {
          font-weight: 700 !important;
          color: ${theme === 'dark' ? '#94a3b8' : '#475569'} !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
      `}</style>
      <div id="hod-attendance-container" className={`space-y-4 sm:space-y-6 text-sm sm:text-base ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>

      {isLoading &&
        <div className="space-y-6">
          {/* Tab bar shown during loading too */}
          <div className={`flex space-x-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-card' : 'bg-white'} border ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
            <button onClick={() => setActiveTab('today')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'today' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Today's Attendance</button>
            <button onClick={() => setActiveTab('records')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'records' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Attendance Records</button>
          </div>
          <SkeletonStatsGrid items={4} />
          <SkeletonTable rows={10} cols={6} />
        </div>
        }

      {activeTab === 'today' && !isLoading &&
        <>
          {/* Step 1 spotlight: tab bar + stats cards + Today's table header */}
          <div id="hod-attendance-today-section" className="space-y-4">
            {/* Tab bar */}
            <div className={`flex space-x-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-card' : 'bg-white'} border ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
              <button onClick={() => setActiveTab('today')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'today' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Today's Attendance</button>
              <button onClick={() => setActiveTab('records')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'records' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Attendance Records</button>
            </div>
            {/* Stats grid */}
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
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            </div>
            <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200"><h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Today's HOD Attendance ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })})</h3></div>
            </div>
          </div>

          <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
            <div className="hidden md:block overflow-x-auto">
              {todayRows.length === 0 ?
              <div className={`flex flex-col items-center justify-center py-20 px-4 ${theme === 'dark' ? 'bg-card/30' : 'bg-white'}`}>
                  <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <Users className="w-10 h-10 text-primary opacity-50" />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No attendance today</h3>
                  <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    There are no HOD attendance records marked for today yet.
                  </p>
                </div> :

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
                    {todayRows.map((r, idx) =>
                  <tr key={idx} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'} transition-colors`}>
                        <td className="px-3 py-4 font-medium text-gray-900 whitespace-normal break-words branch-cell">{r.branch}</td>
                        <td className="px-3 py-4 text-gray-900 whitespace-normal break-words faculty-name-cell">{r.hod_name}</td>
                        <td className="px-3 py-4 hidden lg:table-cell text-sm text-gray-600 whitespace-normal break-words">{r.contact || '-'}</td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(r.status)}
                            <span className={getStatusBadge(r.status)}>{r.status}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600 whitespace-normal break-words">
                          {r.location ?
                      <>
                              {r.location.inside ? 'On campus' : 'Outside campus'}
                              {r.location.distance_meters ? ` • ${Math.round(r.location.distance_meters)} m` : ''}
                            </> :
                      '-'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600 whitespace-normal break-words">{r.marked_at ? formatTime(r.marked_at) : 'Not marked'}</td>
                        <td className="px-3 py-4 hidden lg:table-cell text-sm text-gray-600 whitespace-normal break-words">{r.notes || '-'}</td>
                      </tr>
                  )}
                  </tbody>
                </table>
              }
            </div>
            <div className="md:hidden p-4 space-y-3">
              {todayRows.length === 0 ?
              <div className={`text-center py-10 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No attendance records today</div> :

              todayRows.map((r, idx) =>
              <div key={idx} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500 whitespace-normal break-words">{r.branch}</div>
                        <div className="font-medium text-gray-900 whitespace-normal break-words">{r.hod_name}</div>
                      </div>
                      <div className="text-sm text-right shrink-0">
                        <div className="mt-1 flex items-center justify-end gap-1">
                          {getStatusIcon(r.status)}
                          <span className={getStatusBadge(r.status)}>{r.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 whitespace-normal break-words">Marked: {r.marked_at ? formatTime(r.marked_at) : 'Not marked'}</div>
                    {r.notes && <div className="mt-1 text-xs text-muted-foreground italic whitespace-normal break-words">Note: {r.notes}</div>}
                  </div>
              )
              }
            </div>

            {/* Pagination for Today */}
            {todayPagination.total_pages > 1 &&
            <div className={`px-6 py-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-border' : 'border-gray-100'}`}>
                <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Showing <span className="font-medium">{(todayPagination.page - 1) * todayPagination.page_size + 1}</span> to <span className="font-medium">{Math.min(todayPagination.page * todayPagination.page_size, todayPagination.total_items)}</span> of <span className="font-medium">{todayPagination.total_items}</span> HODs
                </div>
                <div className="flex gap-2">
                  <button
                  onClick={() => handleTodayPageChange(todayPagination.page - 1)}
                  disabled={!todayPagination.has_prev}
                  className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${!todayPagination.has_prev ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-accent border-border' : 'hover:bg-gray-50 border-gray-200'}`}>
                  
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: todayPagination.total_pages }, (_, i) => i + 1).
                  filter((p) => p === 1 || p === todayPagination.total_pages || Math.abs(p - todayPagination.page) <= 1).
                  map((p, i, arr) =>
                  <React.Fragment key={p}>
                          {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 opacity-50">...</span>}
                          <button
                      onClick={() => handleTodayPageChange(p)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${todayPagination.page === p ? 'bg-primary text-white' : theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'}`}>
                      
                            {p}
                          </button>
                        </React.Fragment>
                  )
                  }
                  </div>
                  <button
                  onClick={() => handleTodayPageChange(todayPagination.page + 1)}
                  disabled={!todayPagination.has_next}
                  className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${!todayPagination.has_next ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-accent border-border' : 'hover:bg-gray-50 border-gray-200'}`}>
                  
                    Next
                  </button>
                </div>
              </div>
            }
          </div>
        </>
        }

      {activeTab === 'records' && !isLoading &&
        <>
          {/* Step 2 spotlight: tab bar + filter panel */}
          <div id="hod-attendance-records-section" className="space-y-4">
            {/* Tab bar */}
            <div className={`flex space-x-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-card' : 'bg-white'} border ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
              <button onClick={() => setActiveTab('today')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'today' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Today's Attendance</button>
              <button onClick={() => setActiveTab('records')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === 'records' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Attendance Records</button>
            </div>
            {/* Date range filter */}
            <div id="hod-attendance-filter-section" className={`p-4 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-full sm:w-auto">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Start Date</label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[240px] justify-start text-left font-normal",
                        !dateRange.start_date && "text-muted-foreground",
                        theme === 'dark' ? "bg-background border-border text-foreground" : "bg-white border-gray-300 text-gray-900"
                      )}>
                      
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.start_date ? format(new Date(dateRange.start_date), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <ShadcnCalendar
                      mode="single"
                      selected={new Date(dateRange.start_date)}
                      onSelect={(date) => {
                        if (date) {
                          setDateRange((prev) => ({ ...prev, start_date: format(date, "yyyy-MM-dd") }));
                          setStartDateOpen(false);
                        }
                      }}
                      initialFocus />
                    
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-full sm:w-auto">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>End Date</label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[240px] justify-start text-left font-normal",
                        !dateRange.end_date && "text-muted-foreground",
                        theme === 'dark' ? "bg-background border-border text-foreground" : "bg-white border-gray-300 text-gray-900"
                      )}>
                      
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.end_date ? format(new Date(dateRange.end_date), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <ShadcnCalendar
                      mode="single"
                      selected={new Date(dateRange.end_date)}
                      onSelect={(date) => {
                        if (date) {
                          setDateRange((prev) => ({ ...prev, end_date: format(date, "yyyy-MM-dd") }));
                          setEndDateOpen(false);
                        }
                      }}
                      disabled={(date) => {
                        const start = new Date(dateRange.start_date);
                        start.setHours(0, 0, 0, 0);
                        return date <= start;
                      }}
                      initialFocus />
                    
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                onClick={() => {
                  setHasSearched(true);
                  setRecordsPagination((p) => ({ ...p, page: 1 }));
                  fetchRecords(1);
                }}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white">
                
                Apply Filter
              </Button>
            </div>
          </div>
          </div>

          {!hasSearched ?
          <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-white'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                <CalendarIcon className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Ready to view attendance?</h3>
              <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Select a start and end date above, then click <strong>Apply Filter</strong> to view HOD attendance records.
              </p>
            </div> :
          facultySummary.length === 0 ?
          <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-white'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                <Users className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No records found</h3>
              <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                We couldn't find any attendance history for the selected date range. Try adjusting your dates.
              </p>
            </div> :

          <div className={`rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>HOD Attendance Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-card' : 'bg-gray-50'}>
                    <TableRow className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                      <TableHead className="px-6 py-3 text-left">HOD Name</TableHead>
                      <TableHead className="px-6 py-3 text-left">Branch</TableHead>
                      <TableHead className="px-6 py-3 text-left">Total Days</TableHead>
                      <TableHead className="px-6 py-3 text-left">Present</TableHead>
                      <TableHead className="px-6 py-3 text-left">Absent</TableHead>
                      <TableHead className="px-6 py-3 text-left">Attendance</TableHead>
                      <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facultySummary.map((s, idx) =>
                  <TableRow key={idx} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'} transition-colors border-b last:border-0`}>
                        <TableCell className="font-semibold text-foreground faculty-name-cell py-5">{s.hod_name}</TableCell>
                        <TableCell className="text-foreground branch-cell py-5">{s.branch}</TableCell>
                        <TableCell className="text-foreground">{s.total_days}</TableCell>
                        <TableCell className="text-green-600 font-medium">{s.present_days}</TableCell>
                        <TableCell className="text-red-600 font-medium">{s.absent_days}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${s.attendance_percentage >= 75 ? 'text-green-600' : s.attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {s.attendance_percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                        onClick={() => fetchHODDetails(s)}
                        variant="ghost"
                        size="sm"
                        className={`h-8 gap-2 ${theme === 'dark' ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-white' : 'bg-primary text-white hover:bg-primary/90 hover:text-white'}`}>
                        
                            <CalendarIcon className="w-3.5 h-3.5" />
                            View Grid
                          </Button>
                        </TableCell>
                      </TableRow>
                  )}
                  </TableBody>
                </Table>
              </div>
            </div>
          }
        </>
        }

      {/* Attendance Grid Dialog */}
      <Dialog open={!!selectedHOD} onOpenChange={(open) => !open && setSelectedHOD(null)}>
        <DialogContent className="w-[90vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl sm:rounded-xl p-0 border-none shadow-2xl custom-scrollbar">
          <div className="p-4 sm:p-6 space-y-6">
            <DialogHeader className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Attendance Grid</DialogTitle>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Reviewing records for <span className="font-semibold text-primary">{selectedHOD?.hod_name}</span>
                  </p>
                  <p className="text-[10px] mt-1 font-semibold uppercase tracking-widest opacity-60">
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
                      const record = hodAttendanceDetails.find((r) => r.date === dateStr);
                      const isFuture = date > today;
                      const isPresent = record?.status?.toLowerCase() === 'present';
                      const isAbsent = record?.status?.toLowerCase() === 'absent' || !record && !isFuture;

                      return (
                        <div key={dateStr} className={`relative group p-4 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-md ${isPresent ? 'bg-green-500/10 border-green-500/30 text-green-600' : isAbsent ? 'bg-red-500/10 border-red-500/30 text-red-600' : theme === 'dark' ? 'bg-white/5 border-white/5 text-muted-foreground/30' : 'bg-gray-100 border-gray-200 text-gray-300'}`}>
                          <span className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-60">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className="text-xl font-black leading-tight">{date.getDate()}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                          {record ?
                          <div className={`mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${isPresent ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}>{record.status[0]}</div> :
                          !isFuture && <div className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]">A</div>}
                          
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
              <Button onClick={() => setSelectedHOD(null)} variant="outline" className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90 hover:text-white">Close</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>);

};

export default AdminHODAttendance;