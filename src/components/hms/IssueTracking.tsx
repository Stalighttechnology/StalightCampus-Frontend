import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Filter,
  MessageSquare,
  User,
  Home,
  Calendar,
  MoreVertical,
  History,
  CheckCircle,
  AlertTriangle,
  Download
} from
  'lucide-react';
import { useHMSContext } from '../../context/HMSContext';
import { useToast } from '../../hooks/use-toast';
import {
  getHostelIssues,
  updateIssueStatus,
  getIssueDetail,
  exportHostelIssuesPdf,
  exportSingleIssuePdf,
  getIssueStats
} from
  '../../utils/hms_api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard, SkeletonPageHeader } from '../ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DashboardCard from '../common/DashboardCard';

interface Issue {
  id: number;
  student_name: string;
  enrollment_no: string;
  hostel_name: string;
  room_name: string;
  title: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  update_count: number;
}

interface DetailedIssue extends Issue {
  description: string;
  resolved_at?: string;
  updates: any[];
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    order: 0,
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50 hover:bg-yellow-500/10',
    icon: AlertTriangle
  },
  in_progress: {
    label: 'In Progress',
    order: 1,
    color: 'bg-blue-500/10 text-blue-600 border-blue-200/50 hover:bg-blue-500/10',
    icon: Clock
  },
  waiting_for_workers: {
    label: 'Waiting for Workers',
    order: 2,
    color: 'bg-orange-500/10 text-orange-600 border-orange-200/50 hover:bg-orange-500/10',
    icon: Loader2
  },
  completed: {
    label: 'Completed',
    order: 3,
    color: 'bg-green-500/10 text-green-600 border-green-200/50 hover:bg-green-500/10',
    icon: CheckCircle2
  }
};

