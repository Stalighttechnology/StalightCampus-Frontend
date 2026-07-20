import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock } from "lucide-react";

interface ExamWindowConfigProps {
  batchId: string;
  examPeriod: string;
  branchId?: string; // Optional, to apply to all branches if not provided
  semesterId: string;
}

const ExamWindowConfig: React.FC<ExamWindowConfigProps> = ({ batchId, examPeriod, branchId, semesterId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const getHour12 = (dateStr: string) => {
    if (!dateStr) return "12";
    const date = new Date(dateStr);
    let h = date.getHours() % 12;
    return String(h === 0 ? 12 : h).padStart(2, '0');
  };

  const getMinute = (dateStr: string) => {
    if (!dateStr) return "00";
    const date = new Date(dateStr);
    return String(date.getMinutes()).padStart(2, '0');
  };

  const getAmPm = (dateStr: string) => {
    if (!dateStr) return "AM";
    const date = new Date(dateStr);
    return date.getHours() >= 12 ? "PM" : "AM";
  };

  const updateLocalTime = (date: Date, setter: (val: string) => void) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setter(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const handleDateSelect = (date: Date | undefined, currentVal: string, setter: (val: string) => void) => {
    if (!date) return;
    const current = currentVal ? new Date(currentVal) : new Date();
    date.setHours(current.getHours());
    date.setMinutes(current.getMinutes());
    date.setSeconds(0);
    date.setMilliseconds(0);
    updateLocalTime(date, setter);
  };

  const handleHourChange = (hour12: string, currentVal: string, setter: (val: string) => void) => {
    const current = currentVal ? new Date(currentVal) : new Date();
    const h12 = parseInt(hour12, 10);
    const isPm = current.getHours() >= 12;
    let h24 = h12;
    if (isPm) {
      if (h12 < 12) h24 += 12;
    } else {
      if (h12 === 12) h24 = 0;
    }
    current.setHours(h24);
    updateLocalTime(current, setter);
  };

  const handleMinuteChange = (minute: string, currentVal: string, setter: (val: string) => void) => {
    const current = currentVal ? new Date(currentVal) : new Date();
    current.setMinutes(parseInt(minute, 10));
    updateLocalTime(current, setter);
  };

  const handleAmPmChange = (ampm: string, currentVal: string, setter: (val: string) => void) => {
    const current = currentVal ? new Date(currentVal) : new Date();
    let h24 = current.getHours();
    const isCurrentlyPm = h24 >= 12;
    if (ampm === "PM" && !isCurrentlyPm) {
      h24 += 12;
    } else if (ampm === "AM" && isCurrentlyPm) {
      h24 -= 12;
    }
    current.setHours(h24);
    updateLocalTime(current, setter);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Pick a date and time";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day}-${month}-${year} ${hoursStr}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    if (batchId && examPeriod && semesterId) {
      fetchWindowConfig();
    }
  }, [batchId, examPeriod, branchId, semesterId]);

  const fetchWindowConfig = async () => {
    try {
      setFetching(true);
      const params = new URLSearchParams({
        batch: batchId,
        exam_period: examPeriod,
        semester: semesterId,
      });
      if (branchId && branchId !== 'all') {
        params.append('branch', branchId);
      }
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-window/?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 404) {
          setStartDate('');
          setEndDate('');
        } else {
          console.error("Error fetching exam window", response.status);
        }
        return;
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        // format to datetime-local expected format (YYYY-MM-DDTHH:MM)
        const start = new Date(data.data.start_date);
        const end = new Date(data.data.end_date);
        
        // Convert to local ISO format: YYYY-MM-DDTHH:MM
        updateLocalTime(start, setStartDate);
        updateLocalTime(end, setEndDate);
      }
    } catch (error: any) {
      console.error("Error fetching exam window", error);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      toast.error("Please provide both start and end dates.");
      return;
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error("Start date must be before end date.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        batch: batchId,
        exam_period: examPeriod,
        semester: semesterId,
        branch: branchId === 'all' ? undefined : branchId,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
      };

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/coe/exam-window/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Exam application window configured successfully.");
        fetchWindowConfig();
      } else {
        toast.error(data.message || "Failed to configure exam window.");
      }
    } catch (error: any) {
      toast.error("Error configuring exam window");
    } finally {
      setLoading(false);
    }
  };

  if (!batchId || !examPeriod || !semesterId) {
    return null;
  }

  return (
    <Card className="mt-6 border-blue-200 bg-blue-50/50">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Exam Application Window Configuration</h3>
        <p className="text-sm text-blue-700 mb-4">
          Define the dates during which HODs and Faculty can submit student exam applications for this selection.
          {(!branchId || branchId === 'all') && " (Applying to ALL branches at once)"}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-blue-900 font-medium">Window Start Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={fetching}
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 border border-slate-200 dark:border-slate-800 bg-white text-zinc-900 shadow-sm",
                    !startDate && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                  {startDate ? formatDate(startDate) : "Pick a date and time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100] bg-white border border-slate-200 shadow-lg rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(date) => handleDateSelect(date, startDate, setStartDate)}
                  disabled={(date) => {
                    if (!endDate) return false;
                    const end = new Date(endDate);
                    end.setHours(0, 0, 0, 0);
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    return d > end;
                  }}
                  initialFocus
                />
                <div className="border-t border-slate-100 p-3 flex items-center justify-between gap-2 bg-slate-50">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400 mr-1" />
                    <span className="text-xs font-semibold text-slate-600">Time</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Hour Select */}
                    <Select 
                      value={getHour12(startDate)} 
                      onValueChange={(h) => handleHourChange(h, startDate, setStartDate)}
                    >
                      <SelectTrigger className="w-[56px] h-8 text-xs bg-white border-slate-200 text-slate-900">
                        <SelectValue placeholder="HH" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900 border-slate-200 max-h-[160px] overflow-y-auto z-[9999]">
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <span className="text-xs font-bold text-slate-500">:</span>
                    
                    {/* Minute Select */}
                    <Select 
                      value={getMinute(startDate)} 
                      onValueChange={(m) => handleMinuteChange(m, startDate, setStartDate)}
                    >
                      <SelectTrigger className="w-[56px] h-8 text-xs bg-white border-slate-200 text-slate-900">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900 border-slate-200 max-h-[160px] overflow-y-auto z-[9999]">
                        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* AM/PM Select */}
                    <Select 
                      value={getAmPm(startDate)} 
                      onValueChange={(p) => handleAmPmChange(p, startDate, setStartDate)}
                    >
                      <SelectTrigger className="w-[62px] h-8 text-xs bg-white border-slate-200 text-slate-900">
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900 border-slate-200 z-[9999]">
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label className="text-blue-900 font-medium">Window End Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={fetching}
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 border border-slate-200 dark:border-slate-800 bg-white text-zinc-900 shadow-sm",
                    !endDate && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                  {endDate ? formatDate(endDate) : "Pick a date and time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100] bg-white border border-slate-200 shadow-lg rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={endDate ? new Date(endDate) : undefined}
                  onSelect={(date) => handleDateSelect(date, endDate, setEndDate)}
                  disabled={(date) => {
                    if (!startDate) return false;
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    return d < start;
                  }}
                  initialFocus
                />
                <div className="border-t border-slate-100 p-3 flex items-center justify-between gap-2 bg-slate-50">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400 mr-1" />
                    <span className="text-xs font-semibold text-slate-600">Time</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Hour Select */}
                    <Select 
                      value={getHour12(endDate)} 
                      onValueChange={(h) => handleHourChange(h, endDate, setEndDate)}
                    >
                      <SelectTrigger className="w-[56px] h-8 text-xs bg-white border-slate-200 text-slate-900">
                        <SelectValue placeholder="HH" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900 border-slate-200 max-h-[160px] overflow-y-auto z-[9999]">
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <span className="text-xs font-bold text-slate-500">:</span>
                    
                    {/* Minute Select */}
                    <Select 
                      value={getMinute(endDate)} 
                      onValueChange={(m) => handleMinuteChange(m, endDate, setEndDate)}
                    >
                      <SelectTrigger className="w-[56px] h-8 text-xs bg-white border-slate-200 text-slate-900">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900 border-slate-200 max-h-[160px] overflow-y-auto z-[9999]">
                        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* AM/PM Select */}
                    <Select 
                      value={getAmPm(endDate)} 
                      onValueChange={(p) => handleAmPmChange(p, endDate, setEndDate)}
                    >
                      <SelectTrigger className="w-[62px] h-8 text-xs bg-white border-slate-200 text-slate-900">
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900 border-slate-200 z-[9999]">
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={loading || fetching} className="bg-primary hover:bg-primary/90 text-white">
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamWindowConfig;
