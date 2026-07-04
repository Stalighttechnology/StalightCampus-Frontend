import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Phone, Mail, Clock, Calendar as CalendarIcon, CheckCircle2, User as UserIcon, AlertCircle, PhoneCall, MessageCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { crmApi, Lead, LeadActivity, LeadTask } from '../../api/crm_api';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';

// --- Color helpers ---
const getTaskUrgency = (task: LeadTask) => {
  if (task.is_completed) return 'completed';
  const now = new Date();
  const due = new Date(task.due_date);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (due < now) return 'overdue';
  if (due < todayEnd) return 'today';
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  if (due < in3days) return 'soon';
  return 'upcoming';
};

const taskUrgencyStyles = {
  overdue:   { border: 'border-l-red-500',    bg: 'bg-red-50 dark:bg-red-950/20',     badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',     icon: AlertCircle, iconClass: 'text-red-500',    label: 'Overdue' },
  today:     { border: 'border-l-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', icon: Clock, iconClass: 'text-orange-500', label: 'Due Today' },
  soon:      { border: 'border-l-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', icon: Clock, iconClass: 'text-yellow-600', label: 'Due Soon' },
  upcoming:  { border: 'border-l-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/20',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',     icon: CalendarIcon, iconClass: 'text-blue-500', label: 'Upcoming' },
  completed: { border: 'border-l-green-500',  bg: 'bg-green-50 dark:bg-green-950/20', badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',   icon: CheckCircle2, iconClass: 'text-green-500', label: 'Done' },
};

const activityTypeStyles: Record<string, { dot: string; badge: string; icon: React.ElementType }> = {
  call:      { dot: 'bg-green-500',   badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',   icon: PhoneCall },
  email:     { dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',       icon: Mail },
  whatsapp:  { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', icon: MessageCircle },
  note:      { dot: 'bg-purple-500',  badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', icon: FileText },
  meeting:   { dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300', icon: UserIcon },
};

interface LeadDetailsViewProps {
  leadId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: () => void;
  userRole?: string;
}

const LeadDetailsView: React.FC<LeadDetailsViewProps> = ({ leadId, isOpen, onClose, onLeadUpdated, userRole }) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New Task Form
  const [newTaskType, setNewTaskType] = useState('call');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // New Activity Form
  const [newActivityType, setNewActivityType] = useState('note');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [submittingActivity, setSubmittingActivity] = useState(false);
  
  // Assignment
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const isManager = userRole === 'admission_manager' || userRole === 'org_admin' || userRole === 'superadmin' || userRole === 'principal';

  useEffect(() => {
    if (leadId && isOpen) {
      fetchLeadData();
      if (isManager && counsellors.length === 0) {
        fetchCounsellors();
      }
    } else {
      setLead(null);
      setActivities([]);
      setTasks([]);
    }
  }, [leadId, isOpen, isManager]);

  const fetchCounsellors = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/?role=counsellor`);
      const data = await response.json();
      if (response.ok) {
        setCounsellors(
          Array.isArray(data.users) ? data.users 
          : Array.isArray(data.results) ? data.results 
          : Array.isArray(data) ? data 
          : []
        );
      } else {
        console.error("Failed to load counsellors", data);
        setCounsellors([]);
      }
    } catch (err) {
      console.error("Failed to fetch counsellors", err);
    }
  };

  const fetchLeadData = async () => {
    setLoading(true);
    try {
      if (!leadId) return;
      const [leadRes, activitiesRes, tasksRes] = await Promise.all([
        crmApi.getLead(leadId),
        crmApi.getActivities(leadId),
        crmApi.getTasks(leadId)
      ]);
      setLead(leadRes.data);
      setActivities(activitiesRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !newTaskDesc || !newTaskDate) return;
    
    setSubmittingTask(true);
    try {
      await crmApi.createTask({
        enquiry: leadId,
        task_type: newTaskType,
        description: newTaskDesc,
        due_date: newTaskDate,
        assigned_to: lead?.assigned_to // By default, assign to the lead's counsellor
      });
      toast.success('Task created successfully');
      setNewTaskDesc('');
      setNewTaskDate('');
      fetchLeadData();
      if (onLeadUpdated) onLeadUpdated();
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !newActivityDesc) return;
    
    setSubmittingActivity(true);
    try {
      await crmApi.createActivity({
        enquiry: leadId,
        activity_type: newActivityType,
        description: newActivityDesc
      });
      toast.success('Activity logged successfully');
      setNewActivityDesc('');
      fetchLeadData();
      if (onLeadUpdated) onLeadUpdated();
    } catch (error) {
      toast.error('Failed to log activity');
    } finally {
      setSubmittingActivity(false);
    }
  };

  const handleMarkTaskDone = async (taskId: number) => {
    try {
      await crmApi.markTaskCompleted(taskId);
      toast.success('Task marked as completed');
      fetchLeadData();
      if (onLeadUpdated) onLeadUpdated();
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const handleAssignCounsellor = async (counsellorIdStr: string) => {
    if (!leadId) return;
    setAssigning(true);
    try {
      await crmApi.assignCounsellor(leadId, parseInt(counsellorIdStr));
      toast.success("Lead assigned successfully!");
      fetchLeadData();
      if (onLeadUpdated) onLeadUpdated();
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign lead");
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading || !lead ? (
          <div className="h-[400px] flex flex-col items-center justify-center">
            <DialogTitle className="sr-only">Loading Lead</DialogTitle>
            <DialogDescription className="sr-only">Loading lead data...</DialogDescription>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col h-full gap-6">
            <DialogHeader className="pb-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl">{lead.name}</DialogTitle>
                  <DialogDescription className="sr-only">Lead details and priority</DialogDescription>
                  <div className="text-base flex items-center gap-2 mt-1">
                    <Badge variant={lead.priority === 'hot' ? 'destructive' : lead.priority === 'warm' ? 'default' : 'secondary'}>
                      {lead.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{lead.status.replace('_', ' ').toUpperCase()}</Badge>
                  </div>
                </div>
                {lead.assigned_to_name && !isManager ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                    <UserIcon className="w-4 h-4" />
                    <span>{lead.assigned_to_name}</span>
                  </div>
                ) : isManager ? (
                  <div className="flex items-center gap-2">
                    <Select 
                      value={lead.assigned_to?.toString() || ""} 
                      onValueChange={handleAssignCounsellor}
                      disabled={assigning}
                    >
                      <SelectTrigger className="w-[180px] h-9 text-xs">
                        <SelectValue placeholder="Assign Counsellor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned" disabled>Select Counsellor</SelectItem>
                        {counsellors.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.first_name} {c.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Profile */}
              <div className="md:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Contact Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-sm overflow-hidden">
                        <p className="text-muted-foreground text-xs">Email</p>
                        <p className="font-medium truncate" title={lead.email}>{lead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs">Phone</p>
                        <p className="font-medium">{lead.phone}</p>
                      </div>
                    </div>
                    {lead.course_name && (
                      <div className="pt-3 border-t">
                        <p className="text-muted-foreground text-xs">Interested Course</p>
                        <p className="font-medium text-sm">{lead.course_name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Timeline & Tasks */}
              <div className="md:col-span-2">
                <Tabs defaultValue="tasks" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="tasks">Follow-up Tasks</TabsTrigger>
                    <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
                  </TabsList>
                  
                  {/* Tasks Tab */}
                  <TabsContent value="tasks" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Add New Task</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateTask} className="space-y-3">
                          <div className="flex gap-2">
                            <Select value={newTaskType} onValueChange={setNewTaskType}>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="call">Call</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="meeting">Meeting</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              type="datetime-local" 
                              value={newTaskDate} 
                              onChange={e => setNewTaskDate(e.target.value)}
                              className="flex-1"
                              required
                            />
                          </div>
                          <Textarea 
                            placeholder="Task description..." 
                            value={newTaskDesc}
                            onChange={e => setNewTaskDesc(e.target.value)}
                            className="resize-none"
                            rows={2}
                            required
                          />
                          <Button type="submit" size="sm" disabled={submittingTask} className="w-full">
                            {submittingTask ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Create Task
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground px-1">Upcoming & Pending Tasks</h4>
                      {tasks.filter(t => !t.is_completed).length === 0 ? (
                        <div className="text-center p-4 border border-dashed rounded-md text-sm text-muted-foreground bg-muted/20">
                          No pending tasks
                        </div>
                      ) : (
                        tasks.filter(t => !t.is_completed).map(task => {
                          const urgency = getTaskUrgency(task);
                          const style = taskUrgencyStyles[urgency];
                          const UrgencyIcon = style.icon;
                          return (
                          <div key={task.id} className={`flex items-start gap-3 p-3 border-l-4 rounded-md shadow-sm ${style.border} ${style.bg}`}>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="w-6 h-6 rounded-full shrink-0" 
                              onClick={() => handleMarkTaskDone(task.id)}
                            >
                              <CheckCircle2 className="w-4 h-4 text-muted-foreground hover:text-green-500" />
                            </Button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{task.description}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">{task.task_type}</Badge>
                                <span className={`flex items-center gap-1 font-medium text-[10px] px-1.5 py-0.5 rounded-full ${style.badge}`}>
                                  <UrgencyIcon className={`w-3 h-3 ${style.iconClass}`}/> {style.label}
                                </span>
                                <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3"/> {new Date(task.due_date).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Log Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateActivity} className="space-y-3">
                          <Select value={newActivityType} onValueChange={setNewActivityType}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">Call Log</SelectItem>
                              <SelectItem value="email">Email Sent</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp Msg</SelectItem>
                              <SelectItem value="note">Internal Note</SelectItem>
                            </SelectContent>
                          </Select>
                          <Textarea 
                            placeholder="Activity details or notes..." 
                            value={newActivityDesc}
                            onChange={e => setNewActivityDesc(e.target.value)}
                            className="resize-none"
                            rows={2}
                            required
                          />
                          <Button type="submit" size="sm" disabled={submittingActivity} className="w-full">
                            {submittingActivity ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Log Activity
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    <div className="space-y-0 relative border-l-2 border-muted ml-3 pl-4 py-2">
                      {activities.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-2">No activity logged yet.</div>
                      ) : (
                        activities.map((activity) => {
                          const style = activityTypeStyles[activity.activity_type] || activityTypeStyles['note'];
                          const ActivityIcon = style.icon;
                          return (
                          <div key={activity.id} className="relative mb-6 last:mb-0">
                            <div className="absolute -left-[23px] bg-background p-1 rounded-full border border-muted">
                              <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                            </div>
                            <div className="pl-1">
                              <p className="text-sm font-medium">{activity.description}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span className={`flex items-center gap-1 font-medium text-[10px] px-1.5 py-0.5 rounded-full ${style.badge}`}>
                                  <ActivityIcon className="w-3 h-3" />
                                  {activity.activity_type.replace('_', ' ')}
                                </span>
                                <span>{new Date(activity.created_at).toLocaleString()}</span>
                                <span className="text-muted-foreground/70">by {activity.created_by_name}</span>
                              </div>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsView;
