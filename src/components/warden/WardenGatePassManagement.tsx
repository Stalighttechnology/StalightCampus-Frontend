import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Search,
  Filter,
  Eye,
  User,
  Home,
  Check,
  X,
  Loader2,
  Download
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
import { getMyGatePasses, actionGatePass, exportGatePassesPdf } from '../../utils/hms_api';

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

const WardenGatePassManagement = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [requests, setRequests] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Dialog / Action
  const [selectedRequest, setSelectedRequest] = useState<GatePass | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  
  // Filter Popover
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      toast({
        title: 'Export Successful',
        description: 'Gate pass report PDF downloaded successfully.'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF report.',
        variant: 'destructive'
      });
    } finally {
      setExportingPdf(false);
    }
  };
  
  useEffect(() => {
    fetchRequests();
  }, [statusFilter, currentPage]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let url = `${API_ENDPOINT}/hms/student/gate-pass/?page=${currentPage}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      
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
            rejected: data.stats.rejected || 0
          });
          setStatsLoading(false);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load gate pass requests.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const res = await actionGatePass(selectedRequest.id, action, actionNote);
      if (res.success) {
        toast({
          title: 'Success',
          description: `Gate pass request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
        });
        setSelectedRequest(null);
        setActionNote('');
        fetchRequests();
        fetchStats();
      } else {
        toast({
          title: 'Error',
          description: res.message || 'Action failed.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Connection error while processing request.',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeToAmPm = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      let h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return `${h}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/15 capitalize">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/15 capitalize">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200 hover:bg-yellow-500/15 capitalize">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div id="warden-gatepass-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Requests"
          value={statsLoading ? <div className="h-6 w-12 bg-muted animate-pulse rounded" /> : stats.total}
          description="All time requests"
          icon={<FileText className="w-5 h-5 text-purple-500" />} />
        
        <DashboardCard
          title="Pending Approval"
          value={statsLoading ? <div className="h-6 w-12 bg-muted animate-pulse rounded" /> : stats.pending}
          description="Awaiting your review"
          icon={<Clock className="w-5 h-5 text-amber-500" />} />
        
        <DashboardCard
          title="Approved"
          value={statsLoading ? <div className="h-6 w-12 bg-muted animate-pulse rounded" /> : stats.approved}
          description="Granted permission"
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} />
        
        <DashboardCard
          title="Rejected"
          value={statsLoading ? <div className="h-6 w-12 bg-muted animate-pulse rounded" /> : stats.rejected}
          description="Declined requests"
          icon={<XCircle className="w-5 h-5 text-red-500" />} />
      </div>

      {/* Main Table Card */}
      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Gate Pass Requests</CardTitle>
              <CardDescription>Review and action leaves and off-campus gate pass requests.</CardDescription>
            </div>
            
            {/* Filter Popover Button + Mobile Icon + Desktop Export PDF Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="relative flex-1 sm:flex-none" ref={filterRef}>
                <Button
                  size="sm"
                  onClick={() => setShowFilter(!showFilter)}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white flex items-center justify-center h-9 px-3.5 rounded-xl shadow-sm font-semibold text-xs gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </Button>
                {showFilter && (
                  <div className={`absolute right-0 mt-2 w-44 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-xl shadow-xl z-50 p-1`}>
                    {[
                      { label: 'Pending', value: 'pending' },
                      { label: 'Approved', value: 'approved' },
                      { label: 'Rejected', value: 'rejected' },
                      { label: 'All Status', value: 'all' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        className={`block w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                          statusFilter === item.value
                            ? theme === 'dark' ? 'bg-primary/20 text-primary font-semibold' : 'bg-primary/10 text-primary font-semibold'
                            : theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setStatusFilter(item.value);
                          setCurrentPage(1);
                          setShowFilter(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Export PDF Icon Button */}
              <Button
                onClick={handleExportPDF}
                variant="outline"
                size="icon"
                className="flex sm:hidden h-9 w-9 rounded-xl dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 bg-white text-zinc-900 border border-zinc-200 shrink-0"
                disabled={exportingPdf}
              >
                {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>

              {/* Desktop Export PDF Button */}
              <Button
                onClick={handleExportPDF}
                size="sm"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold rounded-xl h-9 px-3 bg-primary hover:bg-primary/90 text-white shadow-sm shrink-0"
                disabled={exportingPdf}
              >
                {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Mobile View: Stacked Cards */}
          <div className="md:hidden space-y-3 p-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3 animate-pulse">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5 w-1/2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted/60 rounded w-1/2" />
                    </div>
                    <div className="h-6 w-16 bg-muted rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="space-y-1">
                      <div className="h-3 w-16 bg-muted rounded" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-9 bg-muted rounded-xl w-full pt-2" />
                </div>
              ))
            ) : requests.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="bg-muted p-3 rounded-full w-fit mx-auto">
                  <FileText className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="font-bold text-muted-foreground text-sm capitalize">No {statusFilter !== 'all' ? statusFilter : ''} requests found</p>
              </div>
            ) : (
              requests.map((gp) => (
                <div key={gp.id} className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3 shadow-sm hover:border-primary/40 transition-all">
                  {/* Top Row: Student & Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{gp.student_name}</h4>
                      <span className="text-[13px] text-muted-foreground uppercase tracking-wider font-mono">{gp.student_usn}</span>
                    </div>
                    <div>{getStatusBadge(gp.status)}</div>
                  </div>

                  {/* Hostel & Room */}
                  <div className="text-sm bg-muted/30 p-3 rounded-xl border border-border/40 flex justify-between items-center">
                    <span className="font-semibold text-foreground/90">{gp.hostel_name}</span>
                    <span className="text-foreground font-semibold text-xs bg-background px-2.5 py-1 rounded-md border border-border/40">Room: {gp.room_number || 'N/A'}</span>
                  </div>

                  {/* Grid: Timings */}
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold block">Out Time</span>
                      <span className="font-semibold text-sm text-foreground block">{gp.out_date}</span>
                      <span className="text-muted-foreground text-xs block">{formatTimeToAmPm(gp.out_time)}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold block">Return Time</span>
                      <span className="font-semibold text-sm text-foreground block">{gp.expected_return_date}</span>
                      <span className="text-muted-foreground text-xs block">{formatTimeToAmPm(gp.expected_return_time)}</span>
                    </div>
                  </div>

                  {/* Reason */}
                  {gp.reason && (
                    <div className="pt-2 border-t border-border/40 text-xs">
                      <span className="text-[13px] uppercase tracking-wider text-muted-foreground font-semibold block mb-0.5">Reason</span>
                      <p className="text-muted-foreground font-medium text-xs leading-relaxed">{gp.reason}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2">
                    {gp.status === 'pending' ? (
                      <Button
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl h-9 flex items-center justify-center gap-1.5 shadow-sm"
                        onClick={() => setSelectedRequest(gp)}
                      >
                        <Check className="w-4 h-4" />
                        Review Request
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs font-semibold h-9 flex items-center justify-center gap-1.5 rounded-xl hover:bg-muted border-border"
                        onClick={() => setSelectedRequest(gp)}
                      >
                        <Eye className="w-4 h-4" />
                        View Audit
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/15 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
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
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="h-4 w-28 bg-muted rounded" />
                          <div className="h-3 w-16 bg-muted/60 rounded" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-3 w-14 bg-muted/60 rounded" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="h-3 w-14 bg-muted/60 rounded" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="h-3 w-14 bg-muted/60 rounded" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-32 bg-muted rounded" />
                      </td>
                      <td className="p-4 text-center">
                        <div className="h-6 w-16 bg-muted rounded-full mx-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <div className="h-8 w-20 bg-muted rounded-lg ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="bg-muted p-4 rounded-full">
                          <FileText className="w-8 h-8 text-muted-foreground/60" />
                        </div>
                        <p className="font-bold text-muted-foreground text-lg capitalize">No {statusFilter !== 'all' ? statusFilter : ''} requests found</p>
                        <p className="text-xs text-muted-foreground max-w-xs">There are no gate pass requests currently under this status category.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  requests.map((gp) => (
                    <tr key={gp.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{gp.student_name}</span>
                          <span className="text-[13px] text-muted-foreground uppercase">{gp.student_usn}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold">{gp.hostel_name}</span>
                          <span className="text-muted-foreground text-[13px]">Room: {gp.room_number || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium">
                        <div className="flex flex-col">
                          <span>{gp.out_date}</span>
                          <span className="text-muted-foreground text-[13px]">{formatTimeToAmPm(gp.out_time)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium">
                        <div className="flex flex-col">
                          <span>{gp.expected_return_date}</span>
                          <span className="text-muted-foreground text-[13px]">{formatTimeToAmPm(gp.expected_return_time)}</span>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs truncate text-xs font-medium text-muted-foreground">
                        {gp.reason}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(gp.status)}
                      </td>
                      <td className="p-4 text-right">
                        {gp.status === 'pending' ? (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-lg px-3 h-8 flex items-center gap-1 ml-auto"
                            onClick={() => setSelectedRequest(gp)}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Review
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs font-semibold px-2.5 h-8 flex items-center gap-1 ml-auto hover:bg-muted"
                            onClick={() => setSelectedRequest(gp)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Audit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
        </CardContent>

        {!loading && totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {currentPage}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Review Request Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="w-[90%] sm:max-w-md rounded-xl sm:rounded-2xl p-0 overflow-hidden bg-background">
          <DialogHeader className="p-6 border-b shrink-0 bg-muted/10">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              {selectedRequest?.status === 'pending' ? 'Review Gate Pass Request' : 'Gate Pass Request Audit'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review details submitted by {selectedRequest?.student_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            {/* Student details */}
            <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-muted/5 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Student</span>
                <span className="font-semibold">{selectedRequest?.student_name}</span>
                <span className="text-[13px] text-muted-foreground block">{selectedRequest?.student_usn}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Hostel & Room</span>
                <span className="font-semibold">{selectedRequest?.hostel_name}</span>
                <span className="text-[13px] text-muted-foreground block">Room: {selectedRequest?.room_number || 'N/A'}</span>
              </div>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-muted/5 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Out Time</span>
                <span className="font-semibold">{selectedRequest?.out_date}</span>
                <span className="text-[13px] text-muted-foreground block">{selectedRequest && formatTimeToAmPm(selectedRequest.out_time)}</span>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Expected Return</span>
                <span className="font-semibold">{selectedRequest?.expected_return_date}</span>
                <span className="text-[13px] text-muted-foreground block">{selectedRequest && formatTimeToAmPm(selectedRequest.expected_return_time)}</span>
              </div>
            </div>

            {/* Reason */}
            <div className="border p-4 rounded-xl bg-muted/5 text-xs sm:text-sm">
              <span className="text-muted-foreground uppercase text-[13px] tracking-wider block font-semibold mb-0.5">Reason for Outing</span>
              <p className="text-muted-foreground leading-relaxed font-medium mt-1 whitespace-pre-wrap">{selectedRequest?.reason}</p>
            </div>

            {/* Audit / Action Note */}
            {selectedRequest?.status !== 'pending' ? (
              <div className={`border p-4 rounded-xl text-xs sm:text-sm space-y-3 ${
                selectedRequest?.status === 'approved' ? 'bg-green-500/5 border-green-200' : 'bg-red-500/5 border-red-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Current Status:</span>
                  {getStatusBadge(selectedRequest?.status || 'pending')}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Action Date:</span>
                  <span className="font-semibold text-foreground/80">
                    {selectedRequest?.actioned_at ? new Date(selectedRequest.actioned_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                {selectedRequest?.action_note && (
                  <div>
                    <strong className="block text-[13px] uppercase tracking-wider text-muted-foreground mb-1">Warden Remark/Note</strong>
                    <p className="text-muted-foreground font-semibold leading-relaxed mt-0.5">{selectedRequest.action_note}</p>
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
                <Button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  variant="outline"
                  className={`flex-1 text-xs font-semibold h-10 border-red-200 bg-red-50 hover:bg-red-100 text-red-700`}
                >
                  {actionLoading ? 'Processing...' : 'Reject'}
                </Button>
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="flex-1 text-xs font-semibold h-10 bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading ? 'Processing...' : 'Approve'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setSelectedRequest(null)}
                className="w-full text-xs font-semibold h-10 bg-primary hover:bg-primary/90 text-white"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardenGatePassManagement;
