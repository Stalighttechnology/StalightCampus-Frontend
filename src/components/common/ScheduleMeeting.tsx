import React, { useState, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { API_ENDPOINT } from '../../utils/config';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/sweetalert';
import { Video, Calendar, Clock, Users, Trash2, Plus, ExternalLink, CalendarDays } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SkeletonCard } from '../ui/skeleton';

import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as ShadcnCalendar } from '../ui/calendar';
import { cn } from "@/lib/utils";
import { format } from "date-fns";


const AVAILABLE_ROLES = [
  { id: 'org_admin', label: 'Org Admin' },
  { id: 'principal', label: 'Principal' },
  { id: 'coe', label: 'COE' },
  { id: 'admission_manager', label: 'Admission Manager' },
  { id: 'placement_officer', label: 'Placement Officer' },
  { id: 'teacher', label: 'Faculty / Teacher' },
  { id: 'library_admin', label: 'Library Admin' },
  { id: 'transport_admin', label: 'Transport Admin' },
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
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const initVals = getInitialScheduleState();
  const [date, setDate] = useState(initVals.date);
  const [startHour, setStartHour] = useState(initVals.startHour);
  const [startMinute, setStartMinute] = useState(initVals.startMinute);
  const [startPeriod, setStartPeriod] = useState(initVals.startPeriod);
  const [endHour, setEndHour] = useState(initVals.endHour);
  const [endMinute, setEndMinute] = useState(initVals.endMinute);
  const [endPeriod, setEndPeriod] = useState(initVals.endPeriod);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_roles: [] as string[]
  });


  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      } else {
        showErrorAlert("Error", "Failed to load meetings.");
      }
    } catch (e) {
      showErrorAlert("Error", "Network error while loading meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

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

  const handleCreateMeeting = async () => {
    if (!formData.title || !date || formData.target_roles.length === 0) {
      showErrorAlert("Missing Fields", "Please fill out all required fields and select at least one role.");
      return;
    }

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
      showErrorAlert("Invalid Time", "End time must be after start time.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        target_roles: formData.target_roles
      };

      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/meetings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSuccessAlert("Success", "Meeting scheduled successfully. Google Meet link generated.");
        setShowDialog(false);
        
        setFormData({ title: '', description: '', target_roles: [] });
        const freshVals = getInitialScheduleState();
        setDate(freshVals.date);
        setStartHour(freshVals.startHour);
        setStartMinute(freshVals.startMinute);
        setStartPeriod(freshVals.startPeriod);
        setEndHour(freshVals.endHour);
        setEndMinute(freshVals.endMinute);
        setEndPeriod(freshVals.endPeriod);

        fetchMeetings();
      } else {
        const data = await res.json();
        const errorMsg = data.error || (data.google_meet_link && data.google_meet_link[0]) || "Failed to schedule meeting.";
        
        if (errorMsg.toLowerCase().includes("google") || errorMsg.toLowerCase().includes("connect") || errorMsg.toLowerCase().includes("linked")) {
          showErrorAlert("Action Required", "Please connect your Google account in your Profile -> Integrations tab first. Redirecting...");
          setTimeout(() => {
             // Redirect by replacing the current page slug with profile
             window.location.href = window.location.pathname.replace('schedule-meeting', 'profile') + "?google_connected=false";
          }, 1500);
        } else {
          showErrorAlert("Error", errorMsg);
        }
      }
    } catch (e) {
      showErrorAlert("Error", "Network error while creating meeting.");
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
          fetchMeetings();
        } else {
          showErrorAlert("Error", "Failed to delete meeting.");
        }
      } catch (e) {
        showErrorAlert("Error", "Network error.");
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Role-Based Meetings
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Schedule and manage online meetings across staff roles.
          </p>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild onClick={() => {
            const freshVals = getInitialScheduleState();
            setDate(freshVals.date);
            setStartHour(freshVals.startHour);
            setStartMinute(freshVals.startMinute);
            setStartPeriod(freshVals.startPeriod);
            setEndHour(freshVals.endHour);
            setEndMinute(freshVals.endMinute);
            setEndPeriod(freshVals.endPeriod);
          }}>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className={`sm:max-w-[500px] ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Meeting Title *</Label>
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
                  rows={2}
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
                <Label>Target Roles (Select at least one) *</Label>
                <div className={`grid grid-cols-2 gap-2 p-3 border rounded-md max-h-40 overflow-y-auto ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                  {AVAILABLE_ROLES.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`role-${role.id}`}
                        checked={formData.target_roles.includes(role.id)}
                        onCheckedChange={() => handleRoleToggle(role.id)}
                      />
                      <label 
                        htmlFor={`role-${role.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateMeeting} disabled={submitting}>
                {submitting ? "Scheduling..." : "Schedule & Generate Meet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4">
          <SkeletonCard className="h-32 w-full" />
          <SkeletonCard className="h-32 w-full" />
        </div>
      ) : meetings.length === 0 ? (
        <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-card text-muted-foreground' : 'bg-gray-50 text-gray-500'}`}>
          <Video className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <h3 className="text-lg font-medium text-foreground">No Upcoming Meetings</h3>
          <p className="mt-1">There are currently no meetings scheduled for you.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {(() => {
            const now = new Date();
            const upcoming = meetings.filter(m => new Date(m.end_time) >= now);
            const past = meetings.filter(m => new Date(m.end_time) < now)
              .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
              .slice(0, 5); // recent 5
            const displayMeetings = [...upcoming, ...past];

            return displayMeetings.map((meeting) => {
              const start = new Date(meeting.start_time);
              const end = new Date(meeting.end_time);
              const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
              const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              const isPast = end < now;
            
            return (
              <Card key={meeting.id} className={`flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md ${isPast ? 'opacity-70' : ''}`}>
                <div className={`h-2 ${isPast ? 'bg-gray-300' : 'bg-blue-500'}`} />
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1 text-foreground" title={meeting.title}>
                      {meeting.title}
                    </h3>
                    <div className="flex gap-2 ml-2 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(meeting.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {meeting.description && (
                    <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      {meeting.description}
                    </p>
                  )}

                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2 shrink-0" />
                      {dateStr}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2 shrink-0" />
                      {timeStr}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-2 shrink-0" />
                      <span className="line-clamp-1" title={meeting.target_roles.join(', ')}>
                        {meeting.target_roles.map((r: string) => r.replace('_', ' ')).join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground font-medium pt-1 border-t mt-3">
                      Organizer: {meeting.organizer_name}
                    </div>
                  </div>

                  <div className="mt-5 pt-2 flex justify-end">
                    {meeting.google_meet_link ? (
                      <Button 
                        onClick={() => window.open(meeting.google_meet_link, '_blank')}
                        className={`w-full font-medium ${isPast ? 'bg-gray-400 hover:bg-gray-500' : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'}`}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        {isPast ? 'Meeting Ended' : 'Join Google Meet'}
                        <ExternalLink className="w-3 h-3 ml-2 opacity-70" />
                      </Button>
                    ) : (
                      <div className="w-full text-center text-sm text-red-500 py-2 bg-red-50 rounded-md">
                        No Meeting Link Found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            });
          })()}
        </div>
      )}
    </div>
  );
}