const IssueTracking = ({ hostelId }: { hostelId: number | null; }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hostels, skeletonMode } = useHMSContext();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    in_progress: number;
    waiting_for_workers: number;
    completed: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedHostelId, setSelectedHostelId] = useState<string>(hostelId?.toString() || '');
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<DetailedIssue | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingIssueId, setUpdatingIssueId] = useState<number | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await getIssueStats(selectedHostelId ? Number(selectedHostelId) : undefined);
      if (response.success && response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedHostelId) return;
    setExporting(true);
    try {
      const blob = await exportHostelIssuesPdf(Number(selectedHostelId), statusFilter !== 'all' ? statusFilter : undefined);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const hostelName = hostels.find(h => h.id.toString() === selectedHostelId)?.name || 'Hostel';
      link.setAttribute('download', `Hostel_Issues_${hostelName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'PDF report downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export PDF report',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const [exportingSingle, setExportingSingle] = useState(false);

  const handleExportSingleIssuePDF = async () => {
    if (!selectedIssue) return;
    setExportingSingle(true);
    try {
      const blob = await exportSingleIssuePdf(selectedIssue.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Issue_${selectedIssue.id}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Issue report PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export issue PDF',
        variant: 'destructive'
      });
    } finally {
      setExportingSingle(false);
    }
  };

  // Sync selectedHostelId when hostelId prop changes or becomes invalid
  useEffect(() => {
    if (hostelId) {
      const isValid = hostels.some(h => h.id === hostelId);
      if (isValid) {
        setSelectedHostelId(hostelId.toString());
      } else {
        setSelectedHostelId('');
      }
    } else {
      setSelectedHostelId('');
    }
  }, [hostelId, hostels]);
  useEffect(() => {
    fetchStats();
  }, [selectedHostelId]);

  useEffect(() => {
    if (selectedHostelId) {
      fetchIssues();
    } else {
      setIssues([]);
      setTotalCount(0);
      setTotalPages(1);
    }
  }, [selectedHostelId, statusFilter, currentPage]);



  const fetchIssues = async () => {
    if (!selectedHostelId) return;
    setLoading(true);
    setPermissionError(null);
    try {
      const response = await getHostelIssues(Number(selectedHostelId), statusFilter !== 'all' ? statusFilter : undefined, currentPage);

      if (!response.success && (response.message?.includes('You do not have permission') || response.message?.includes('Only wardens'))) {
        setPermissionError(response.message || 'Access Denied. Only wardens and admins can access this page.');
        setIssues([]);
      } else if (response.success) {
        if (response.results) {
          setIssues(response.results);
          const count = response.count || response.results.length;
          setTotalCount(count);
          setTotalPages(Math.max(1, Math.ceil(count / 10)));
        } else if (Array.isArray(response.data)) {
          setIssues(response.data);
          setTotalCount(response.data.length);
          setTotalPages(1);
        }
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load issues',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Connection error while loading issues',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueClick = async (issue: Issue) => {
    try {
      const response = await getIssueDetail(issue.id);
      if (response.success && response.data) {
        setSelectedIssue(response.data);
        // Open details modal on mobile
        if (window.innerWidth < 1024) {
          setIsDetailsModalOpen(true);
        }
      }
    } catch (error) {

    }
  };

  const handleStatusChange = async (issueId: number, newStatus: string, note: string) => {
    setUpdatingIssueId(issueId);
    try {
      const response = await updateIssueStatus(issueId, {
        status: newStatus,
        note: note || undefined
      });

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Issue status updated'
        });
        
        fetchStats();

        setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, status: newStatus, status_display: STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus, updated_at: new Date().toISOString(), update_count: (i.update_count || 0) + 1 } : i));

        if (selectedIssue?.id === issueId) {
          setSelectedIssue({
            ...selectedIssue,
            status: newStatus,
            status_display: STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus,
            updated_at: new Date().toISOString(),
            update_count: (selectedIssue.update_count || 0) + 1,
            updates: response.data.updates || selectedIssue.updates || []
          });
        }
      } else {
        toast({ title: 'Error', description: response.message || 'Update failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update issue', variant: 'destructive' });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center px-4">
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">{permissionError}</p>
      </div>);

  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div id="hms-issues-stats-grid" className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Issues"
          value={statsLoading || skeletonMode ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : stats?.total ?? 0}
          description="Total raised this month"
          icon={<MessageSquare className="w-5 h-5" />} />
        
        <DashboardCard
          title="Pending"
          value={statsLoading || skeletonMode ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : stats?.pending ?? 0}
          description="Awaiting warden review"
          icon={<AlertTriangle className="w-5 h-5" />} />
        
        <DashboardCard
          title="In Progress"
          value={statsLoading || skeletonMode ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : (stats?.in_progress ?? 0) + (stats?.waiting_for_workers ?? 0)}
          description="Being handled"
          icon={<Clock className="w-5 h-5" />} />
        
        <DashboardCard
          title="Resolved"
          value={statsLoading || skeletonMode ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : stats?.completed ?? 0}
          description="Marked as completed"
          icon={<CheckCircle className="w-5 h-5" />} />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Issues List */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-primary/10 shadow-sm overflow-hidden">
            <CardHeader id="hms-issues-card" className="pb-4 border-b bg-muted/30">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-start w-full">
                  <div className="space-y-1">
                    <CardTitle>Issue Tracking</CardTitle>
                    <CardDescription>Manage student complaints and maintenance requests.</CardDescription>
                  </div>
                  {selectedHostelId && totalCount > 0 && (
                    <>
                      {/* Desktop Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="hidden sm:flex items-center gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90 text-white border-primary transition-all px-3 whitespace-nowrap"
                      >
                        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Export PDF
                      </Button>
                      
                      {/* Mobile Download PDF Icon Button */}
                      <Button
                        onClick={handleExportPDF}
                        disabled={exporting}
                        size="icon"
                        variant="outline"
                        className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                      >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </Button>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <p className="text-[18px] sm:text-[14px] uppercase font-semibold text-muted-foreground px-1 mb-2 block">Hostel</p>
                    {loading || skeletonMode ?
                      <div className="h-10 w-full rounded-md bg-muted animate-pulse border" /> :

                      <Select value={selectedHostelId} onValueChange={setSelectedHostelId}>
                        <SelectTrigger className="bg-background border-primary/10 hover:border-primary/30 transition-colors h-10 max-w-full overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            <Home className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span className="truncate text-sm text-left block w-full">
                              {selectedHostelId 
                                ? (hostels.find(h => h.id.toString() === selectedHostelId)?.name || 'Select Hostel').replace(/\s*\(.*?\)\s*/g, '')
                                : 'Select Hostel'}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {hostels.length > 0 ? (
                            hostels.map((h) => <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>)
                          ) : (
                            <div className="p-3 text-center space-y-2" onPointerDown={(e) => e.stopPropagation()}>
                              <p className="text-xs text-muted-foreground">No hostels found</p>
                              <Button
                                type="button"
                                size="sm"
                                className="w-full text-[11px] font-semibold h-8 bg-primary hover:bg-primary/90 text-white"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate('/hms/hostels', { state: { openAddHostel: true } });
                                }}
                              >
                                Add Hostel
                              </Button>
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    }
                  </div>

                  <div className="space-y-1">
                    <p className="text-[18px] sm:text-[14px] uppercase font-semibold text-muted-foreground px-1 mb-2 block">Filter Status</p>
                    {loading || skeletonMode ?
                      <div className="h-10 w-full rounded-md bg-muted animate-pulse border" /> :

                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-background border-primary/10 hover:border-primary/30 transition-colors h-10">
                          <div className="flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-primary/70" />
                            <SelectValue placeholder="All Status" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    }
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-auto max-h-[calc(100vh-12rem)] sm:h-[calc(100vh-23.5rem)] min-h-[50px] overflow-y-auto custom-scrollbar">
                {(loading || skeletonMode) && issues.length === 0 ?
                  <div className="divide-y">
                    {[1, 2, 3, 4].map((i) =>
                      <div key={i} className="p-4 space-y-4 animate-pulse">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-8 bg-muted rounded" />
                            <div className="h-5 w-40 bg-muted rounded" />
                          </div>
                          <div className="h-6 w-20 bg-muted rounded-full" />
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="space-y-3">
                            <div className="h-3 w-4 bg-muted rounded" />
                            <div className="h-3 w-32 bg-muted rounded" />
                          </div>
                          <div className="space-y-3 text-right">
                            <div className="h-3 w-24 bg-muted rounded ml-auto" />
                            <div className="h-3 w-16 bg-muted rounded ml-auto" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div> :
                  issues.length === 0 ?
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                      <CheckCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <p className="font-semibold text-muted-foreground">All clear!</p>
                      <p className="text-sm text-muted-foreground">No issues found with this filter.</p>
                    </div> :

                    <div className="divide-y-0 sm:divide-y p-3 sm:p-0 space-y-3 sm:space-y-0">
                      {issues.map((issue) => {
                        const config = STATUS_CONFIG[issue.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                        const Icon = config.icon;
                        const isSelected = selectedIssue?.id === issue.id;

                        return (
                          <div
                            key={issue.id}
                            onClick={() => handleIssueClick(issue)}
                            className={cn(
                              "p-4 transition-all cursor-pointer relative hover:bg-muted/50",
                              // Mobile card style
                              "border rounded-xl shadow-sm bg-card sm:border-0 sm:rounded-none sm:shadow-none sm:bg-transparent",
                              isSelected ? "bg-primary/5 ring-1 ring-primary/20 ring-inset" : ""
                            )}>

                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 " />}
                            <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">#{issue.id}</span>
                                <h4 className="font-semibold text-sm sm:text-base truncate">{issue.title}</h4>
                              </div>
                              <Badge variant="outline" className={`text-[10px] sm:text-xs h-5 whitespace-nowrap flex-shrink-0 ${config.color}`}>
                                {issue.status_display}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-2 text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1 min-w-0">
                                <User className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{issue.student_name}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Home className="w-3 h-3 mt-0.5" /> Room {issue.room_name}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[10px] sm:text-xs">
                              <span className="flex items-center gap-1 text-muted-foreground/70">
                                <Calendar className="w-3.5 h-3.5" /> {formatDate(issue.created_at)}
                              </span>
                              {issue.update_count > 0 &&
                                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] sm:text-xs font-normal">
                                  {issue.update_count} updates
                                </Badge>
                              }
                            </div>

                            {/* Mobile View Details Button */}
                            <div className="mt-3 pt-3 border-t border-border/50 flex sm:hidden">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-9 text-xs font-semibold text-primary hover:text-primary/95 bg-primary/5 hover:bg-primary/10 border-primary/10 rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIssueClick(issue);
                                  setIsDetailsModalOpen(true);
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>);

                      })}
                    </div>
                }
              </div>
            </CardContent>
            {totalPages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  Showing {totalCount === 0 ? 0 : Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} issues
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className="text-sm font-semibold">{currentPage}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || loading}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Issue Details */}
        <div className="lg:col-span-7" ref={detailsRef}>
          <AnimatePresence mode="wait">
            {selectedIssue ?
              <motion.div
                key={selectedIssue.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                <Card className="border-primary/10 shadow-md h-[calc(100vh-23.5rem)] min-h-[500px] flex flex-col overflow-hidden">
                  <CardHeader className="pb-4 border-b bg-muted/10 shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <CardTitle className="text-2xl sm:text-xl font-semibold">{selectedIssue.title}</CardTitle>
                        <Badge className={`${STATUS_CONFIG[selectedIssue.status as keyof typeof STATUS_CONFIG]?.color} px-3 py-1`}>
                          {selectedIssue.status_display}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border/40">
                          ID: #{selectedIssue.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm">
                              <History className="w-4 h-4 text-primary" />
                              <span className="text-xs font-semibold">Resolution Timeline</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[90vw] sm:max-w-[500px] max-h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl border-primary/10 custom-scrollbar rounded-xl">
                            <DialogHeader className="p-6 border-b bg-muted/30 shrink-0">
                              <DialogTitle className="flex items-center gap-2">
                                <History className="w-5 h-5 text-primary" />
                                Resolution Timeline
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="flex-1 p-6">
                              {selectedIssue.updates && selectedIssue.updates.length > 0 ?
                                <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                                  {selectedIssue.updates.map((update: any, idx: number) =>
                                    <div key={idx} className="relative pl-8">
                                      <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                      </div>
                                      <div className="p-3 rounded-lg bg-muted/30 border border-muted/50">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                                          <p className="text-sm font-semibold leading-tight">
                                            {update.old_status_display} → {update.new_status_display}
                                          </p>
                                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{formatDate(update.created_at)}</span>
                                        </div>
                                        {update.note && <p className="text-xs text-muted-foreground mt-1 bg-background/50 p-2 rounded">{update.note}</p>}
                                        <p className="text-[10px] mt-2 text-primary/70 flex items-center gap-1 font-medium">
                                          <User className="w-3 h-3" /> {update.updated_by_name || 'System'}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div> :

                                <div className="py-20 text-center opacity-50">
                                  <History className="w-12 h-12 mx-auto mb-4" />
                                  <p className="text-sm">No history available for this issue.</p>
                                </div>
                              }
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportSingleIssuePDF}
                          disabled={exportingSingle}
                          className="h-8 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm bg-primary hover:bg-primary/90 text-white border-primary"
                        >
                          {exportingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-4 h-4" />}
                          <span className="text-xs font-semibold">Export PDF</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <ScrollArea className="flex-1">
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-muted-foreground/10">
                        <div>
                          <p className="text-[14px] uppercase font-semibold text-muted-foreground tracking-wider mb-1 block">Student</p>
                          <p className="text-base font-semibold">{selectedIssue.student_name}</p>
                          <p className="text-sm text-muted-foreground">{selectedIssue.enrollment_no}</p>
                        </div>
                        <div>
                          <p className="text-[14px] uppercase font-semibold text-muted-foreground tracking-wider mb-1 block">Location</p>
                          <p className="text-base font-semibold">Room {selectedIssue.room_name}</p>
                          <p className="text-sm text-muted-foreground">{selectedIssue.hostel_name}</p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-[14px] uppercase font-semibold text-muted-foreground tracking-wider mb-1 block">Date Raised</p>
                          <p className="text-base font-semibold">{formatDate(selectedIssue.created_at)}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-base font-semibold flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-primary" /> Description
                        </h4>
                        <p className="text-base text-muted-foreground leading-relaxed bg-background p-4 rounded-lg border border-dashed">
                          {selectedIssue.description}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/80">Update Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(STATUS_CONFIG).map((status) => {
                            const currentOrder = STATUS_CONFIG[selectedIssue.status as keyof typeof STATUS_CONFIG]?.order ?? 0;
                            const targetOrder = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.order ?? 0;
                            const isCurrent = selectedIssue.status === status;
                            const isPast = targetOrder < currentOrder;

                            return (
                              <Button
                                key={status}
                                size="sm"
                                variant={isCurrent ? "default" : "outline"}
                                onClick={() => handleStatusChange(selectedIssue.id, status, '')}
                                disabled={updatingIssueId === selectedIssue.id || isPast || isCurrent}
                                className={`h-10 px-4 text-sm font-semibold transition-all ${isCurrent ?
                                  "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-105" :
                                  isPast ?
                                    "opacity-50 grayscale-[0.5] cursor-not-allowed bg-muted/20" :
                                    "hover:border-primary/60 opacity-100"}`
                                }>

                                {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}
                              </Button>);

                          })}
                        </div>
                      </div>
                    </CardContent>
                  </ScrollArea>
                </Card>
              </motion.div> :

              <div className="hidden lg:flex flex-col items-center justify-center h-[calc(100vh-23.5rem)] min-h-[500px] border-2 border-dashed rounded-3xl bg-muted/5 opacity-50">
                <div className="bg-muted/50 p-8 rounded-full mb-6 ring-8 ring-muted/20">
                  <ChevronRight className="w-12 h-12 text-muted-foreground animate-pulse" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-foreground/80">Select an issue to resolve</h3>
                <p className="text-muted-foreground mt-2 text-sm max-w-[200px] text-center">Choose an issue from the list on the left to manage it.</p>
              </div>
            }
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Details Dialog */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="w-[90%] max-w-[90vw] h-[80vh] sm:hidden rounded-xl overflow-y-auto custom-scrollbar p-0">
          {selectedIssue && (
            <div className="flex flex-col h-full bg-background">
              {/* Header with Title and Status */}
              <div className="p-4 border-b bg-muted/10 shrink-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <DialogTitle className="text-lg font-semibold text-foreground leading-snug">{selectedIssue.title}</DialogTitle>
                  <Badge className={cn(
                    STATUS_CONFIG[selectedIssue.status as keyof typeof STATUS_CONFIG]?.color || '',
                    "text-[10px] py-0.5"
                  )}>
                    {selectedIssue.status_display}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                    ID: #{selectedIssue.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Resolution Timeline Button (inside mobile modal) */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-primary/20 hover:bg-primary/5 hover:text-primary">
                        <History className="w-3.5 h-3.5 text-primary" />
                        <span>Timeline</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[90%] max-w-[90vw] h-[70vh] rounded-xl overflow-y-auto custom-scrollbar p-0">
                      <DialogHeader className="p-4 border-b bg-muted/30">
                        <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                          <History className="w-4 h-4 text-primary" />
                          Resolution Timeline
                        </DialogTitle>
                      </DialogHeader>
                      <div className="p-4 space-y-4">
                        {selectedIssue.updates && selectedIssue.updates.length > 0 ? (
                          <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                            {selectedIssue.updates.map((update: any, idx: number) => (
                              <div key={idx} className="relative pl-6">
                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border bg-muted flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                </div>
                                <div className="p-2.5 rounded bg-muted/30 border border-muted/50 text-xs">
                                  <div className="flex justify-between gap-1 mb-1 font-semibold">
                                    <span>{update.old_status_display} → {update.new_status_display}</span>
                                    <span className="text-[9px] font-mono text-muted-foreground">{formatDate(update.created_at)}</span>
                                  </div>
                                  {update.note && <p className="text-muted-foreground bg-background/50 p-1.5 rounded mt-1">{update.note}</p>}
                                  <p className="text-[9px] mt-1.5 text-primary/70 flex items-center gap-1 font-medium">
                                    <User className="w-2.5 h-2.5" /> {update.updated_by_name || 'System'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-xs text-muted-foreground py-10">No history available</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Export PDF Button (inside mobile modal) */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportSingleIssuePDF}
                    disabled={exportingSingle}
                    className="h-8 gap-1.5 text-xs bg-primary text-white border-primary hover:bg-primary/90 hover:text-white"
                  >
                    {exportingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Export PDF</span>
                  </Button>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 p-4 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-muted-foreground/10 text-xs">
                  <div>
                    <span className="text-muted-foreground uppercase font-semibold block mb-0.5 tracking-wider">Student</span>
                    <p className="font-semibold text-sm">{selectedIssue.student_name}</p>
                    <p className="text-muted-foreground">{selectedIssue.enrollment_no}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground uppercase font-semibold block mb-0.5 tracking-wider">Location</span>
                    <p className="font-semibold text-sm">Room {selectedIssue.room_name}</p>
                    <p className="text-muted-foreground truncate">{selectedIssue.hostel_name}</p>
                  </div>
                  <div className="col-span-2 border-t pt-2 border-border/40">
                    <span className="text-muted-foreground uppercase font-semibold block mb-0.5 tracking-wider">Date Raised</span>
                    <p className="font-semibold text-sm">{formatDate(selectedIssue.created_at)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" /> Description
                  </h4>
                  <p className="text-sm text-muted-foreground bg-background p-4 rounded-lg border border-dashed leading-relaxed whitespace-pre-wrap">
                    {selectedIssue.description}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3 pb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/85">Update Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(STATUS_CONFIG).map((status) => {
                      const currentOrder = STATUS_CONFIG[selectedIssue.status as keyof typeof STATUS_CONFIG]?.order ?? 0;
                      const targetOrder = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.order ?? 0;
                      const isCurrent = selectedIssue.status === status;
                      const isPast = targetOrder < currentOrder;

                      return (
                        <Button
                          key={status}
                          size="sm"
                          variant={isCurrent ? "default" : "outline"}
                          onClick={() => handleStatusChange(selectedIssue.id, status, '')}
                          disabled={updatingIssueId === selectedIssue.id || isPast || isCurrent}
                          className={`h-9 px-3 text-xs font-semibold transition-all ${isCurrent ?
                            "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-105" :
                            isPast ?
                              "opacity-50 cursor-not-allowed bg-muted/20" :
                              "hover:border-primary/60 opacity-100"}`
                          }>
                          {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="p-3 border-t bg-muted/10 shrink-0 text-right">
                <Button size="sm" variant="ghost" onClick={() => setIsDetailsModalOpen(false)} className="font-semibold">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>);

};

export default IssueTracking;