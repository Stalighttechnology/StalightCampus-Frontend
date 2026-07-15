import React, { useState, useEffect, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle2, Plus, ArrowRight, User, ChevronLeft, ChevronRight, Search, ClipboardX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { staffTaskApi, StaffTask } from '../../api/staff_task_api';
import Swal from 'sweetalert2';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
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
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { header?: React.ReactNode; }>(
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
  const [myTasksCount, setMyTasksCount] = useState(0);

  const [assignedTasks, setAssignedTasks] = useState<StaffTask[]>([]);
  const [assignedTasksLoading, setAssignedTasksLoading] = useState(true);
  const [assignedTasksPage, setAssignedTasksPage] = useState(1);
  const [assignedTasksTotalPages, setAssignedTasksTotalPages] = useState(1);
  const [assignedTasksCount, setAssignedTasksCount] = useState(0);
  const [activeTaskTab, setActiveTaskTab] = useState<'assigned_to_me' | 'assigned_by_me'>('assigned_to_me');

  useEffect(() => {
    if (role === 'org_admin') {
      setActiveTaskTab('assigned_by_me');
    }
  }, [role]);

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

  const getCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const period = hours >= 12 ? "PM" : "AM";
    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours -= 12;
    }
    return {
      hour: String(hours).padStart(2, '0'),
      minute: String(now.getMinutes()).padStart(2, '0'),
      period
    };
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState<string>(() => getCurrentTime().hour);
  const [selectedMinute, setSelectedMinute] = useState<string>(() => getCurrentTime().minute);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => getCurrentTime().period);

  useEffect(() => {
    if (selectedDate) {
      let hourNum = parseInt(selectedHour, 10);
      if (selectedPeriod === "PM" && hourNum < 12) {
        hourNum += 12;
      } else if (selectedPeriod === "AM" && hourNum === 12) {
        hourNum = 0;
      }

      const combinedDate = new Date(selectedDate);
      combinedDate.setHours(hourNum);
      combinedDate.setMinutes(parseInt(selectedMinute, 10));

      const year = combinedDate.getFullYear();
      const month = String(combinedDate.getMonth() + 1).padStart(2, '0');
      const day = String(combinedDate.getDate()).padStart(2, '0');
      const hh = String(combinedDate.getHours()).padStart(2, '0');
      const mm = String(combinedDate.getMinutes()).padStart(2, '0');
      setNewTask(prev => ({ ...prev, due_date: `${year}-${month}-${day}T${hh}:${mm}` }));
    } else {
      setNewTask(prev => ({ ...prev, due_date: '' }));
    }
  }, [selectedDate, selectedHour, selectedMinute, selectedPeriod]);

  // Subordinates and Pagination State
  const [subordinates, setSubordinates] = useState<{ id: number, name: string, role: string }[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subPage, setSubPage] = useState(1);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const [branches, setBranches] = useState<{ id: number, name: string }[]>([]);
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
      setMyTasksCount(data.count || 0);
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
      setAssignedTasksCount(data.count || 0);
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
      // Only principal needs branch selection UI
      if (role === 'principal' && branches.length === 0) {
        fetchBranches();
      }

      const canAssign = ['org_admin', 'superadmin', 'dean', 'principal', 'hod'].includes(role || '');
      if (canAssign) {
        // Principal must select branch first (unless global search), others can fetch directly
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
      setSelectedDate(undefined);
      const currentTime = getCurrentTime();
      setSelectedHour(currentTime.hour);
      setSelectedMinute(currentTime.minute);
      setSelectedPeriod(currentTime.period);

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
    if (newStatus === 'in_progress') {
      const result = await Swal.fire({
        title: 'Start Task?',
        text: 'Are you ready to start working on this task?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, start it!',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3b82f6',
      });
      if (!result.isConfirmed) return;
    } else if (newStatus === 'completed') {
      const result = await Swal.fire({
        title: 'Mark as Completed?',
        text: 'Are you sure you want to mark this task as completed?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, complete it!',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#10b981',
      });
      if (!result.isConfirmed) return;
    }

    // Optimistic UI update
    const previousMyTasks = [...myTasks];
    const previousAssignedTasks = [...assignedTasks];

    const newCompletedAt = newStatus === 'completed' ? new Date().toISOString() : undefined;
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, completed_at: newCompletedAt } : t).sort(sortTasks));
    setAssignedTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, completed_at: newCompletedAt } : t).sort(sortTasks));

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
    return '';
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

    const borderClass = getBorderColor(task);

    return (
      <Card className={`mb-4 ${borderClass ? `border-l-4 ${borderClass}` : ''} shadow-sm hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-base sm:text-lg text-foreground leading-snug break-words flex-1">
                {task.title}
              </h4>
              <Badge
                variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'secondary' : 'outline'}
                className={cn(
                  "capitalize shrink-0 text-[10px] px-2 py-0.5",
                  task.status === 'completed' && "bg-green-600 hover:bg-green-700",
                  task.status === 'in_progress' && "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
                  task.status === 'pending' && "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {task.priority === 'high' && <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900 text-[10px] h-5 border whitespace-nowrap">High Priority</Badge>}
              {task.priority === 'medium' && <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900 text-[10px] h-5 border whitespace-nowrap">Medium Priority</Badge>}
              {task.priority === 'low' && <Badge variant="secondary" className="bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-[10px] h-5 border whitespace-nowrap">Low Priority</Badge>}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase tracking-wider whitespace-nowrap">{task.task_type}</Badge>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed break-words">{task.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] sm:text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-muted-foreground/75 shrink-0" />
              <span className="truncate">{isReceived ? `Assigned by: ${task.assigned_by_name}` : `Assigned to: ${task.assigned_to_name}`}</span>
            </div>
            <div className={cn("flex items-center gap-1.5 min-w-0", dueStatus.color)}>
              <dueStatus.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{dueStatus.text}: {new Date(task.status === 'completed' && task.completed_at ? task.completed_at : task.due_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          </div>

          {isReceived && task.status !== 'completed' && (
            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-border">
              {task.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(task.id, 'in_progress')} className="w-full sm:w-auto">
                  Start Task
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus(task.id, 'completed')}
                className="w-full sm:w-auto border-green-500 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 dark:border-green-500 dark:text-green-400 dark:bg-green-500/10 dark:hover:bg-green-500/20 dark:hover:text-green-300"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Completed
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg sm:text-2xl font-semibold tracking-tight">Task Tracker</CardTitle>
            <p className="text-muted-foreground text-sm">Manage and track internal faculty and academic tasks.</p>
          </div>

          {['org_admin', 'superadmin', 'dean', 'principal', 'hod'].includes(role || '') && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setSearchTerm("");
                setAppliedSearch("");
                setSubPage(1);
                setSelectedBranch("");
                setSelectedDate(undefined);
                const currentTime = getCurrentTime();
                setSelectedHour(currentTime.hour);
                setSelectedMinute(currentTime.minute);
                setSelectedPeriod(currentTime.period);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Assign New Task</Button>
              </DialogTrigger>
              <DialogContent
                className="w-[90vw] sm:w-full sm:max-w-[450px] h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl"
                onInteractOutside={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Assign Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Task Title <span className="text-destructive">*</span></Label>
                    <Input id="title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea id="desc" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="resize-none h-[100px] overflow-y-auto custom-scrollbar" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Priority <span className="text-destructive">*</span></Label>
                    <Select value={newTask.priority} onValueChange={(val) => setNewTask({ ...newTask, priority: val })}>
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

                  {/* Branch selector only for principal */}
                  {role === 'principal' && (
                    <div className="grid gap-2">
                      <Label>Select Branch First <span className="text-destructive">*</span></Label>
                      <Select value={selectedBranch} onValueChange={(val) => {
                        setSelectedBranch(val);
                        setSubPage(1);
                        setNewTask({ ...newTask, assigned_to: '', assigned_to_name: '' });
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
                    <Label>Assign To <span className="text-destructive">*</span></Label>
                    <Select
                      value={newTask.assigned_to}
                      onValueChange={(val) => {
                        const staff = subordinates.find(s => s.id.toString() === val);
                        if (staff) {
                          setNewTask({ ...newTask, assigned_to: val, assigned_to_name: staff.name });
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
                    <Label>Due Date & Time <span className="text-destructive">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-input bg-background hover:bg-accent hover:text-accent-foreground",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate && newTask.due_date ? (
                            format(new Date(newTask.due_date), "PPP p")
                          ) : (
                            <span>Pick due date & time</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 flex flex-col space-y-2 bg-popover text-popover-foreground border shadow-md" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                        <div className="p-3 border-t border-border flex flex-col gap-2 bg-popover">
                          <Label className="text-xs font-semibold text-foreground">Time</Label>
                          <div className="flex items-center gap-1.5 justify-center">
                            {/* Hour Select */}
                            <Select value={selectedHour} onValueChange={setSelectedHour}>
                              <SelectTrigger className="w-[70px] h-8 text-xs bg-background text-foreground border-input">
                                <SelectValue placeholder="12" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48 overflow-y-auto bg-popover text-popover-foreground border shadow-md">
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                                  <SelectItem key={h} value={h} className="text-xs">
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <span className="text-muted-foreground text-xs font-semibold">:</span>

                            {/* Minute Select */}
                            <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                              <SelectTrigger className="w-[70px] h-8 text-xs bg-background text-foreground border-input">
                                <SelectValue placeholder="00" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48 overflow-y-auto bg-popover text-popover-foreground border shadow-md">
                                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                                  <SelectItem key={m} value={m} className="text-xs">
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* AM/PM Select */}
                            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                              <SelectTrigger className="w-[70px] h-8 text-xs bg-background text-foreground border-input">
                                <SelectValue placeholder="PM" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover text-popover-foreground border shadow-md">
                                <SelectItem value="AM" className="text-xs">AM</SelectItem>
                                <SelectItem value="PM" className="text-xs">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button onClick={handleCreateTask} className="w-full">Create Task</Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">

        {/* Tab Navigation if user can assign tasks */}
        {['org_admin', 'superadmin', 'dean', 'principal', 'hod'].includes(role || '') && role !== 'org_admin' && (
          <div className="flex space-x-1 p-1 rounded-lg bg-muted border border-border overflow-x-auto mb-6 w-full">
            <button
              onClick={() => setActiveTaskTab('assigned_to_me')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTaskTab === 'assigned_to_me'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setActiveTaskTab('assigned_by_me')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTaskTab === 'assigned_by_me'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Assigned Tasks
            </button>
          </div>
        )}

        <div className="w-full">
          {/* Received Tasks */}
          {role !== 'org_admin' && (!['superadmin', 'dean', 'principal', 'hod'].includes(role || '') || activeTaskTab === 'assigned_to_me') && (
            <Card className="shadow-sm border-border w-full">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-primary rotate-90" />
                  My Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-muted/10 min-h-[400px] flex flex-col">
                {myTasksLoading ? (
                  <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md bg-background flex-1">Loading tasks...</div>
                ) : myTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-background/50 text-center flex-1 space-y-3">
                    <div className="p-4 rounded-full bg-muted">
                      <ClipboardX className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="max-w-sm">
                      <p className="text-base font-semibold text-foreground">No Tasks Found</p>
                      <p className="text-sm text-muted-foreground mt-1">No tasks assigned to you at the moment.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    {myTasks.map(task => <TaskCard key={task.id} task={task} isReceived={true} />)}
                  </div>
                )}
              </CardContent>
              {myTasksTotalPages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                  <div>
                    Showing {(myTasksPage - 1) * 10 + 1} to {Math.min(myTasksPage * 10, myTasksCount)} of {myTasksCount} tasks
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMyTasksPage(p => Math.max(1, p - 1))}
                      disabled={myTasksPage === 1 || myTasksLoading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className="text-sm font-semibold text-gray-900 dark:text-foreground">
                        {myTasksPage}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMyTasksPage(p => Math.min(myTasksTotalPages, p + 1))}
                      disabled={myTasksPage === myTasksTotalPages || myTasksLoading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          )}

          {/* Assigned Tasks */}
          {['org_admin', 'superadmin', 'dean', 'principal', 'hod'].includes(role || '') && (role === 'org_admin' || activeTaskTab === 'assigned_by_me') && (
            <Card className="shadow-sm border-border w-full">
              <CardHeader className="pb-3 border-b border-border/50 bg-primary/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-primary" />
                  Assigned Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-muted/10 min-h-[400px] flex flex-col">
                {assignedTasksLoading ? (
                  <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md bg-background flex-1">Loading tasks...</div>
                ) : assignedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-background/50 text-center flex-1 space-y-3">
                    <div className="p-4 rounded-full bg-muted">
                      <ClipboardX className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="max-w-sm">
                      <p className="text-base font-semibold text-foreground">No Tasks Assigned</p>
                      <p className="text-sm text-muted-foreground mt-1">You haven't assigned any tasks to staff yet.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    {assignedTasks.map(task => <TaskCard key={task.id} task={task} isReceived={false} />)}
                  </div>
                )}
              </CardContent>
              {assignedTasksTotalPages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                  <div>
                    Showing {(assignedTasksPage - 1) * 10 + 1} to {Math.min(assignedTasksPage * 10, assignedTasksCount)} of {assignedTasksCount} tasks
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignedTasksPage(p => Math.max(1, p - 1))}
                      disabled={assignedTasksPage === 1 || assignedTasksLoading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className="text-sm font-semibold text-gray-900 dark:text-foreground">
                        {assignedTasksPage}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignedTasksPage(p => Math.min(assignedTasksTotalPages, p + 1))}
                      disabled={assignedTasksPage === assignedTasksTotalPages || assignedTasksLoading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StaffTaskTracker;
