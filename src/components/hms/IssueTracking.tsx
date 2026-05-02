import { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { useHMSContext } from '../../context/HMSContext';
import { useToast } from '../../hooks/use-toast';
import {
  getHostelIssues,
  updateIssueStatus,
  getIssueDetail
} from '../../utils/hms_api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50',
    icon: AlertTriangle
  },
  in_progress: {
    label: 'In Progress',
    order: 1,
    color: 'bg-blue-500/10 text-blue-600 border-blue-200/50',
    icon: Clock
  },
  waiting_for_workers: {
    label: 'Waiting for Workers',
    order: 2,
    color: 'bg-orange-500/10 text-orange-600 border-orange-200/50',
    icon: Loader2
  },
  completed: {
    label: 'Completed',
    order: 3,
    color: 'bg-green-500/10 text-green-600 border-green-200/50',
    icon: CheckCircle2
  }
};

const IssueTracking = ({ hostelId }: { hostelId: number }) => {
  const { toast } = useToast();
  const { hostels, skeletonMode } = useHMSContext();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>(hostelId?.toString() || '');
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<DetailedIssue | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingIssueId, setUpdatingIssueId] = useState<number | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // No longer auto-selecting first hostel
  useEffect(() => {
    // Keep empty until user selects
  }, [hostels]);

  useEffect(() => {
    if (selectedHostelId) {
      fetchIssues();
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
          setTotalCount(response.count || response.results.length);
        } else if (Array.isArray(response.data)) {
          setIssues(response.data);
          setTotalCount(response.data.length);
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
          description: 'Issue status updated',
        });

        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus, status_display: STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus, updated_at: new Date().toISOString(), update_count: (i.update_count || 0) + 1 } : i));

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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Issues"
          value={loading || skeletonMode ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : totalCount}
          description="Total raised this month"
          icon={<MessageSquare className="w-5 h-5" />}
        />
        <DashboardCard
          title="Pending"
          value={loading || skeletonMode ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : issues.filter(i => i.status === 'pending').length}
          description="Awaiting warden review"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <DashboardCard
          title="In Progress"
          value={loading || skeletonMode ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : issues.filter(i => i.status === 'in_progress').length}
          description="Being handled"
          icon={<Clock className="w-5 h-5" />}
        />
        <DashboardCard
          title="Resolved"
          value={loading || skeletonMode ? <div className="h-8 w-12 bg-muted animate-pulse rounded" /> : issues.filter(i => i.status === 'completed').length}
          description="Marked as completed"
          icon={<CheckCircle className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Issues List */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b bg-muted/30">
              <div className="flex flex-col space-y-4">
                <div className="space-y-1">
                  <CardTitle>Issue Tracking</CardTitle>
                  <CardDescription>Manage student complaints and maintenance requests.</CardDescription>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground px-1">Hostel</p>
                    {loading || skeletonMode ? (
                      <div className="h-10 w-full rounded-md bg-muted animate-pulse border" />
                    ) : (
                      <Select value={selectedHostelId} onValueChange={setSelectedHostelId}>
                        <SelectTrigger className="bg-background border-primary/10 hover:border-primary/30 transition-colors h-10">
                          <div className="flex items-center gap-2">
                            <Home className="w-3.5 h-3.5 text-primary/70" />
                            <SelectValue placeholder="Select Hostel" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {hostels.map((h) => (
                            <SelectItem key={h.id} value={h.id.toString()}>{h.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground px-1">Filter Status</p>
                    {loading || skeletonMode ? (
                      <div className="h-10 w-full rounded-md bg-muted animate-pulse border" />
                    ) : (
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
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-23.5rem)] min-h-[50px] custom-scrollbar">
                {(loading || skeletonMode) && issues.length === 0 ? (
                  <div className="divide-y">
                    {[1, 2, 3, 4].map(i => (
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
                    ))}
                  </div>
                ) : issues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <CheckCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="font-semibold text-muted-foreground">All clear!</p>
                    <p className="text-sm text-muted-foreground">No issues found with this filter.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {issues.map((issue) => {
                      const config = STATUS_CONFIG[issue.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                      const Icon = config.icon;
                      const isSelected = selectedIssue?.id === issue.id;

                      return (
                        <div
                          key={issue.id}
                          onClick={() => handleIssueClick(issue)}
                          className={`p-4 transition-all cursor-pointer hover:bg-muted/50 relative ${isSelected ? "bg-primary/5 ring-1 ring-primary/20 ring-inset" : ""
                            }`}
                        >
                          {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 " />}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{issue.id}</span>
                              <h4 className="font-semibold text-sm truncate max-w-[150px]">{issue.title}</h4>
                            </div>
                            <Badge variant="outline" className={`text-[10px] h-5 ${config.color}`}>
                              {issue.status_display}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {issue.student_name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Home className="w-3 h-3" /> Room {issue.room_name}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1 text-muted-foreground/70">
                              <Calendar className="w-3 h-3" /> {formatDate(issue.created_at)}
                            </span>
                            {issue.update_count > 0 && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal">
                                {issue.update_count} updates
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Issue Details */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedIssue ? (
              <motion.div
                key={selectedIssue.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="border-primary/10 shadow-md h-[calc(100vh-23.5rem)] min-h-[500px] flex flex-col overflow-hidden">
                  <CardHeader className="pb-4 border-b bg-muted/10 shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <CardTitle className="text-xl font-semibold">{selectedIssue.title}</CardTitle>
                        <Badge className={`${STATUS_CONFIG[selectedIssue.status as keyof typeof STATUS_CONFIG]?.color} px-3 py-1`}>
                          {selectedIssue.status_display}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border/40">
                          ID: #{selectedIssue.id}
                        </span>
                      </div>
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
                            {selectedIssue.updates && selectedIssue.updates.length > 0 ? (
                              <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                                {selectedIssue.updates.map((update: any, idx: number) => (
                                  <div key={idx} className="relative pl-8">
                                    <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/30 border border-muted/50">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-semibold">
                                          {update.old_status_display} → {update.new_status_display}
                                        </p>
                                        <span className="text-[10px] font-mono text-muted-foreground">{formatDate(update.created_at)}</span>
                                      </div>
                                      {update.note && <p className="text-xs text-muted-foreground mt-1 bg-background/50 p-2 rounded">{update.note}</p>}
                                      <p className="text-[10px] mt-2 text-primary/70 flex items-center gap-1 font-medium">
                                        <User className="w-3 h-3" /> {update.updated_by_name || 'System'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-20 text-center opacity-50">
                                <History className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-sm">No history available for this issue.</p>
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <ScrollArea className="flex-1">
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-muted-foreground/10">
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Student</p>
                          <p className="text-sm font-semibold">{selectedIssue.student_name}</p>
                          <p className="text-xs text-muted-foreground">{selectedIssue.enrollment_no}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Location</p>
                          <p className="text-sm font-semibold">Room {selectedIssue.room_name}</p>
                          <p className="text-xs text-muted-foreground">{selectedIssue.hostel_name}</p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Date Raised</p>
                          <p className="text-sm font-semibold">{formatDate(selectedIssue.created_at)}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" /> Description
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed bg-background p-4 rounded-lg border border-dashed">
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
                                className={`h-8 text-xs font-semibold transition-all ${isCurrent
                                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-105"
                                  : isPast
                                    ? "opacity-50 grayscale-[0.5] cursor-not-allowed bg-muted/20"
                                    : "hover:border-primary/60 opacity-100"
                                  }`}
                              >
                                {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </ScrollArea>
                </Card>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-23.5rem)] min-h-[500px] border-2 border-dashed rounded-3xl bg-muted/5 opacity-50">
                <div className="bg-muted/50 p-8 rounded-full mb-6 ring-8 ring-muted/20">
                  <ChevronRight className="w-12 h-12 text-muted-foreground animate-pulse" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-foreground/80">Select an issue to resolve</h3>
                <p className="text-muted-foreground mt-2 text-sm max-w-[200px] text-center">Choose an issue from the list on the left to manage it.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default IssueTracking;
