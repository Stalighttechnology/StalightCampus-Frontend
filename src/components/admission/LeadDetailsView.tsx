import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Phone, Mail, Clock, Calendar as CalendarIcon, CheckCircle2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { crmApi, Lead, LeadActivity, LeadTask } from '../../api/crm_api';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';

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
                        tasks.filter(t => !t.is_completed).map(task => (
                          <div key={task.id} className="flex items-start gap-3 p-3 border rounded-md bg-card shadow-sm">
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
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">{task.task_type}</Badge>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(task.due_date).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))
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
                        activities.map((activity, index) => (
                          <div key={activity.id} className="relative mb-6 last:mb-0">
                            <div className="absolute -left-[23px] bg-background p-1 rounded-full border border-muted">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{activity.description}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{activity.activity_type.replace('_', ' ')}</Badge>
                                <span>{new Date(activity.created_at).toLocaleString()}</span>
                                <span>by {activity.created_by_name}</span>
                              </div>
                            </div>
                          </div>
                        ))
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
