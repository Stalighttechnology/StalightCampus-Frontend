import React, { useState, useEffect, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle2, Plus, ArrowRight, User, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { staffTaskApi, StaffTask } from '../../api/staff_task_api';
import Swal from 'sweetalert2';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "../../lib/utils";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";

// Custom SelectContent components without scroll arrows
const CustomSelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {header?: React.ReactNode;}>(
  ({ className, children, position = "popper", header, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
        "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      
      {header && <div className="z-20 bg-popover border-b">{header}</div>}
      <SelectPrimitive.Viewport
        className={cn(
          "p-1 max-h-[calc(100%-8px)] overflow-y-auto custom-scrollbar",
          position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}>
        
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
CustomSelectContent.displayName = SelectPrimitive.Content.displayName;


const StaffTaskTracker = () => {
  const { user, role } = useAuth();
  const [myTasks, setMyTasks] = useState<StaffTask[]>([]);
  const [myTasksLoading, setMyTasksLoading] = useState(true);
  const [myTasksPage, setMyTasksPage] = useState(1);
  const [myTasksTotalPages, setMyTasksTotalPages] = useState(1);

  const [assignedTasks, setAssignedTasks] = useState<StaffTask[]>([]);
  const [assignedTasksLoading, setAssignedTasksLoading] = useState(true);
  const [assignedTasksPage, setAssignedTasksPage] = useState(1);
  const [assignedTasksTotalPages, setAssignedTasksTotalPages] = useState(1);

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'general',
    priority: 'medium',
    assigned_to: '',
    assigned_to_name: '',
    due_date: ''
  });

  // Subordinates and Pagination State
  const [subordinates, setSubordinates] = useState<{id: number, name: string, role: string}[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subPage, setSubPage] = useState(1);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const [branches, setBranches] = useState<{id: number, name: string}[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  const statusWeight = { 'pending': 1, 'in_progress': 2, 'completed': 3 };
  const priorityWeight = { 'high': 1, 'medium': 2, 'low': 3 };

  const sortTasks = (a: StaffTask, b: StaffTask) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  };

  useEffect(() => {
    fetchMyTasks();
  }, [myTasksPage]);

  useEffect(() => {
    fetchAssignedTasks();
  }, [assignedTasksPage]);

  const fetchMyTasks = async () => {
    setMyTasksLoading(true);
    try {
      const data = await staffTaskApi.getTasks('received', myTasksPage);
      setMyTasks((data.results || []).sort(sortTasks));
      setMyTasksTotalPages(Math.ceil((data.count || 1) / 10));
    } catch (error) {
      console.error('Failed to fetch my tasks', error);
    } finally {
      setMyTasksLoading(false);
    }
  };

  const fetchAssignedTasks = async () => {
    setAssignedTasksLoading(true);
    try {
      const data = await staffTaskApi.getTasks('assigned', assignedTasksPage);
      setAssignedTasks((data.results || []).sort(sortTasks));
      setAssignedTasksTotalPages(Math.ceil((data.count || 1) / 10));
    } catch (error) {
      console.error('Failed to fetch assigned tasks', error);
    } finally {
      setAssignedTasksLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/teacher-assignments/?page=1&page_size=1`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        }
      });
      const result = await response.json();
      if (result && result.branches) {
        setBranches(result.branches);
      } else if (result && result.results && result.results.branches) {
        setBranches(result.results.branches);
      }
    } catch (e) {
      console.error('Failed to fetch branches', e);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim());
      setSubPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (isDialogOpen) {
      if (role === 'principal' && branches.length === 0) {
        fetchBranches();
      }
      
      if (role === 'hod' || role === 'principal') {
        // Principal needs to select a branch before we fetch, unless they are searching globally
        if (role === 'principal' && !selectedBranch && !appliedSearch) {
          setSubordinates([]);
          setSubTotalPages(1);
          return;
        }
        fetchSubordinates();
      }
    }
  }, [isDialogOpen, subPage, appliedSearch, selectedBranch, role]);

  const fetchSubordinates = async () => {
    setSubLoading(true);
    try {
      const data = await staffTaskApi.getSubordinates({
        page: subPage,
        page_size: 10,
        search: appliedSearch,
        branch_id: selectedBranch || undefined
      });
      
      setSubordinates(data.results || []);
      setSubTotalPages(Math.ceil((data.count || 1) / 10));
    } catch (error) {
      console.error('Failed to fetch subordinates', error);
    } finally {
      setSubLoading(false);
    }
  };

  const currentUserId = user?.id || user?.user_id;

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.assigned_to || !newTask.due_date) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Please fill in all required fields!' });
      return;
    }

    try {
      const createdTask = await staffTaskApi.createTask({
        title: newTask.title,
        description: newTask.description,
        task_type: newTask.task_type,
        priority: newTask.priority as 'low' | 'medium' | 'high',
        assigned_to: parseInt(newTask.assigned_to),
        due_date: new Date(newTask.due_date).toISOString()
      });
      
      setIsDialogOpen(false);
      setNewTask({ title: '', description: '', task_type: 'general', priority: 'medium', assigned_to: '', assigned_to_name: '', due_date: '' });
      
      // Optimistic UI update instead of fetching all tasks again
      if (createdTask.assigned_to === currentUserId) {
        setMyTasks(prev => [createdTask, ...prev].sort(sortTasks));
      } else {
        setAssignedTasks(prev => [createdTask, ...prev].sort(sortTasks));
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Task Assigned!',
        text: 'The task has been successfully assigned.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Failed to create task' });
    }
  };

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    // Optimistic UI update
    const previousMyTasks = [...myTasks];
    const previousAssignedTasks = [...assignedTasks];
    
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t).sort(sortTasks));
    setAssignedTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t).sort(sortTasks));
    
    try {
      await staffTaskApi.updateTaskStatus(taskId, newStatus);
      
      if (newStatus === 'completed') {
        Swal.fire({
          icon: 'success',
          title: 'Task Completed!',
          text: 'Great job! The task is marked as complete.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      setMyTasks(previousMyTasks); // Revert on error
      setAssignedTasks(previousAssignedTasks);
      Swal.fire({ icon: 'error', title: 'Failed to update task' });
    }
  };

  const getBorderColor = (task: StaffTask) => {
    if (task.status === 'completed') return 'border-l-green-500';
    
    const now = new Date();
    const due = new Date(task.due_date);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'border-l-red-500'; // Overdue
    if (diffHours <= 24) return 'border-l-orange-500'; // Due within 24 hours
    if (diffHours <= 72) return 'border-l-yellow-400'; // Due within 3 days
    return 'border-l-blue-500'; // Normal
  };

  const getDueDateStatus = (task: StaffTask) => {
    if (task.status === 'completed') return { color: 'text-green-600', icon: CheckCircle2, text: 'Completed' };
    
    const now = new Date();
    const due = new Date(task.due_date);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return { color: 'text-red-500 font-bold', icon: AlertCircle, text: 'Overdue!' };
    if (diffHours <= 24) return { color: 'text-orange-500 font-bold', icon: Clock, text: 'Due Soon!' };
    if (diffHours <= 72) return { color: 'text-yellow-600 font-medium', icon: Clock, text: 'Approaching' };
    return { color: 'text-muted-foreground', icon: Clock, text: 'Upcoming' };
  };

  const TaskCard = ({ task, isReceived }: { task: StaffTask, isReceived: boolean }) => {
    const dueStatus = getDueDateStatus(task);

    return (
      <Card className={`mb-4 border-l-4 ${getBorderColor(task)} shadow-sm hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-lg">{task.title}</h4>
                {task.priority === 'high' && <Badge variant="destructive" className="text-[10px] h-5">High Priority</Badge>}
                {task.priority === 'medium' && <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[10px] h-5 border-orange-200">Medium Priority</Badge>}
                {task.priority === 'low' && <Badge variant="outline" className="text-[10px] h-5">Low Priority</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            </div>
            <Badge 
              variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'secondary' : 'outline'} 
              className={cn(
                "capitalize",
                task.status === 'completed' && "bg-green-600 hover:bg-green-700",
                task.status === 'in_progress' && "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
                task.status === 'pending' && "bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {isReceived ? `Assigned by: ${task.assigned_by_name}` : `Assigned to: ${task.assigned_to_name}`}
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px] px-1 py-0 uppercase">{task.task_type}</Badge>
            </div>
            <div className={`flex items-center gap-1 ${dueStatus.color}`}>
              <dueStatus.icon className="w-3 h-3" />
              {dueStatus.text}: {new Date(task.due_date).toLocaleString()}
            </div>
          </div>

          {isReceived && task.status !== 'completed' && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              {task.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(task.id, 'in_progress')}>
                  Start Task
                </Button>
              )}
              <Button size="sm" onClick={() => handleUpdateStatus(task.id, 'completed')} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Completed
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task Tracker</h2>
          <p className="text-muted-foreground">Manage and track internal faculty and academic tasks.</p>
        </div>
        
        {(role === 'principal' || role === 'hod') && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setSearchTerm("");
              setAppliedSearch("");
              setSubPage(1);
              setSelectedBranch("");
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Assign New Task</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Assign Task</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input id="title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                </div>
                
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(val) => setNewTask({...newTask, priority: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {role === 'principal' && (
                  <div className="grid gap-2">
                    <Label>Select Branch First</Label>
                    <Select value={selectedBranch} onValueChange={(val) => {
                      setSelectedBranch(val);
                      setSubPage(1);
                      setNewTask({...newTask, assigned_to: '', assigned_to_name: ''});
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <CustomSelectContent
                        header={
                          <div className="p-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search branches..."
                                className="pl-8 h-9"
                                value={branchSearchTerm}
                                onChange={(e) => setBranchSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        }
                      >
                        {branches
                          .filter(b => b.name.toLowerCase().includes(branchSearchTerm.toLowerCase()))
                          .map(b => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                          ))}
                      </CustomSelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Assign To</Label>
                  <Select 
                    value={newTask.assigned_to} 
                    onValueChange={(val) => {
                      const staff = subordinates.find(s => s.id.toString() === val);
                      if (staff) {
                        setNewTask({...newTask, assigned_to: val, assigned_to_name: staff.name});
                      }
                    }}
                    disabled={role === 'principal' && !selectedBranch && !appliedSearch}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        role === 'principal' && !selectedBranch && !appliedSearch
                          ? "Select a branch first..."
                          : "Choose staff member..."
                      }>
                        {newTask.assigned_to_name ? newTask.assigned_to_name : "Choose staff member..."}
                      </SelectValue>
                    </SelectTrigger>
                    
                    <CustomSelectContent
                      header={
                        <div className="p-2 space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search staff..."
                              className="pl-8 h-9"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between px-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSubPage(prev => Math.max(1, prev - 1));
                              }}
                              disabled={subPage <= 1 || subLoading}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              PAGE {subPage} OF {subTotalPages || 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSubPage(prev => Math.min(subTotalPages, prev + 1));
                              }}
                              disabled={subPage >= subTotalPages || subLoading}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      {subLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                      ) : subordinates.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No staff found.</div>
                      ) : (
                        subordinates.map(sub => (
                          <SelectItem key={sub.id} value={sub.id.toString()}>
                            {sub.name} <span className="text-xs text-muted-foreground ml-2 capitalize">({sub.role})</span>
                          </SelectItem>
                        ))
                      )}
                    </CustomSelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="due">Due Date & Time</Label>
                  <Input id="due" type="datetime-local" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
                </div>
              </div>
              <Button onClick={handleCreateTask} className="w-full">Create Task</Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Received Tasks */}
        {role !== 'principal' && (
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-primary rotate-90" />
                Tasks Assigned to Me
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-muted/10 min-h-[400px] flex flex-col">
              {myTasksLoading ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md bg-background flex-1">Loading tasks...</div>
              ) : myTasks.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md bg-background flex-1">No tasks assigned to you.</div>
              ) : (
                <div className="flex flex-col flex-1">
                  <div className="space-y-4 flex-1">
                    {myTasks.map(task => <TaskCard key={task.id} task={task} isReceived={true} />)}
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/50">
                    <Button variant="outline" size="sm" onClick={() => setMyTasksPage(p => Math.max(1, p - 1))} disabled={myTasksPage === 1 || myTasksLoading}>Previous</Button>
                    <span className="text-sm text-muted-foreground font-medium">Page {myTasksPage} of {myTasksTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setMyTasksPage(p => Math.min(myTasksTotalPages, p + 1))} disabled={myTasksPage === myTasksTotalPages || myTasksLoading}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assigned Tasks */}
        {(role === 'principal' || role === 'hod') && (
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50 bg-primary/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-primary" />
                Tasks Assigned by Me
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-muted/10 min-h-[400px] flex flex-col">
              {assignedTasksLoading ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md bg-background flex-1">Loading tasks...</div>
              ) : assignedTasks.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md bg-background flex-1">You haven't assigned any tasks.</div>
              ) : (
                <div className="flex flex-col flex-1">
                  <div className="space-y-4 flex-1">
                    {assignedTasks.map(task => <TaskCard key={task.id} task={task} isReceived={false} />)}
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/50">
                    <Button variant="outline" size="sm" onClick={() => setAssignedTasksPage(p => Math.max(1, p - 1))} disabled={assignedTasksPage === 1 || assignedTasksLoading}>Previous</Button>
                    <span className="text-sm text-muted-foreground font-medium">Page {assignedTasksPage} of {assignedTasksTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setAssignedTasksPage(p => Math.min(assignedTasksTotalPages, p + 1))} disabled={assignedTasksPage === assignedTasksTotalPages || assignedTasksLoading}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StaffTaskTracker;
