import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Eye,
  Check,
  Loader2,
  Download,
  History,
  CalendarRange,
} from 'lucide-react';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { API_ENDPOINT } from '../../utils/config';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardCard from '../common/DashboardCard';
import { actionGatePass, exportGatePassesPdf } from '../../utils/hms_api';
import { useWardenContext } from '../../context/WardenContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

interface GatePass {
  id: number;
  student: number;
  student_name: string;
  student_usn: string;
  room_number: string;
  hostel: number;
  hostel_name: string;
  warden: number;
  warden_name: string;
  reason: string;
  out_date: string;
  out_time: string;
  expected_return_date: string;
  expected_return_time: string;
  status: 'pending' | 'approved' | 'rejected';
  action_note?: string;
  created_at: string;
  actioned_at?: string;
}

/* ──────────────────────────────────────────────────────── helpers ── */
const formatTimeToAmPm = (timeStr: string) => {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  } catch { return timeStr; }
};

const formatDateString = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year.slice(2)}`;
    }
    return dateStr;
  } catch { return dateStr; }
};

/* ──────────────────────────────────────────────────── sub-components ── */
const SkeletonTable = ({ cols }: { cols: number }) => (
  <>
    {Array.from({ length: 4 }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={j} className="p-4">
            <div className="space-y-1.5">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted/60 rounded w-1/2" />
            </div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

const EmptyState = ({ label }: { label: string }) => (
  <tr>
    <td colSpan={99} className="py-20 text-center">
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="bg-muted p-4 rounded-full">
          <FileText className="w-8 h-8 text-muted-foreground/60" />
        </div>
        <p className="font-semibold text-muted-foreground text-lg">{label}</p>
        <p className="text-xs text-muted-foreground max-w-xs">No records match your current filters.</p>
      </div>
    </td>
  </tr>
);

const PaginationFooter = ({
  page, totalPages, totalCount, pageSize = 10, loading, onPrev, onNext, theme,
}: {
  page: number; totalPages: number; totalCount: number; pageSize?: number;
  loading: boolean; onPrev: () => void; onNext: () => void; theme: string;
}) => (
  <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t">
    <div>Showing {Math.min((page - 1) * pageSize + 1, totalCount)} – {Math.min(page * pageSize, totalCount)} of {totalCount}</div>
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onPrev} disabled={page === 1 || loading}
        className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4">Previous</Button>
      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{page}</span>
      <Button size="sm" onClick={onNext} disabled={page === totalPages || loading}
        className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4">Next</Button>
    </div>
  </CardFooter>
);

/* ──────────────────────────────────────────────────── main component ── */
const WardenGatePassManagement = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const { managedHostels } = useWardenContext();

  type Tab = 'active' | 'history';
  const [activeTab, setActiveTab] = useState<Tab>('active');

  /* ── Active tab state ── */
  const [requests, setRequests] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [hostelFilter, setHostelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  /* ── History tab state ── */
  const [historyRequests, setHistoryRequests] = useState<GatePass[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [fromCalendarOpen, setFromCalendarOpen] = useState(false);
  const [toCalendarOpen, setToCalendarOpen] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyHostelFilter, setHistoryHostelFilter] = useState('all');
  const [historyLoaded, setHistoryLoaded] = useState(false); // lazy — only fetch when tab opened

  /* ── Dialog / Action ── */
  const [selectedRequest, setSelectedRequest] = useState<GatePass | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  /* ── Filter popover ── */
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Active tab fetch ── */
  useEffect(() => {
    if (activeTab === 'active') fetchRequests();
  }, [statusFilter, hostelFilter, currentPage, activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let url = `${API_ENDPOINT}/hms/student/gate-pass/?page=${currentPage}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (hostelFilter !== 'all') url += `&hostel_id=${hostelFilter}`;

      const response = await fetchWithTokenRefresh(url);
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          setRequests(data.results);
          setTotalCount(data.count || data.results.length);
          setTotalPages(data.total_pages || 1);
        } else if (Array.isArray(data.data)) {
          setRequests(data.data);
          setTotalCount(data.data.length);
          setTotalPages(1);
        }
        if (data.stats) {
          setStats({
            total: data.stats.total || 0,
            pending: data.stats.pending || 0,
            approved: data.stats.approved || 0,
            rejected: data.stats.rejected || 0,
          });
          setStatsLoading(false);
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load gate pass requests.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  /* ── History tab fetch ── */
  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, historyPage, historyDateFrom, historyDateTo, historyStatusFilter, historyHostelFilter]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryLoaded(true);
    try {
      let url = `${API_ENDPOINT}/hms/student/gate-pass/?history=true&page=${historyPage}`;
      if (historyDateFrom) url += `&date_from=${historyDateFrom}`;
      if (historyDateTo)   url += `&date_to=${historyDateTo}`;
      if (historyStatusFilter !== 'all') url += `&status=${historyStatusFilter}`;
      if (historyHostelFilter !== 'all') url += `&hostel_id=${historyHostelFilter}`;

      const response = await fetchWithTokenRefresh(url);
      if (response.ok) {
        const data = await response.json();
        setHistoryRequests(data.results || []);
        setHistoryTotalCount(data.count || 0);
        setHistoryTotalPages(data.total_pages || 1);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load history.', variant: 'destructive' });
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ── Actions ── */
  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const res = await actionGatePass(selectedRequest.id, action, actionNote);
      if (res.success) {
        toast({ title: 'Success', description: `Gate pass ${action === 'approve' ? 'approved' : 'rejected'} successfully.` });
        setSelectedRequest(null);
        setActionNote('');
        fetchRequests();
      } else {
        toast({ title: 'Error', description: res.message || 'Action failed.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Connection error.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const blob = await exportGatePassesPdf(statusFilter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Gate_Passes_${statusFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: 'Export Successful', description: 'PDF downloaded.' });
    } catch {
      toast({ title: 'Export Failed', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setExportingPdf(false);
    }
  };

  const getStatusBadge = (s: string) => {
    if (s === 'approved') return <Badge className="bg-green-500/10 text-green-600 border-green-200 capitalize">Approved</Badge>;
    if (s === 'rejected') return <Badge className="bg-red-500/10 text-red-600 border-red-200 capitalize">Rejected</Badge>;
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200 capitalize">Pending</Badge>;
  };

  /* ──────────────────────────────────────────── render ── */
  return (
    <div className="space-y-6">
      {/* Stats grid — only shown on active tab */}
      {activeTab === 'active' && (
        <div id="warden-gatepass-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard title="Total Requests"   value={statsLoading ? <div className="h-6 w-12 bg-muted animate-pulse rounded" /> : stats.total}   description="All time requests"    icon={<FileText className="w-5 h-5 text-purple-500" />} />
          <DashboardCard title="Pending Approval" value={statsLoading ? <div className="h-6 w-12 bg-muted animate-pulse rounded" /> : stats.pending} description="Awaiting your review" icon={<Clock className="w-5 h-5 text-amber-500" />} />
          <DashboardCard title="Approved"         value={statsLoading ? <div className="h-6 w-12 bg-muted animate-pulse rounded" /> : stats.approved} description="Granted permission"   icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} />
          <DashboardCard title="Rejected"         value={statsLoading ? <div className="h-6 w-12 bg-muted animate-pulse rounded" /> : stats.rejected} description="Declined requests"    icon={<XCircle className="w-5 h-5 text-red-500" />} />
        </div>
      )}

      {/* Main Card */}
      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        {/* ── Card Header ── */}
        <CardHeader className="pb-0 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-xl">Gate Pass Requests</CardTitle>
              <CardDescription>Review and action leaves and off-campus gate pass requests.</CardDescription>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60 self-center sm:self-start">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'active'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Active
              </button>
              <button
                onClick={() => { setActiveTab('history'); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="w-3.5 h-3.5" /> History
              </button>
            </div>
          </div>

          {/* ── Active tab toolbar ── */}
          {activeTab === 'active' && (
            <div className="flex flex-wrap items-end gap-2 pb-4">
              {managedHostels && managedHostels.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full sm:w-[160px]">
                  <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider ml-1">Select Hostel</span>
                  <Select value={hostelFilter} onValueChange={(v) => { setHostelFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-9 w-full rounded-xl text-xs font-semibold">
                      <SelectValue placeholder="All Hostels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hostels</SelectItem>
                      {managedHostels.map((h: any) => (
                        <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="relative" ref={filterRef}>
                <Button size="sm" onClick={() => setShowFilter(!showFilter)}
                  className="bg-primary hover:bg-primary/90 text-white h-9 px-3.5 rounded-xl font-semibold text-xs gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </Button>
                {showFilter && (
                  <div className={`absolute left-0 mt-2 w-44 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-xl shadow-xl z-50 p-1`}>
                    {[
                      { label: 'All Status', value: 'all' },
                      { label: 'Pending', value: 'pending' },
                      { label: 'Approved', value: 'approved' },
                      { label: 'Rejected', value: 'rejected' },
                    ].map((item) => (
                      <button key={item.value}
                        className={`block w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                          statusFilter === item.value
                            ? 'bg-primary/10 text-primary font-semibold'
                            : theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => { setStatusFilter(item.value); setCurrentPage(1); setShowFilter(false); }}
                      >{item.label}</button>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleExportPDF} size="sm" disabled={exportingPdf}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold rounded-xl h-9 px-3 bg-primary hover:bg-primary/90 text-white shadow-sm ml-auto">
                {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export PDF
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="icon" disabled={exportingPdf}
                className="flex sm:hidden h-9 w-9 rounded-xl ml-auto">
                {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-wrap items-end justify-between gap-4 pb-4 w-full">
              {/* Date range */}
              <div className="flex items-end gap-2 flex-wrap w-full sm:w-auto">
                <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
                  <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider ml-1">From Date</span>
                  <Popover open={fromCalendarOpen} onOpenChange={setFromCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        className={cn(
                          "h-9 w-full sm:w-[130px] justify-start text-left font-normal text-xs rounded-xl border border-border bg-background px-3 hover:bg-accent hover:text-accent-foreground",
                          !historyDateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70 shrink-0" />
                        <span className="truncate">
                          {historyDateFrom ? format(new Date(historyDateFrom + 'T00:00:00'), 'dd-MM-yyyy') : 'Select Date'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border rounded-md shadow-md" align="start">
                      <Calendar
                        mode="single"
                        selected={historyDateFrom ? new Date(historyDateFrom + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          setHistoryDateFrom(date ? format(date, 'yyyy-MM-dd') : '');
                          setHistoryPage(1);
                          setFromCalendarOpen(false);
                        }}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (historyDateTo) {
                            const endDate = new Date(historyDateTo + 'T00:00:00');
                            const compareDate = new Date(date);
                            compareDate.setHours(0, 0, 0, 0);
                            endDate.setHours(0, 0, 0, 0);
                            return compareDate > endDate;
                          }
                          return false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <span className="text-muted-foreground text-xs shrink-0 mb-3">–</span>

                <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
                  <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider ml-1">To Date</span>
                  <Popover open={toCalendarOpen} onOpenChange={setToCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        className={cn(
                          "h-9 w-full sm:w-[130px] justify-start text-left font-normal text-xs rounded-xl border border-border bg-background px-3 hover:bg-accent hover:text-accent-foreground",
                          !historyDateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70 shrink-0" />
                        <span className="truncate">
                          {historyDateTo ? format(new Date(historyDateTo + 'T00:00:00'), 'dd-MM-yyyy') : 'Select Date'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border rounded-md shadow-md" align="start">
                      <Calendar
                        mode="single"
                        selected={historyDateTo ? new Date(historyDateTo + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          setHistoryDateTo(date ? format(date, 'yyyy-MM-dd') : '');
                          setHistoryPage(1);
                          setToCalendarOpen(false);
                        }}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (historyDateFrom) {
                            const startDate = new Date(historyDateFrom + 'T00:00:00');
                            const compareDate = new Date(date);
                            compareDate.setHours(0, 0, 0, 0);
                            startDate.setHours(0, 0, 0, 0);
                            return compareDate < startDate;
                          }
                          return false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {(historyDateFrom || historyDateTo) && (
                  <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); setHistoryPage(1); }}
                    className="text-xs text-primary font-semibold hover:underline shrink-0 mb-3">Clear</button>
                )}
              </div>

              {/* Filter Dropdowns (aligned to the right) */}
              <div className="flex items-end gap-2 w-full sm:w-auto sm:ml-auto">
                {/* Hostel filter (only if warden manages multiple hostels) */}
                {managedHostels && managedHostels.length > 0 && (
                  <div className="flex-1 sm:flex-initial flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider ml-1">Select Hostel</span>
                    <Select value={historyHostelFilter} onValueChange={(v) => { setHistoryHostelFilter(v); setHistoryPage(1); }}>
                      <SelectTrigger className="h-9 w-full sm:w-[150px] rounded-xl text-xs font-semibold">
                        <SelectValue placeholder="All Hostels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Hostels</SelectItem>
                        {managedHostels.map((h: any) => (
                          <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Status filter */}
                <div className="flex-1 sm:flex-initial flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider ml-1">Select Status</span>
                  <Select value={historyStatusFilter} onValueChange={(v) => { setHistoryStatusFilter(v); setHistoryPage(1); }}>
                    <SelectTrigger className="h-9 w-full sm:w-[140px] rounded-xl text-xs font-semibold">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* ── ACTIVE TAB ── */}
          {activeTab === 'active' && (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3 animate-pulse">
                      <div className="flex justify-between"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-6 w-16 bg-muted rounded-full" /></div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40"><div className="h-4 bg-muted rounded" /><div className="h-4 bg-muted rounded" /></div>
                      <div className="h-9 bg-muted rounded-xl w-full" />
                    </div>
                  ))
                ) : requests.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="bg-muted p-3 rounded-full w-fit mx-auto"><FileText className="w-6 h-6 text-muted-foreground/60" /></div>
                    <p className="font-semibold text-muted-foreground text-sm">No {statusFilter !== 'all' ? statusFilter : ''} requests found</p>
                  </div>
                ) : requests.map((gp) => (
                  <div key={gp.id} className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3 shadow-sm hover:border-primary/40 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">{gp.student_name}</h4>
                        <span className="text-[13px] text-muted-foreground uppercase font-mono">{gp.student_usn}</span>
                      </div>
                      {getStatusBadge(gp.status)}
                    </div>
                    <div className="text-sm bg-muted/30 p-3 rounded-xl border border-border/40 flex justify-between items-center">
                      <span className="font-semibold">{gp.hostel_name}</span>
                      <span className="text-xs bg-background px-2.5 py-1 rounded-md border border-border/40 font-semibold">{gp.room_number || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold block">Out</span>
                        <span className="font-semibold text-sm block">{formatDateString(gp.out_date)}</span>
                        <span className="text-muted-foreground text-xs block">{formatTimeToAmPm(gp.out_time)}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold block">Return</span>
                        <span className="font-semibold text-sm block">{formatDateString(gp.expected_return_date)}</span>
                        <span className="text-muted-foreground text-xs block">{formatTimeToAmPm(gp.expected_return_time)}</span>
                      </div>
                    </div>
                    {gp.reason && (
                      <div className="pt-2 border-t border-border/40 text-xs">
                        <span className="text-[13px] uppercase tracking-wider text-muted-foreground font-semibold block mb-0.5">Reason</span>
                        <p className="text-muted-foreground font-medium leading-relaxed">{gp.reason}</p>
                      </div>
                    )}
                    <div className="pt-2">
                      {gp.status === 'pending' ? (
                        <Button size="sm" onClick={() => setSelectedRequest(gp)}
                          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl h-9 gap-1.5">
                          <Check className="w-4 h-4" /> Review Request
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setSelectedRequest(gp)}
                          className="w-full text-xs font-semibold h-9 gap-1.5 rounded-xl">
                          <Eye className="w-4 h-4" /> View Audit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/15 text-xs uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">
                      <th className="p-4">Student</th>
                      <th className="p-4">Room & Hostel</th>
                      <th className="p-4">Out Date & Time</th>
                      <th className="p-4">Return Date & Time</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {loading ? <SkeletonTable cols={7} /> : requests.length === 0 ? (
                      <EmptyState label={`No ${statusFilter !== 'all' ? statusFilter : ''} requests found`} />
                    ) : requests.map((gp) => (
                      <tr key={gp.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold">{gp.student_name}</span>
                            <span className="text-[13px] text-muted-foreground uppercase">{gp.student_usn}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold">{gp.hostel_name}</span>
                            <span className="text-muted-foreground text-[13px]">{gp.room_number || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{formatDateString(gp.out_date)}</span>
                            <span className="text-muted-foreground text-[13px]">{formatTimeToAmPm(gp.out_time)}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{formatDateString(gp.expected_return_date)}</span>
                            <span className="text-muted-foreground text-[13px]">{formatTimeToAmPm(gp.expected_return_time)}</span>
                          </div>
                        </td>
                        <td className="p-4 min-w-[180px] max-w-[240px] truncate text-xs font-medium text-muted-foreground">{gp.reason}</td>
                        <td className="p-4 text-center whitespace-nowrap">{getStatusBadge(gp.status)}</td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {gp.status === 'pending' ? (
                            <Button size="sm" onClick={() => setSelectedRequest(gp)}
                              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg px-3 h-8 flex items-center gap-1 ml-auto">
                              <Check className="w-3.5 h-3.5" /> Review
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setSelectedRequest(gp)}
                              className="text-xs font-semibold px-2.5 h-8 flex items-center gap-1 ml-auto hover:bg-muted">
                              <Eye className="w-3.5 h-3.5" /> View Audit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {historyLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3 animate-pulse">
                      <div className="flex justify-between"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-6 w-16 bg-muted rounded-full" /></div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40"><div className="h-4 bg-muted rounded" /><div className="h-4 bg-muted rounded" /></div>
                    </div>
                  ))
                ) : historyRequests.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="bg-muted p-3 rounded-full w-fit mx-auto"><History className="w-6 h-6 text-muted-foreground/60" /></div>
                    <p className="font-semibold text-muted-foreground text-sm">No historical records found</p>
                  </div>
                ) : historyRequests.map((gp) => (
                  <div key={gp.id} className="p-4 rounded-xl border border-border/60 bg-card/50 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">{gp.student_name}</h4>
                        <span className="text-[13px] text-muted-foreground uppercase font-mono">{gp.student_usn}</span>
                      </div>
                      {getStatusBadge(gp.status)}
                    </div>
                    <div className="text-sm bg-muted/30 p-3 rounded-xl border border-border/40 flex justify-between items-center">
                      <span className="font-semibold">{gp.hostel_name}</span>
                      <span className="text-xs bg-background px-2.5 py-1 rounded-md border border-border/40 font-semibold">{gp.room_number || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-muted-foreground uppercase font-semibold block text-[11px]">Out</span>
                        <span className="font-semibold">{formatDateString(gp.out_date)}</span>
                        <span className="text-muted-foreground block">{formatTimeToAmPm(gp.out_time)}</span></div>
                      <div><span className="text-muted-foreground uppercase font-semibold block text-[11px]">Return</span>
                        <span className="font-semibold">{formatDateString(gp.expected_return_date)}</span>
                        <span className="text-muted-foreground block">{formatTimeToAmPm(gp.expected_return_time)}</span></div>
                    </div>
                    {gp.reason && (
                      <div className="pt-2 border-t border-border/40 text-xs">
                        <span className="text-muted-foreground font-semibold uppercase block mb-0.5">Reason</span>
                        <p className="text-muted-foreground">{gp.reason}</p>
                      </div>
                    )}
                    {/* Read-only — no action buttons */}
                  </div>
                ))}
              </div>

              {/* Desktop table — read-only, no Actions column */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/15 text-xs uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">
                      <th className="p-4">Student</th>
                      <th className="p-4">Room & Hostel</th>
                      <th className="p-4">Out Date & Time</th>
                      <th className="p-4">Return Date & Time</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {historyLoading ? <SkeletonTable cols={6} /> : historyRequests.length === 0 ? (
                      <EmptyState label="No historical records found" />
                    ) : historyRequests.map((gp) => (
                      <tr key={gp.id} className="hover:bg-muted/10 transition-colors opacity-90">
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold">{gp.student_name}</span>
                            <span className="text-[13px] text-muted-foreground uppercase">{gp.student_usn}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs">
                          <span className="font-semibold block">{gp.hostel_name}</span>
                          <span className="text-muted-foreground">{gp.room_number || 'N/A'}</span>
                        </td>
                        <td className="p-4 text-xs font-medium whitespace-nowrap">
                          <span className="block">{formatDateString(gp.out_date)}</span>
                          <span className="text-muted-foreground">{formatTimeToAmPm(gp.out_time)}</span>
                        </td>
                        <td className="p-4 text-xs font-medium whitespace-nowrap">
                          <span className="block">{formatDateString(gp.expected_return_date)}</span>
                          <span className="text-muted-foreground">{formatTimeToAmPm(gp.expected_return_time)}</span>
                        </td>
                        <td className="p-4 min-w-[180px] max-w-[240px] truncate text-xs font-medium text-muted-foreground">{gp.reason}</td>
                        <td className="p-4 text-center whitespace-nowrap">{getStatusBadge(gp.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>

        {/* Pagination */}
        {activeTab === 'active' && !loading && totalPages > 1 && (
          <PaginationFooter
            page={currentPage} totalPages={totalPages} totalCount={totalCount}
            loading={loading} theme={theme}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          />
        )}
        {activeTab === 'history' && !historyLoading && historyTotalPages > 1 && (
          <PaginationFooter
            page={historyPage} totalPages={historyTotalPages} totalCount={historyTotalCount}
            loading={historyLoading} theme={theme}
            onPrev={() => setHistoryPage(p => Math.max(1, p - 1))}
            onNext={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
          />
        )}
      </Card>

      {/* Review / Audit Dialog (active tab only) */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="w-[90%] h-[80vh] sm:h-auto sm:max-w-md rounded-xl sm:rounded-2xl p-0 max-h-[85vh] overflow-y-auto custom-scrollbar bg-background">
          <DialogHeader className="p-6 border-b shrink-0 bg-muted/10">
            <DialogTitle className="text-lg font-semibold">
              {selectedRequest?.status === 'pending' ? 'Review Gate Pass Request' : 'Gate Pass Request Audit'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Details submitted by {selectedRequest?.student_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-muted/5 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Student</span>
                <span className="font-semibold block">{selectedRequest?.student_name}</span>
                <span className="text-[13px] text-muted-foreground">{selectedRequest?.student_usn}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Hostel & Room</span>
                <span className="font-semibold block">{selectedRequest?.hostel_name}</span>
                <span className="text-[13px] text-muted-foreground">{selectedRequest?.room_number || 'N/A'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-muted/5 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Out Time</span>
                <span className="font-semibold block">{selectedRequest ? formatDateString(selectedRequest.out_date) : ''}</span>
                <span className="text-[13px] text-muted-foreground">{selectedRequest && formatTimeToAmPm(selectedRequest.out_time)}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Expected Return</span>
                <span className="font-semibold block">{selectedRequest ? formatDateString(selectedRequest.expected_return_date) : ''}</span>
                <span className="text-[13px] text-muted-foreground">{selectedRequest && formatTimeToAmPm(selectedRequest.expected_return_time)}</span>
              </div>
            </div>

            <div className="border p-4 rounded-xl bg-muted/5 text-xs sm:text-sm">
              <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Reason for Outing</span>
              <p className="text-muted-foreground leading-relaxed font-medium mt-1 whitespace-pre-wrap">{selectedRequest?.reason}</p>
            </div>

            {selectedRequest?.status !== 'pending' ? (
              <div className={`border p-4 rounded-xl text-xs sm:text-sm space-y-3 ${
                selectedRequest?.status === 'approved' ? 'bg-green-500/5 border-green-200' : 'bg-red-500/5 border-red-200'
              }`}>
                <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Status:</span>{getStatusBadge(selectedRequest?.status || 'pending')}</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Action Date:</span>
                  <span className="font-semibold text-foreground/80">{selectedRequest?.actioned_at ? new Date(selectedRequest.actioned_at).toLocaleString() : 'N/A'}</span>
                </div>
                {selectedRequest?.action_note && (
                  <div>
                    <strong className="block text-[13px] uppercase tracking-wider text-muted-foreground mb-1">Warden Remark</strong>
                    <p className="text-muted-foreground font-semibold leading-relaxed">{selectedRequest.action_note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest block">Action Note (Optional)</label>
                <textarea
                  placeholder="Provide approval or rejection note for the student..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-3 rounded-lg border border-border bg-background resize-none focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none font-medium"
                />
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-0 flex gap-2">
            {selectedRequest?.status === 'pending' ? (
              <>
                <Button onClick={() => handleAction('reject')} disabled={actionLoading} variant="outline"
                  className={`flex-1 text-xs font-semibold h-10 ${theme === 'dark' ? 'text-red-400 border-red-400 hover:bg-red-900/20 bg-transparent' : 'text-red-700 border-red-600 hover:bg-red-100 bg-transparent'}`}>
                  {actionLoading ? 'Processing...' : <span className="flex items-center justify-center gap-1.5"><XCircle size={16} /> Reject</span>}
                </Button>
                <Button onClick={() => handleAction('approve')} disabled={actionLoading} variant="outline"
                  className={`flex-1 text-xs font-semibold h-10 ${theme === 'dark' ? 'text-green-400 border-green-400 hover:bg-green-900/20 bg-transparent' : 'text-green-700 border-green-600 hover:bg-green-100 bg-transparent'}`}>
                  {actionLoading ? 'Processing...' : <span className="flex items-center justify-center gap-1.5"><CheckCircle2 size={16} /> Approve</span>}
                </Button>
              </>
            ) : (
              <Button onClick={() => setSelectedRequest(null)} className="w-full text-xs font-semibold h-10 bg-primary hover:bg-primary/90 text-white">Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardenGatePassManagement;
