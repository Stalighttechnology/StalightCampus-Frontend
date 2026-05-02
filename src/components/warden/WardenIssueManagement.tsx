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
import { getWardenIssues, updateWardenIssue } from '../../utils/warden_api';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { API_ENDPOINT } from '../../utils/config';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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

const WardenIssueManagement = () => {
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<DetailedIssue | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingIssueId, setUpdatingIssueId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchIssues();
  }, [statusFilter]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const response = await getWardenIssues();
      if (response.results) {
        let filtered = response.results;
        if (statusFilter !== 'all') {
          filtered = filtered.filter((i: Issue) => i.status === statusFilter);
        }
        setIssues(filtered);
        setTotalCount(response.count);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load issues',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueClick = async (issue: Issue) => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/warden/issues/${issue.id}/`);
      const data = await response.json();
      setSelectedIssue(data);
    } catch (error) {
      console.error('Error fetching issue details:', error);
    }
  };

  const handleStatusChange = async (issueId: number, newStatus: string) => {
    setUpdatingIssueId(issueId);
    try {
      const data = await updateWardenIssue(issueId, { status: newStatus });

      toast({
        title: 'Success',
        description: 'Issue status updated',
      });

      // Update local issues state silently
      setIssues(prev => prev.map(issue =>
        issue.id === issueId ? { ...issue, status: data.status, status_display: data.status_display } : issue
      ));

      if (selectedIssue?.id === issueId) {
        setSelectedIssue(data);
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Issues"
          value={totalCount}
          description="Managed by you"
          icon={<MessageSquare className="w-5 h-5 text-purple-500" />}
        />
        <DashboardCard
          title="Pending"
          value={issues.filter(i => i.status === 'pending').length}
          description="New requests"
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
        />
        <DashboardCard
          title="In Progress"
          value={issues.filter(i => i.status === 'in_progress').length}
          description="Being resolved"
          icon={<Clock className="w-5 h-5 text-blue-500" />}
        />
        <DashboardCard
          title="Completed"
          value={issues.filter(i => i.status === 'completed').length}
          description="Resolved cases"
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Issues List */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Recent Issues</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs border-primary/10">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-28rem)] min-h-[400px]">
                {loading && issues.length === 0 ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-lg" />)}
                  </div>
                ) : issues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                    <CheckCircle className="w-12 h-12 mb-4" />
                    <p className="font-semibold">No issues found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {issues.map((issue) => {
                      const config = STATUS_CONFIG[issue.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                      const isSelected = selectedIssue?.id === issue.id;
                      return (
                        <div
                          key={issue.id}
                          onClick={() => handleIssueClick(issue)}
                          className={`p-4 transition-all cursor-pointer hover:bg-muted/70 relative ${isSelected ? "bg-primary/10" : ""
                            }`}
                        >
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
                            <span>{issue.student_name} • Room {issue.room_name}</span>
                            <span>{formatDate(issue.created_at)}</span>
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
                className="space-y-6"
              >
                <Card className="border-border/40 shadow-md">
                  <CardHeader className="pb-4 border-b bg-muted/10">
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
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/20">
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 tracking-wider">Student</p>
                        <p className="text-sm font-semibold">{selectedIssue.student_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 tracking-wider">Room</p>
                        <p className="text-sm font-semibold">{selectedIssue.room_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 tracking-wider">Hostel</p>
                        <p className="text-sm font-semibold">{selectedIssue.hostel_name}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wide text-muted-foreground/80">
                        Description
                      </h4>
                      <p className="text-sm leading-relaxed bg-background p-4 rounded-lg border border-dashed border-border/60">
                        {selectedIssue.description}
                      </p>
                    </div>

                    <Separator className="bg-border/40" />

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
                              onClick={() => handleStatusChange(selectedIssue.id, status)}
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
                </Card>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-border/40 rounded-2xl bg-muted/5 opacity-50">
                <div className="bg-muted p-6 rounded-full mb-4">
                  <ChevronRight className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Select an issue to resolve</h3>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WardenIssueManagement;
