import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { API_ENDPOINT } from '../../utils/config';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/sweetalert';
import { Video, Calendar, Clock, Users, Trash2, Plus, ExternalLink, CalendarDays, Copy } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SkeletonCard } from '../ui/skeleton';
import { useAuth } from '../../context/AuthContext';

import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as ShadcnCalendar } from '../ui/calendar';
import { cn } from "@/lib/utils";
import { format } from "date-fns";


const AVAILABLE_ROLES = [
  { id: 'org_admin', label: 'Org Admin' },
  { id: 'principal', label: 'Principal' },
  { id: 'dean', label: 'Dean' },
  { id: 'hod', label: 'HOD' },
  { id: 'coe', label: 'COE' },
  { id: 'admission_manager', label: 'Admission Manager' },
  { id: 'teacher', label: 'Faculty / Teacher' },
  { id: 'library_admin', label: 'Library Admin' },
  { id: 'transport_admin', label: 'Transport Admin' },
  { id: 'fees_manager', label: 'Fee Manager' },
  { id: 'hms_admin', label: 'HMS Admin' },
  { id: 'warden', label: 'Warden' },
];


const getInitialScheduleState = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const defaultDate = `${year}-${month}-${day}`;
  let currentHour = now.getHours();
  let currentMinute = now.getMinutes();
  const remainder = currentMinute % 5;
  if (remainder >= 3) currentMinute += (5 - remainder);
  else currentMinute -= remainder;
  if (currentMinute >= 60) {
    currentMinute = 0;
    currentHour = (currentHour + 1) % 24;
  }
  let startP = "AM";
  let startHNum = currentHour;
  if (currentHour >= 12) {
    startP = "PM";
    if (currentHour > 12) startHNum = currentHour - 12;
  } else if (currentHour === 0) startHNum = 12;
  const defaultStartHour = String(startHNum).padStart(2, "0");
  const defaultStartMinute = String(currentMinute).padStart(2, "0");
  const defaultStartPeriod = startP;
  let endHourRaw = (currentHour + 1) % 24;
  let endP = "AM";
  let endHNum = endHourRaw;
  if (endHourRaw >= 12) {
    endP = "PM";
    if (endHourRaw > 12) endHNum = endHourRaw - 12;
  } else if (endHourRaw === 0) endHNum = 12;
  const defaultEndHour = String(endHNum).padStart(2, "0");
  const defaultEndMinute = defaultStartMinute;
  const defaultEndPeriod = endP;
  return {
    date: defaultDate,
    startHour: defaultStartHour,
    startMinute: defaultStartMinute,
    startPeriod: defaultStartPeriod,
    endHour: defaultEndHour,
    endMinute: defaultEndMinute,
    endPeriod: defaultEndPeriod
  };
};

