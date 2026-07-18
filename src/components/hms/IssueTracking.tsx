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
import { useTheme } from '../../context/ThemeContext';
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
  const { hostels, fetchHostelsOnly, skeletonMode } = useHMSContext();
  const { theme } = useTheme();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    in_progress: number;
    waiting_for_workers: number;
    completed: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedHostelId, setSelectedHostelId] = useState<string>(hostelId?.toString() || 'all');
  const [loading, setLoading] = useState(true);
  const [isFetchingHostels, setIsFetchingHostels] = useState(false);
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
  const filterRef = useRef<HTMLDivElement>(null);
  const [showFilter, setShowFilter] = useState(false);

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
    if (!selectedHostelId) return;
    setExporting(true);
    try {
      const paramHostelId = selectedHostelId === 'all' ? 'all' : Number(selectedHostelId);
      const blob = await exportHostelIssuesPdf(paramHostelId, statusFilter !== 'all' ? statusFilter : undefined);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const hostelName = selectedHostelId === 'all' ? 'All Hostels' : hostels.find(h => h.id.toString() === selectedHostelId)?.name || 'Hostel';
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


  // Sync selectedHostelId when hostelId prop is explicitly provided
  useEffect(() => {
    if (hostelId) {
      const isValid = hostels.some(h => h.id === hostelId);
      if (isValid) {
        setSelectedHostelId(hostelId.toString());
      }
    }
  }, [hostelId, hostels]);
  useEffect(() => {
    if (selectedHostelId) {
      setStatsLoading(true);
      fetchIssues();
    } else {
      setIssues([]);
      setTotalCount(0);
      setTotalPages(1);
      setLoading(false);
      setStats(null);
      setStatsLoading(false);
    }
  }, [selectedHostelId, statusFilter, currentPage]);



  const fetchIssues = async () => {
    if (!selectedHostelId) return;
    setLoading(true);
    setPermissionError(null);
    try {
      const hostelParam = selectedHostelId === 'all' ? 'all' : Number(selectedHostelId);
      const response = await getHostelIssues(hostelParam, statusFilter !== 'all' ? statusFilter : undefined, currentPage);

      if (!response.success && (response.message?.includes('You do not have permission') || response.message?.includes('Only wardens'))) {
        setPermissionError(response.message || 'Access Denied. Only wardens and admins can access this page.');
        setIssues([]);
        setStats(null);
        setStatsLoading(false);
      } else if (response.success || response.results) {
        const dataResults = response.results || response.data || [];
        setIssues(dataResults);
        const count = response.count || dataResults.length;
        setTotalCount(count);
        setTotalPages(Math.max(1, Math.ceil(count / 10)));
        
        // Extract stats from the unified response
        const statsData = response.stats || response.data?.stats;
        if (statsData) {
          setStats(statsData);
        } else {
          setStats(null);
        }
        setStatsLoading(false);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load issues',
          variant: 'destructive'
        });
        setStats(null);
        setStatsLoading(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Connection error while loading issues',
        variant: 'destructive'
      });
      setStats(null);
      setStatsLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueClick = async (issue: Issue) => {
    try {
      const response = await getIssueDetail(issue.id);
      if (response.success && response.data) {
        setSelectedIssue(response.data);
        setIsDetailsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching issue details:', error);
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
        
        fetchIssues();

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
      console.error('Failed to update issue status:', error);
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
      <div id="hms-issues-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="space-y-4">
        {/* Issues List */}
        <div className="space-y-4">
          <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader id="hms-issues-card" className="pb-4 border bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">Issue Tracking</CardTitle>
                  <CardDescription>Manage student complaints and maintenance requests.</CardDescription>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
                  {/* Select Hostel Dropdown */}
                  <div className="w-full sm:w-[160px] shrink-0 text-left">
                    {skeletonMode ? (
                      <div className="h-9 w-full rounded-xl bg-muted animate-pulse border" />
                    ) : (
                      <Select
                        value={selectedHostelId}
                        onOpenChange={async (open) => {
                          if (open) {
                            setIsFetchingHostels(true);
                            await fetchHostelsOnly();
                            setIsFetchingHostels(false);
                          }
                        }}
                        onValueChange={setSelectedHostelId}
                      >
                        <SelectTrigger className="bg-background border-primary/10 hover:border-primary/30 transition-colors h-9 text-xs font-semibold rounded-xl w-full">
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            <Home className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span className="truncate text-left block w-full text-xs">
                              {selectedHostelId === 'all'
                                ? 'All Hostels'
                                : selectedHostelId 
                                  ? (hostels.find(h => h.id.toString() === selectedHostelId)?.name || 'Select Hostel').replace(/\s*\(.*?\)\s*/g, '')
                                  : 'Select Hostel'}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {isFetchingHostels ? (
                            <div className="p-3 text-center text-xs text-muted-foreground animate-pulse">Loading hostels...</div>
                          ) : (
                            <>
                              <SelectItem value="all" className="font-semibold text-primary">All Hostels</SelectItem>
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
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Filter Status Button */}
                    <div className="relative flex-1 sm:flex-none shrink-0" ref={filterRef}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilter(!showFilter)}
                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white h-9 px-3.5 rounded-xl font-semibold text-xs gap-1.5"
                      >
                        <Filter className="w-3.5 h-3.5" /> Filter
                      </Button>
                      
                      {showFilter && (
                        <div className={`absolute right-0 mt-2 w-48 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-xl shadow-xl z-50 p-1`}>
                          {[
                            { label: 'All Status', value: 'all' },
                            { label: 'Pending', value: 'pending' },
                            { label: 'In Progress', value: 'in_progress' },
                            { label: 'Waiting for Workers', value: 'waiting_for_workers' },
                            { label: 'Completed', value: 'completed' },
                          ].map((item) => (
                            <button
                              key={item.value}
                              onClick={() => {
                                setStatusFilter(item.value);
                                setCurrentPage(1);
                                setShowFilter(false);
                              }}
                              className={`block w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                                statusFilter === item.value
                                  ? theme === 'dark'
                                    ? 'bg-primary/20 text-primary font-bold'
                                    : 'bg-primary/10 text-primary font-bold'
                                  : theme === 'dark'
                                    ? 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Export PDF Button */}
                    {selectedHostelId && totalCount > 0 && (
                      <>
                        {/* Desktop Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportPDF}
                          disabled={exporting}
                          className="hidden sm:flex items-center gap-1.5 h-9 text-xs bg-primary hover:bg-primary/90 text-white border-primary transition-all px-3 whitespace-nowrap rounded-xl"
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
                          className="flex sm:hidden h-9 w-9 items-center justify-center shrink-0 border border-input bg-background rounded-xl"
                        >
                          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div>
                {(loading || skeletonMode) && issues.length === 0 ?
                <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-lg" />)}
                  </div> :
                issues.length === 0 ?
                <div className={`flex flex-col items-center justify-center py-12 px-4 m-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-white'}`}>
                  <CheckCircle className="w-10 h-10 text-primary opacity-30 mb-3" />
                  <h3 className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No issues found</h3>
                  <p className={`text-xs text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>There are currently no complaints or issues matching this status.</p>
                </div> :

                <div>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                      <thead className={`border-b ${theme === 'dark' ? 'border-border bg-muted/20' : 'border-gray-200 bg-gray-50'}`}>
                        <tr>
                          <th className="py-3.5 px-4 font-semibold text-muted-foreground">ID</th>
                          <th className="py-3.5 px-4 font-semibold text-muted-foreground">Title</th>
                          <th className="py-3.5 px-4 font-semibold text-muted-foreground">Status</th>
                          <th className="py-3.5 px-4 font-semibold text-muted-foreground">Student</th>
                          <th className="py-3.5 px-4 font-semibold text-muted-foreground">Room</th>
                          <th className="py-3.5 px-4 font-semibold text-muted-foreground">Date Raised</th>
                          <th className="py-3.5 px-4 font-semibold text-muted-foreground">Updates</th>
                          <th className="py-3.5 px-4 font-semibold text-muted-foreground text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {issues.map((issue) => {
                          const config = STATUS_CONFIG[issue.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                          return (
                            <tr key={issue.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-4 font-mono text-xs text-muted-foreground bg-muted/20">#{issue.id}</td>
                              <td className="py-3 px-4 font-semibold max-w-[200px] truncate">{issue.title}</td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className={`text-[10px] sm:text-xs h-5 whitespace-nowrap ${config.color}`}>
                                  {issue.status_display}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-sm">{issue.student_name}</div>
                                <div className="text-[10px] text-muted-foreground">{issue.enrollment_no}</div>
                              </td>
                              <td className="py-3 px-4 text-sm font-medium">Room {issue.room_name}</td>
                              <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(issue.created_at)}</td>
                              <td className="py-3 px-4">
                                {issue.update_count > 0 ? (
                                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] sm:text-xs font-normal">
                                    {issue.update_count} updates
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs font-semibold px-3 py-1 rounded-xl h-8 text-primary hover:bg-primary/5 border-primary/10"
                                  onClick={() => {
                                    handleIssueClick(issue);
                                    setIsDetailsModalOpen(true);
                                  }}
                                >
                                  View Details
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View Cards */}
                  <div className="md:hidden divide-y-0 sm:divide-y divide-border/30 p-3 sm:p-0 space-y-3 sm:space-y-0">
                    {issues.map((issue) => {
                      const config = STATUS_CONFIG[issue.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                      const isSelected = selectedIssue?.id === issue.id;
                      return (
                        <div
                          key={issue.id}
                          onClick={() => handleIssueClick(issue)}
                          className={cn(
                            "p-4 transition-all cursor-pointer hover:bg-muted/70 relative",
                            "border rounded-xl shadow-sm bg-card sm:border-0 sm:rounded-none sm:shadow-none sm:bg-transparent",
                            isSelected ? "bg-primary/10" : ""
                          )}>
                          
                          <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">#{issue.id}</span>
                              <h4 className="font-semibold text-sm sm:text-base break-words break-all">{issue.title}</h4>
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

                          <div className="mt-3 pt-3 border-t border-border/50 flex">
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              }
              </div>
            </CardContent>
            {totalPages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} issues
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="w-[90%] sm:w-full sm:max-w-2xl max-h-[80vh] sm:max-h-[85vh] rounded-xl sm:rounded-2xl overflow-y-auto custom-scrollbar p-6">
          {selectedIssue && (
            <div className="space-y-6">
              {/* Header with Title, Status, Timeline & Export Actions */}
              <div className="border-b border-border/40 pb-4 space-y-3 pr-10 sm:pr-0">
                <div className="flex flex-col gap-2 min-w-0">
                  <DialogTitle className="text-xl font-bold text-foreground leading-snug break-words break-all">{selectedIssue.title}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(
                      STATUS_CONFIG[selectedIssue.status as keyof typeof STATUS_CONFIG]?.color || '',
                      "text-[10px] py-0.5 font-semibold"
                    )}>
                      {selectedIssue.status_display}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 font-semibold">
                      ID: #{selectedIssue.id}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full shrink-0">
                  {/* Resolution Timeline Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 h-9 gap-1.5 text-xs border-primary/20 hover:bg-primary/5 hover:text-primary rounded-xl">
                        <History className="w-3.5 h-3.5 text-primary" />
                        <span>Timeline</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95%] max-w-[95vw] sm:max-w-[480px] max-h-[80vh] rounded-xl overflow-y-auto custom-scrollbar p-0 z-[200] [&>button]:border-none [&>button]:outline-none [&>button]:focus:ring-0">
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
                  
                  {/* Export PDF Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportSingleIssuePDF}
                    disabled={exportingSingle}
                    className="flex-1 h-9 gap-1.5 text-xs bg-primary text-white border-primary hover:bg-primary/90 hover:text-white rounded-xl"
                  >
                    {exportingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Export PDF</span>
                  </Button>
                </div>
              </div>

              {/* Student & Location Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/20 text-xs">
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
                <div className="col-span-1 sm:col-span-2 border-t pt-2 border-border/40">
                  <span className="text-muted-foreground uppercase font-semibold block mb-0.5 tracking-wider">Date Raised</span>
                  <p className="font-semibold text-sm">{formatDate(selectedIssue.created_at)}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquare className="w-4 h-4 text-primary" /> Description
                </h4>
                <p className="text-sm text-foreground bg-background p-4 rounded-lg border border-dashed leading-relaxed whitespace-pre-wrap">
                  {selectedIssue.description}
                </p>
              </div>

              {/* Update Status Actions */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Update Status</h4>
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

              {/* Footer Close Button */}
              <div className="pt-4 border-t border-border/40 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setIsDetailsModalOpen(false)} className="font-semibold h-9 px-4 rounded-xl">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>);

};

export default IssueTracking;