export default function ScheduleMeeting() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { user, role: userRole } = useAuth();
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [pastMeetings, setPastMeetings] = useState<any[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [pastTotal, setPastTotal] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const isInitialMount = useRef(true);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const initVals = getInitialScheduleState();
  const [date, setDate] = useState(initVals.date);
  const [startHour, setStartHour] = useState(initVals.startHour);
  const [startMinute, setStartMinute] = useState(initVals.startMinute);
  const [startPeriod, setStartPeriod] = useState(initVals.startPeriod);
  const [endHour, setEndHour] = useState(initVals.endHour);
  const [endMinute, setEndMinute] = useState(initVals.endMinute);
  const [endPeriod, setEndPeriod] = useState(initVals.endPeriod);

  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_roles: [] as string[]
  });

  const fetchUpcoming = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/?type=upcoming&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingMeetings(data.results || (Array.isArray(data) ? data : []));
        setUpcomingTotal(data.count ?? (Array.isArray(data) ? data.length : 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPast = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/?type=past&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setPastMeetings(data.results || (Array.isArray(data) ? data : []));
        setPastTotal(data.count ?? (Array.isArray(data) ? data.length : 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Single call that returns both upcoming + past counts for tab badges
  const fetchCounts = async () => {
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/counts/`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingTotal(data.upcoming ?? 0);
        setPastTotal(data.past ?? 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMeetings = () => {
    fetchUpcoming(upcomingPage);
    fetchPast(pastPage);
  };

  const fetchBranches = async () => {
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/branches/`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (e) {
      console.error("Failed to load branches:", e);
    }
  };

  // On mount: one combined counts call (both badges) + upcoming content (default tab)
  useEffect(() => {
    fetchCounts();
    fetchUpcoming(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On tab click or page change: fetch the active tab's full details
  // Skipped on initial mount (handled by the mount-only effect above)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (activeTab === 'upcoming') fetchUpcoming(upcomingPage);
    else fetchPast(pastPage);
  }, [upcomingPage, pastPage, activeTab]);

  useEffect(() => {
    if (branches.length > 0 && userRole === 'hod') {
      const hodBranchName = (user as any)?.branch;
      if (hodBranchName) {
        const matched = branches.find(b => b.name.toLowerCase() === hodBranchName.toLowerCase());
        if (matched) {
          setSelectedBranch(matched.id);
        }
      }
    }
  }, [branches, userRole, user]);

  useEffect(() => {
    if (showDialog) {
      const freshVals = getInitialScheduleState();
      setDate(freshVals.date);
      setStartHour(freshVals.startHour);
      setStartMinute(freshVals.startMinute);
      setStartPeriod(freshVals.startPeriod);
      setEndHour(freshVals.endHour);
      setEndMinute(freshVals.endMinute);
      setEndPeriod(freshVals.endPeriod);
      
      if (branches.length === 0) {
        fetchBranches();
      }
    }
  }, [showDialog, branches.length]);

  const getTargetRolesForUser = (role: string) => {
    switch (role) {
      case "principal":
      case "org_admin":
      case "admin":
      case "dean":
        return AVAILABLE_ROLES.filter(r => r.id !== 'warden').map(r => r.id);
      case "coe":
        return ["teacher", "hod", "principal", "dean"];
      case "fees_manager":
        return ["hod", "principal", "dean", "coe", "org_admin", "admin", "admission_manager"];
      case "hms":
      case "hms_admin":
      case "warden":
        return ["warden", "fees_manager", "hms_admin"];
      case "transport_admin":
        return []; // Staff meetings cannot target students (their only allowed announcement target)
      case "teacher":
        return ["hod", "teacher"]; // Faculty/teacher cannot target principal
      default:
        // HOD, etc.
        return ["hod", "teacher", "principal"];
    }
  };

  const allowedTargetRoles = getTargetRolesForUser(userRole || '');
  const filteredRoles = AVAILABLE_ROLES.filter(role => 
    allowedTargetRoles.includes(role.id) && role.id !== userRole
  );

  const isAllSelected = filteredRoles.length > 0 && filteredRoles.every(role => formData.target_roles.includes(role.id));

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => {
      const current = prev.target_roles;
      if (current.includes(roleId)) {
        return { ...prev, target_roles: current.filter(id => id !== roleId) };
      } else {
        return { ...prev, target_roles: [...current, roleId] };
      }
    });
  };

  const handleSelectAllToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      target_roles: checked ? filteredRoles.map(r => r.id) : []
    }));
  };

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreateMeeting = async () => {
    if (!formData.title || !date || formData.target_roles.length === 0) {
      setValidationError("Please fill out all required fields and select at least one role.");
      return;
    }
    if (validationError) setValidationError(null);

    const convertTo24Hour = (hour: string, min: string, period: string) => {
      let h = parseInt(hour, 10);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${min}`;
    };

    const startTime24 = convertTo24Hour(startHour, startMinute, startPeriod);
    const endTime24 = convertTo24Hour(endHour, endMinute, endPeriod);

    const startDateTime = new Date(`${date}T${startTime24}`);
    const endDateTime = new Date(`${date}T${endTime24}`);

    if (startDateTime >= endDateTime) {
      setValidationError("End time must be after start time.");
      return;
    }

    // Frontend overlap check against already-loaded meetings for instant feedback
    const myMeetings = [...upcomingMeetings, ...pastMeetings].filter((m: any) => {
      const mStart = new Date(m.start_time);
      const mEnd = new Date(m.end_time);
      return mStart < endDateTime && mEnd > startDateTime;
    });
    if (myMeetings.length > 0) {
      const conflict = myMeetings[0];
      const cStart = new Date(conflict.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const cEnd = new Date(conflict.end_time).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
      setValidationError(`You already have "${conflict.title}" scheduled from ${cStart} to ${cEnd}. Please choose a different time.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        target_roles: formData.target_roles,
        branch: selectedBranch && selectedBranch !== 'all-branches' ? selectedBranch : null
      };

      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSuccessAlert("Success", "Meeting created successfully. Google Meet link generated.");
        setShowDialog(false);
        
        setFormData({ title: '', description: '', target_roles: [] });
        setSelectedBranch('');
        const freshVals = getInitialScheduleState();
        setDate(freshVals.date);
        setStartHour(freshVals.startHour);
        setStartMinute(freshVals.startMinute);
        setStartPeriod(freshVals.startPeriod);
        setEndHour(freshVals.endHour);
        setEndMinute(freshVals.endMinute);
        setEndPeriod(freshVals.endPeriod);

        fetchUpcoming(1);
        setUpcomingPage(1);
      } else {
        const statusCode = res.status;
        let errorMsg = "Failed to create meeting.";
        try {
          const data = await res.json();
          errorMsg = data.error || (data.google_meet_link && data.google_meet_link[0]) || errorMsg;
        } catch (jsonErr) {
          console.error("Failed to parse error response JSON:", jsonErr);
        }
        
        console.error(`Meeting creation failed with status ${statusCode}: ${errorMsg}`);
        
        if (errorMsg.toLowerCase().includes("google") || errorMsg.toLowerCase().includes("connect") || errorMsg.toLowerCase().includes("linked")) {
          const getProfileLabel = (role: string) => {
            switch (role) {
              case 'dean':
                return 'Dean Profile';
              case 'coe':
                return 'COE Profile';
              case 'hod':
                return 'HOD Profile';
              case 'teacher':
                return 'Faculty Profile';
              case 'principal':
                return 'Principal Profile';
              case 'org_admin':
                return 'Org Admin Profile';
              case 'hms':
              case 'hms_admin':
                return 'HMS Admin Profile';
              case 'fees_manager':
                return 'Fee Manager Profile';
              case 'admission_manager':
                return 'Admission Manager Profile';
              default:
                return 'Profile';
            }
          };

          showErrorAlert("Action Required", `Please connect your Google account in your ${getProfileLabel(userRole || '')} -> Integrations tab first. Redirecting...`);
          
          const getProfilePath = (role: string) => {
            switch (role) {
              case 'dean':
                return '/dean/profile';
              case 'coe':
                return '/coe/profile';
              case 'hod':
                return '/hod/hod-profile';
              case 'teacher':
                return '/faculty/faculty-profile';
              case 'principal':
                return '/principal/profile';
              case 'org_admin':
                return '/org-admin/profile';
              case 'hms':
              case 'hms_admin':
                return '/hms/profile';
              case 'fees_manager':
                return '/fees-manager/profile';
              case 'admission_manager':
                return '/admission-manager/profile';
              default:
                return '/profile';
            }
          };

          setTimeout(() => {
             navigate(`${getProfilePath(userRole || '')}?google_connected=false`);
          }, 1500);
        } else {
          showErrorAlert("Error", `${errorMsg} (Status: ${statusCode})`);
        }
      }
    } catch (e: any) {
      console.error("Network error inside handleCreateMeeting:", e);
      showErrorAlert("Error", `Network error while creating meeting: ${e.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await showConfirmAlert("Delete Meeting", "Are you sure you want to delete this meeting?", "Delete");
    if (confirm.isConfirmed) {
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/${id}/`, { method: 'DELETE' });
        if (res.ok) {
          showSuccessAlert("Deleted", "Meeting has been deleted.");
          if (activeTab === 'upcoming') fetchUpcoming(upcomingPage);
          else fetchPast(pastPage);
        } else {
          showErrorAlert("Error", "Failed to delete meeting.");
        }
      } catch (e) {
        showErrorAlert("Error", "Network error.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <Card className="border-border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Meetings &amp; Schedules</CardTitle>
            <CardDescription className="text-[16px] sm:text-sm text-muted-foreground mt-1">
              Schedule and manage online meetings across staff roles.
            </CardDescription>
          </div>
          
          {!['warden', 'library_admin', 'transport_admin'].includes(userRole || '') && (
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-sm h-9 font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Meeting
                </Button>
              </DialogTrigger>
              {showDialog && (
                <DialogContent className={`w-[90%] rounded-2xl max-h-[80vh] overflow-y-auto sm:max-w-[650px] custom-scrollbar duration-0 animate-none ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
                  <DialogHeader>
                    <DialogTitle>Create New Meeting</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Meeting Title <span className="text-destructive">*</span></Label>
                      <Input 
                        id="title" 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        placeholder="e.g. Urgent Faculty Sync"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        placeholder="Meeting agenda..."
                        className="resize-none h-24 overflow-y-auto custom-scrollbar"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Date <span className="text-destructive">*</span>
                        </label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10 px-3 relative pl-10",
                                !date && "text-muted-foreground",
                                theme === 'dark' ?
                                  'bg-background border-border text-foreground hover:bg-muted/50' :
                                  'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                              )}
                            >
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                              <span className="truncate text-xs">
                                {date ? format(new Date(date), "dd-MM-yyyy") : "dd-mm-yyyy"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-xl shadow-xl" align="start">
                            <ShadcnCalendar
                               mode="single"
                               selected={date ? new Date(date) : undefined}
                               onSelect={(d) => {
                                 setDate(d ? format(d, "yyyy-MM-dd") : "");
                                 setIsCalendarOpen(false);
                               }}
                               disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                               initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {['dean', 'coe', 'principal', 'org_admin', 'admission_manager'].includes(userRole || '') && (
                      <div className="grid gap-2">
                        <Label htmlFor="branch">Branch (Optional)</Label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                          <SelectTrigger id="branch" className="w-full h-10 px-3 text-xs">
                            <SelectValue placeholder="All Branches" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            <SelectItem value="all-branches">All Branches</SelectItem>
                            {branches.map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Start Time <span className="text-destructive">*</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <Select value={startHour} onValueChange={setStartHour}>
                            <SelectTrigger className="w-full h-10 px-2 text-xs">
                              <SelectValue placeholder="Hr" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="font-semibold text-xs">:</span>
                          <Select value={startMinute} onValueChange={setStartMinute}>
                            <SelectTrigger className="w-full h-10 px-2 text-xs">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={startPeriod} onValueChange={setStartPeriod}>
                            <SelectTrigger className="w-full h-10 px-2 text-xs">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> End Time <span className="text-destructive">*</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <Select value={endHour} onValueChange={setEndHour}>
                            <SelectTrigger className="w-full h-10 px-2 text-xs">
                              <SelectValue placeholder="Hr" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="font-semibold text-xs">:</span>
                          <Select value={endMinute} onValueChange={setEndMinute}>
                            <SelectTrigger className="w-full h-10 px-2 text-xs">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={endPeriod} onValueChange={setEndPeriod}>
                            <SelectTrigger className="w-full h-10 px-2 text-xs">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-1.5 cursor-pointer select-none">
                          <span>Target Roles</span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'} font-normal mt-0.5 sm:mt-0`}>
                            (Select at least one) <span className="text-destructive">*</span>
                          </span>
                        </Label>
                        <div 
                          className="flex items-center space-x-2 cursor-pointer select-none shrink-0"
                          onClick={() => handleSelectAllToggle(!isAllSelected)}
                        >
                          <Checkbox 
                            id="select-all-roles"
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAllToggle}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label 
                            htmlFor="select-all-roles"
                            className="text-xs font-semibold leading-none cursor-pointer text-primary whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Select All
                          </label>
                        </div>
                      </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto p-1 custom-scrollbar">
                        {filteredRoles.map(role => (
                          <div 
                            key={role.id} 
                            className={`flex items-center space-x-3 cursor-pointer select-none p-3 border rounded-xl transition-all hover:bg-muted/30 ${
                              formData.target_roles.includes(role.id)
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : theme === 'dark' ? 'border-border bg-card/40' : 'border-gray-200 bg-white'
                            }`}
                            onClick={() => handleRoleToggle(role.id)}
                          >
                            <Checkbox 
                              id={`role-${role.id}`}
                              checked={formData.target_roles.includes(role.id)}
                              onCheckedChange={() => handleRoleToggle(role.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <label 
                              htmlFor={`role-${role.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {role.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {validationError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                      <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                      <span>{validationError}</span>
                    </div>
                  )}
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateMeeting} disabled={submitting}>
                      {submitting ? "Creating..." : "Create & Generate Meet"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              )}
            </Dialog>
          )}
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="grid gap-4">
              <SkeletonCard className="h-32 w-full" />
              <SkeletonCard className="h-32 w-full" />
            </div>
          ) : (() => {
            const now = new Date();
            const displayMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;
            const currentTotal = activeTab === 'upcoming' ? upcomingTotal : pastTotal;
            const currentPage = activeTab === 'upcoming' ? upcomingPage : pastPage;
            const totalPages = Math.ceil(currentTotal / 10);

            return (
              <>
                {/* Segmented Tab Switcher */}
                <div className="flex justify-center mb-6">
                  <div className={`p-1 rounded-xl flex gap-1 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
                    <button
                      onClick={() => setActiveTab('upcoming')}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                        activeTab === 'upcoming'
                          ? (theme === 'dark' ? 'bg-primary text-white shadow-lg' : 'bg-white text-slate-900 shadow-sm')
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Upcoming ({upcomingTotal})
                    </button>
                    <button
                      onClick={() => setActiveTab('past')}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                        activeTab === 'past'
                          ? (theme === 'dark' ? 'bg-primary text-white shadow-lg' : 'bg-white text-slate-900 shadow-sm')
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      History ({pastTotal})
                    </button>
                  </div>
                </div>

                {displayMeetings.length === 0 ? (
                  <div className={`p-8 text-center rounded-xl border-2 border-dashed ${theme === 'dark' ? 'bg-card/30 text-muted-foreground border-border' : 'bg-gray-50/50 text-gray-500 border-gray-300'} flex flex-col items-center justify-center`}>
                    <Video className="mx-auto h-12 w-12 opacity-30 mb-3 text-primary animate-pulse" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {activeTab === 'upcoming' ? 'No Upcoming Meetings' : 'No Past Meetings'}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeTab === 'upcoming' 
                        ? 'There are currently no meetings scheduled for you.' 
                        : 'No meeting history found.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pb-2">
                    {displayMeetings.map((meeting) => {
                      const start = new Date(meeting.start_time);
                      const end = new Date(meeting.end_time);
                      const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                      const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                      const isPast = end < now;
                    
                      return (
                        <div
                          key={meeting.id}
                          className={`rounded-lg border p-4 flex flex-col gap-2 transition-all hover:shadow-md h-full ${isPast ? 'opacity-70' : ''} ${theme === "dark"
                            ? "bg-card border-border text-foreground"
                            : "bg-white border-gray-200 text-gray-900"
                            }`}
                        >
                           <div className="flex flex-row flex-wrap items-start justify-between gap-2 min-w-0">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 mt-0.5">
                                <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm break-words">{meeting.title}</p>
                                {meeting.description && (
                                  <p className="text-xs text-muted-foreground break-words mt-1">{meeting.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 self-start">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isPast ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'}`}>
                                {isPast ? 'Completed' : 'Upcoming'}
                              </span>
                              {(() => {
                                const isOrganizer = userRole && meeting.organizer_role && String(userRole).toLowerCase() === String(meeting.organizer_role).toLowerCase();
                                
                                if (!isOrganizer || isPast) return null;
                                return (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 rounded-md border-red-200/20 hover:bg-red-50 text-red-500 flex items-center justify-center p-0 shrink-0"
                                    title="Delete Meeting"
                                    onClick={() => handleDelete(meeting.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 text-xs text-muted-foreground border-b pb-2.5 pl-10 sm:pl-0">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" /> {dateStr}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-primary flex-shrink-0" /> {timeStr}
                              </span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <Users className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="capitalize leading-normal">{Array.isArray(meeting.target_roles) ? meeting.target_roles.map((r: string) => r.replace('_', ' ')).join(', ') : ''}</span>
                            </div>
                            <div className="text-xs font-medium">
                              Organizer: {meeting.organizer_name}
                            </div>
                          </div>

                          {meeting.google_meet_link && !isPast && (
                            <div className="flex flex-row items-center justify-between gap-3 pt-2 pl-10 sm:pl-0 min-w-0 mt-auto">
                              <a
                                href={meeting.google_meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-mono truncate flex-1 min-w-0"
                              >
                                <span className="truncate">{meeting.google_meet_link}</span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-8 h-8 rounded-md border-gray-200 dark:border-border text-muted-foreground hover:text-foreground"
                                  title="Copy Link"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(meeting.google_meet_link);
                                    showSuccessAlert("Copied", "Google Meet link copied to clipboard.");
                                  }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border mt-6">
                    <div>
                      Showing {Math.min((currentPage - 1) * 10 + 1, currentTotal)} to {Math.min(currentPage * 10, currentTotal)} of {currentTotal} meetings
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1 || loading}
                        onClick={() => activeTab === 'upcoming' ? setUpcomingPage(p => p - 1) : setPastPage(p => p - 1)}
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
                        disabled={currentPage === totalPages || loading}
                        onClick={() => activeTab === 'upcoming' ? setUpcomingPage(p => p + 1) : setPastPage(p => p + 1)}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
